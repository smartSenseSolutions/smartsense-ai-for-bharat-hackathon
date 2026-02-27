import os

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import List, Optional
from google import genai
from app.core.config import settings
from app.services.documents import (
    generate_embedding,
    _get_opensearch_client,
    VENDOR_INDEX_NAME,
)


class GeminiVendor(BaseModel):
    vendor_name: str = Field(description="Name of the manufacturer")
    website: Optional[str] = Field(None, description="Their official website URL")
    description: Optional[str] = Field(
        None, description="2-sentence summary of what they do"
    )
    location: Optional[str] = Field(None, description="Their full city and state")
    products: Optional[List[str]] = Field(
        default_factory=list, description="List of core products"
    )
    contact_email: Optional[str] = Field(None, description="email or empty string")
    mobile: Optional[str] = Field(None, description="mobile number or empty string")
    estd: Optional[int] = Field(None, description="establishment year or null")


class GeminiVendorList(BaseModel):
    vendors: List[GeminiVendor] = Field(description="List of vendor results")


def get_gemini_client() -> genai.Client:
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Gemini API key not configured")
    return genai.Client(api_key=api_key)


async def search_external_vendors(query: str, num_results: int = 10):
    """
    Search for vendors using Exa AI search and OpenSearch local DB.
    """
    results = []

    # 1. Search local OpenSearch
    try:
        os_client = _get_opensearch_client()
        query_embedding = generate_embedding(query)

        search_body = {
            "size": num_results,
            "query": {
                "knn": {
                    "embedding": {
                        "vector": query_embedding,
                        "k": num_results,
                    }
                }
            },
            "_source": {"excludes": ["embedding"]},
        }

        os_response = os_client.search(index=VENDOR_INDEX_NAME, body=search_body)

        for hit in os_response["hits"]["hits"]:
            source = hit["_source"]

            # Format description nicely
            desc_parts = []
            if source.get("location"):
                desc_parts.append(f"Location: {source['location']}")
            if source.get("products"):
                desc_parts.append(f"Products: {', '.join(source['products'])}")
            if source.get("certificates"):
                desc_parts.append(
                    f"Certifications: {', '.join(source['certificates'])}"
                )

            results.append(
                {
                    "id": source.get("vendor_id", hit["_id"]),
                    "name": source.get("vendor_name", ""),
                    "url": source.get("website", ""),
                    "description": "\n".join(desc_parts),
                    "relevancy_score": hit["_score"],
                    "source": "internal",
                }
            )
    except Exception as e:
        print(f"Error searching OpenSearch: {e}")

    # 2. Search Gemini
    try:
        external_results = await search_gemini_vendors(query, num_results)
        for external in external_results:
            results.append(
                {
                    "id": external["vendor_id"],
                    "name": external["vendor_name"],
                    "url": external["website"],
                    "description": external["description"],
                    "relevancy_score": external["final_score"],
                    "source": "external",
                }
            )
    except Exception as e:
        print(f"Error searching Gemini: {e}")

    # Sort combined results by score descending
    results.sort(key=lambda x: x.get("relevancy_score", 0), reverse=True)
    return results


# ---------------------------------------------------------------------------
# Hybrid vendor search: keyword (BM25) + vector (kNN) with score fusion
# ---------------------------------------------------------------------------

# Field boosts for the keyword (BM25) phase.
# Higher boost → field carries more weight when it matches the query.
_KEYWORD_FIELD_BOOSTS = {
    "vendor_name": 5.0,  # Exact/partial name match is very specific
    "products": 4.0,  # Primary procurement signal
    "certificates": 3.0,  # Compliance requirements
    "location": 2.0,  # Geographic preference
    "certificate_details.document_type": 2.0,  # Cert type from AI-extracted docs
    "certificate_details.document_summary": 1.5,  # Rich AI-extracted text
    "certificate_details.issuing_authority": 1.0,  # Issuing body
}


def _build_keyword_query(query: str) -> dict:
    """Build a bool/should query that scores each field independently."""
    should_clauses = [
        {"match": {field: {"query": query, "boost": boost}}}
        for field, boost in _KEYWORD_FIELD_BOOSTS.items()
    ]
    return {
        "bool": {
            "should": should_clauses,
            "minimum_should_match": 1,
        }
    }


def _normalize(scores: dict[str, float]) -> dict[str, float]:
    """Min-max normalise a {id: score} dict to [0, 1]."""
    if not scores:
        return {}
    lo = min(scores.values())
    hi = max(scores.values())
    if hi == lo:
        return {k: 1.0 for k in scores}
    return {k: (v - lo) / (hi - lo) for k, v in scores.items()}


async def search_vendors_hybrid(query: str) -> list[dict]:
    """
    Two-phase hybrid search over the vendors OpenSearch index.

    Phase 1 — Vector (kNN):
        Generate a 1024-dim embedding for the query and retrieve the top
        `top_n * candidate_multiplier` nearest neighbours by cosine
        similarity.

    Phase 2 — Keyword (BM25):
        Run a bool/should multi-match query with per-field boosts across
        vendor_name, products, certificates, location and AI-extracted
        certificate detail fields.

    Score fusion:
        Both score sets are independently min-max normalised to [0, 1],
        then combined as:

            final = KEYWORD_WEIGHT * kw_norm + VECTOR_WEIGHT * vec_norm

        The top N results (VENDOR_SEARCH_TOP_N, default 3) are returned.

    Each phase is wrapped independently so a failure in one (e.g. Bedrock
    unavailable for embeddings) still returns results from the other.
    """
    import traceback

    top_n = settings.VENDOR_SEARCH_TOP_N
    candidates = top_n * settings.VENDOR_SEARCH_CANDIDATE_MULTIPLIER
    kw_weight = settings.VENDOR_SEARCH_KEYWORD_WEIGHT
    vec_weight = settings.VENDOR_SEARCH_VECTOR_WEIGHT

    client = _get_opensearch_client()

    vector_hits: dict[str, dict] = {}
    keyword_hits: dict[str, dict] = {}

    # ── Phase 1: vector search ──────────────────────────────────────────────
    try:
        query_embedding = generate_embedding(query)
        vector_response = client.search(
            index=VENDOR_INDEX_NAME,
            body={
                "size": candidates,
                "query": {
                    "knn": {
                        "embedding": {
                            "vector": query_embedding,
                            "k": candidates,
                        }
                    }
                },
                "_source": {"excludes": ["embedding"]},
            },
        )
        for hit in vector_response["hits"]["hits"]:
            vid = hit["_source"].get("vendor_id") or hit["_id"]
            vector_hits[vid] = {"source": hit["_source"], "score": hit["_score"]}
        print(f"[search] vector phase: {len(vector_hits)} hits")
    except Exception as e:
        print(f"[search] vector phase failed: {e}")
        traceback.print_exc()

    # ── Phase 2: keyword search ─────────────────────────────────────────────
    try:
        keyword_response = client.search(
            index=VENDOR_INDEX_NAME,
            body={
                "size": candidates,
                "query": _build_keyword_query(query),
                "_source": {"excludes": ["embedding"]},
            },
        )
        for hit in keyword_response["hits"]["hits"]:
            vid = hit["_source"].get("vendor_id") or hit["_id"]
            keyword_hits[vid] = {"source": hit["_source"], "score": hit["_score"]}
        print(f"[search] keyword phase: {len(keyword_hits)} hits")
    except Exception as e:
        print(f"[search] keyword phase failed: {e}")
        traceback.print_exc()

    if not vector_hits and not keyword_hits:
        print("[search] both phases returned no results")
        return []

    # ── Score fusion ────────────────────────────────────────────────────────
    norm_vec = _normalize({vid: h["score"] for vid, h in vector_hits.items()})
    norm_kw = _normalize({vid: h["score"] for vid, h in keyword_hits.items()})

    all_ids = set(vector_hits) | set(keyword_hits)

    results = []
    for vid in all_ids:
        vec_score = norm_vec.get(vid, 0.0)
        kw_score = norm_kw.get(vid, 0.0)
        final_score = kw_weight * kw_score + vec_weight * vec_score

        if final_score < settings.VENDOR_SEARCH_INTERNAL_THRESHOLD:
            continue

        source = (vector_hits.get(vid) or keyword_hits[vid])["source"]

        # Build the certificates list from two sources:
        # 1. vendor.certificates — text names entered directly in the CSV
        # 2. certificate_details[].document_name — AI-extracted from uploaded docs
        # Both are combined and deduplicated so vendors onboarded either way
        # always surface their certificates in search results.
        csv_certs: list[str] = source.get("certificates") or []
        doc_certs: list[str] = [
            d.get("document_name") or d.get("document_type", "")
            for d in (source.get("certificate_details") or [])
            if d.get("document_name") or d.get("document_type")
        ]
        # Preserve order; drop duplicates and blanks
        seen: set[str] = set()
        all_certs: list[str] = []
        for c in csv_certs + doc_certs:
            c = c.strip()
            if c and c not in seen:
                seen.add(c)
                all_certs.append(c)

        raw_details: list[dict] = source.get("certificate_details") or []
        print(
            f"[search] vendor {source.get('vendor_name')}: "
            f"csv_certs={csv_certs} doc_certs={doc_certs} "
            f"all_certs={all_certs} estd={source.get('estd')} "
            f"cert_details_count={len(raw_details)}"
        )

        results.append(
            {
                "vendor_id": vid,
                "vendor_name": source.get("vendor_name", ""),
                "source": "internal",
                "description": "",
                "location": source.get("location", ""),
                "products": source.get("products") or [],
                "certificates": all_certs,
                "certificate_details": raw_details,
                "website": source.get("website", ""),
                "contact_email": source.get("contact_email", ""),
                "mobile": source.get("mobile", ""),
                "estd": source.get("estd"),
                "final_score": round(final_score, 4),
                "keyword_score": round(kw_score, 4),
                "vector_score": round(vec_score, 4),
            }
        )

    results.sort(key=lambda x: x["final_score"], reverse=True)
    return results[:top_n]


async def search_gemini_vendors(query: str, num_results: int = 5) -> list[dict]:
    """
    Search for external vendors using Gemini Search and structured output via Langchain.
    """
    try:
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("[search] GEMINI_API_KEY not configured. Skipping Gemini Search.")
            return []

        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            temperature=0,
            api_key=api_key,
        )
        # Force structured output directly from Gemini
        structured_llm = llm.with_structured_output(schema=GeminiVendorList)

        prompt = f"""
        Find {num_results} actual {query}. 
        Use your internal knowledge and search to find their details. Do NOT return directory sites like Indiamart or Justdial.
        """

        response = structured_llm.invoke(prompt)

        if not response or not response.vendors:
            print("[search] Gemini returned empty structured response")
            return []

        results = []
        for i, v in enumerate(response.vendors):
            results.append(
                {
                    "vendor_id": f"gemini_{i}",
                    "vendor_name": v.vendor_name,
                    "source": "external",
                    "description": v.description or "",
                    "location": v.location or "",
                    "products": v.products or [],
                    "certificates": [],
                    "certificate_details": [],
                    "website": v.website or "",
                    "contact_email": v.contact_email or "",
                    "mobile": v.mobile or "",
                    "estd": v.estd,
                    "final_score": round(0.9 - (i * 0.05), 4),
                    "keyword_score": 0.0,
                    "vector_score": 0.0,
                }
            )
        print(f"[search] Gemini phase: {len(results)} structured hits")
        return results
    except Exception as e:
        import traceback

        print(f"[search] Gemini phase structured json compilation failed: {e}")
        traceback.print_exc()
        return []
