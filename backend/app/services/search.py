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


class QueryIntent(BaseModel):
    """Structured search intent extracted from a natural language query."""

    products: List[str] = Field(
        default_factory=list,
        description="Specific products or services being sought (e.g. ['steel pipes', 'ERW pipes'])",
    )
    location: Optional[str] = Field(
        None,
        description="Geographic location mentioned — city or state in India",
    )
    certifications: List[str] = Field(
        default_factory=list,
        description="Required certifications (ISO 9001, BIS, NABL, FSSAI, GeM, CE, CMMI, etc.)",
    )
    vendor_type: Optional[str] = Field(
        None,
        description="Type of vendor if specified: manufacturer, trader, distributor, service_provider",
    )
    keywords: List[str] = Field(
        default_factory=list,
        description="Core meaningful keywords stripped of stop words and filler (4-8 words)",
    )
    search_text: str = Field(
        description="Clean 6-12 word phrase capturing the core search intent, suitable for semantic embedding",
    )


def get_gemini_client() -> genai.Client:
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("Gemini API key not configured")
    return genai.Client(api_key=api_key)


async def decompose_query(query: str) -> QueryIntent:
    """
    Use Gemini to extract structured search intent from a natural language query.

    Extracts: products, location, certifications, vendor_type, keywords, and a
    clean search_text phrase optimised for semantic embedding.

    Falls back to treating the raw query as search_text if Gemini is unavailable.
    """
    try:
        api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")

        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            temperature=0,
            api_key=api_key,
        )
        structured_llm = llm.with_structured_output(schema=QueryIntent)

        prompt = f"""Extract structured vendor search intent from this query.

Query: {query}

Extract the following fields:
- products: list of specific products or services being sought
- location: city or state in India (null if not mentioned)
- certifications: required certifications e.g. ISO 9001, BIS, NABL, FSSAI, GeM, CE, CMMI (empty list if none)
- vendor_type: manufacturer / trader / distributor / service_provider (null if unclear)
- keywords: 4-8 core meaningful words, no stop words or filler phrases
- search_text: clean 6-12 word phrase for semantic search, e.g. "steel pipe manufacturer Maharashtra ISO certified"
"""

        result = structured_llm.invoke(prompt)
        print(
            f"[search] intent: products={result.products} loc={result.location} "
            f"certs={result.certifications} type={result.vendor_type} text='{result.search_text}'"
        )
        return result
    except Exception as e:
        print(f"[search] query decomposition failed, using raw query: {e}")
        words = [w for w in query.split() if len(w) > 2]
        return QueryIntent(keywords=words[:8], search_text=query[:200])


# ---------------------------------------------------------------------------
# Hybrid vendor search: field-targeted BM25 + vector (kNN) with RRF fusion
# ---------------------------------------------------------------------------


def _build_keyword_query(intent: QueryIntent) -> dict:
    """
    Build a field-targeted bool/should query from structured query intent.

    Each extracted component is routed to its most relevant OpenSearch field,
    avoiding BM25 noise from natural language filler words.  A fallback
    multi_match on intent.search_text covers anything not explicitly categorised.
    """
    should_clauses = []

    # Products — primary procurement signal
    for product in intent.products:
        should_clauses.append(
            {"match": {"products": {"query": product, "boost": 5.0}}}
        )
        # Product names may also surface in certificate summaries
        should_clauses.append(
            {
                "match": {
                    "certificate_details.document_summary": {
                        "query": product,
                        "boost": 1.5,
                    }
                }
            }
        )

    # Location — geographic preference
    if intent.location:
        should_clauses.append(
            {"match": {"location": {"query": intent.location, "boost": 4.0}}}
        )

    # Certifications — compliance requirements, routed to cert-specific fields
    for cert in intent.certifications:
        should_clauses.append(
            {"match": {"certificates": {"query": cert, "boost": 4.0}}}
        )
        should_clauses.append(
            {
                "match": {
                    "certificate_details.document_type": {"query": cert, "boost": 3.5}
                }
            }
        )
        should_clauses.append(
            {
                "match": {
                    "certificate_details.issuing_authority": {
                        "query": cert,
                        "boost": 2.0,
                    }
                }
            }
        )

    # Core keywords against vendor name
    if intent.keywords:
        keywords_str = " ".join(intent.keywords)
        should_clauses.append(
            {"match": {"vendor_name": {"query": keywords_str, "boost": 4.0}}}
        )

    # Vendor type may appear in product descriptions
    if intent.vendor_type:
        should_clauses.append(
            {"match": {"products": {"query": intent.vendor_type, "boost": 1.5}}}
        )

    # Fallback: clean search_text as a broad multi_match safety net
    if intent.search_text:
        should_clauses.append(
            {
                "multi_match": {
                    "query": intent.search_text,
                    "fields": [
                        "vendor_name^3",
                        "products^2",
                        "certificates^2",
                        "location^2",
                        "certificate_details.document_summary^1.5",
                    ],
                    "type": "best_fields",
                    "boost": 1.0,
                }
            }
        )

    if not should_clauses:
        return {"match_all": {}}

    return {"bool": {"should": should_clauses, "minimum_should_match": 1}}


def _rrf_fuse(
    vector_hits: dict[str, dict],
    keyword_hits: dict[str, dict],
    k: int = 60,
) -> list[tuple[str, float]]:
    """
    Reciprocal Rank Fusion (Cormack et al., 2009).

        score(doc) = Σ  1 / (k + rank_in_list)

    k=60 is the standard default from the original paper.  RRF is rank-based so
    it requires no score normalisation and is robust to outlier raw scores in
    either retrieval list.  Documents appearing in both lists receive an additive
    boost from the second term.
    """
    vec_ranked = sorted(
        vector_hits, key=lambda v: vector_hits[v]["score"], reverse=True
    )
    kw_ranked = sorted(
        keyword_hits, key=lambda v: keyword_hits[v]["score"], reverse=True
    )

    vec_ranks = {vid: i + 1 for i, vid in enumerate(vec_ranked)}
    kw_ranks = {vid: i + 1 for i, vid in enumerate(kw_ranked)}

    scored: list[tuple[str, float]] = []
    for vid in set(vector_hits) | set(keyword_hits):
        rrf = 0.0
        if vid in vec_ranks:
            rrf += 1.0 / (k + vec_ranks[vid])
        if vid in kw_ranks:
            rrf += 1.0 / (k + kw_ranks[vid])
        scored.append((vid, rrf))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


async def search_vendors_hybrid(query: str) -> list[dict]:
    """
    Three-phase hybrid search over the vendors OpenSearch index.

    Phase 0 — Query Decomposition:
        A fast Gemini call converts the natural language query into structured
        intent (products, location, certifications, keywords, search_text).

    Phase 1 — Vector (kNN):
        Embed `intent.search_text` (clean, focused) instead of the raw query
        and retrieve the top `top_n * candidate_multiplier` nearest neighbours
        by cosine similarity.

    Phase 2 — Keyword (BM25):
        Run field-targeted bool/should clauses using the extracted intent:
        products → products field, location → location field, certifications
        → certificates/certificate_details fields.  A fallback multi_match on
        search_text covers anything not explicitly categorised.

    Score fusion — RRF:
        Results are merged with Reciprocal Rank Fusion.  No normalisation or
        weight tuning required; rank position determines contribution.

    Each retrieval phase is wrapped independently so a failure in one still
    returns results from the other.
    """
    import traceback

    top_n = settings.VENDOR_SEARCH_TOP_N
    candidates = top_n * settings.VENDOR_SEARCH_CANDIDATE_MULTIPLIER
    rrf_k = settings.VENDOR_SEARCH_RRF_K

    # ── Phase 0: decompose query into structured intent ──────────────────────
    intent = await decompose_query(query)

    client = _get_opensearch_client()

    vector_hits: dict[str, dict] = {}
    keyword_hits: dict[str, dict] = {}

    # ── Phase 1: vector search on clean search_text ─────────────────────────
    embed_text = intent.search_text or query
    try:
        query_embedding = generate_embedding(embed_text)
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
        print(
            f"[search] vector phase: {len(vector_hits)} hits | embed: '{embed_text}'"
        )
    except Exception as e:
        print(f"[search] vector phase failed: {e}")
        traceback.print_exc()

    # ── Phase 2: field-targeted keyword search ───────────────────────────────
    try:
        keyword_response = client.search(
            index=VENDOR_INDEX_NAME,
            body={
                "size": candidates,
                "query": _build_keyword_query(intent),
                "_source": {"excludes": ["embedding"]},
            },
        )
        for hit in keyword_response["hits"]["hits"]:
            vid = hit["_source"].get("vendor_id") or hit["_id"]
            keyword_hits[vid] = {"source": hit["_source"], "score": hit["_score"]}
        print(
            f"[search] keyword phase: {len(keyword_hits)} hits | "
            f"products={intent.products} loc={intent.location} certs={intent.certifications}"
        )
    except Exception as e:
        print(f"[search] keyword phase failed: {e}")
        traceback.print_exc()

    if not vector_hits and not keyword_hits:
        print("[search] both phases returned no results")
        return []

    # ── RRF score fusion ─────────────────────────────────────────────────────
    fused = _rrf_fuse(vector_hits, keyword_hits, k=rrf_k)

    # Normalise RRF scores to [0, 1] using the theoretical maximum.
    # max possible RRF = 2/(k+1): a document ranked #1 in both lists.
    # This makes final_score directly interpretable as a match percentage.
    max_rrf = 2.0 / (rrf_k + 1)

    results = []
    for vid, rrf_score in fused[:top_n]:
        vendor_data = (vector_hits.get(vid) or keyword_hits[vid])["source"]
        raw_vec = vector_hits.get(vid, {}).get("score", 0.0)
        raw_kw = keyword_hits.get(vid, {}).get("score", 0.0)
        normalized_score = min(rrf_score / max_rrf, 1.0)

        csv_certs: list[str] = vendor_data.get("certificates") or []
        doc_certs: list[str] = [
            d.get("document_name") or d.get("document_type", "")
            for d in (vendor_data.get("certificate_details") or [])
            if d.get("document_name") or d.get("document_type")
        ]
        seen: set[str] = set()
        all_certs: list[str] = []
        for c in csv_certs + doc_certs:
            c = c.strip()
            if c and c not in seen:
                seen.add(c)
                all_certs.append(c)

        raw_details: list[dict] = vendor_data.get("certificate_details") or []
        print(
            f"[search] {vendor_data.get('vendor_name')}: "
            f"rrf={rrf_score:.6f} norm={normalized_score:.4f} vec={raw_vec:.4f} kw={raw_kw:.4f}"
        )

        results.append(
            {
                "vendor_id": vid,
                "vendor_name": vendor_data.get("vendor_name", ""),
                "source": "internal",
                "description": "",
                "location": vendor_data.get("location", ""),
                "products": vendor_data.get("products") or [],
                "certificates": all_certs,
                "certificate_details": raw_details,
                "website": vendor_data.get("website", ""),
                "contact_email": vendor_data.get("contact_email", ""),
                "mobile": vendor_data.get("mobile", ""),
                "estd": vendor_data.get("estd"),
                "final_score": round(normalized_score, 4),
                "keyword_score": round(raw_kw, 4),
                "vector_score": round(raw_vec, 4),
            }
        )

    return results


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

    results.sort(key=lambda x: x.get("relevancy_score", 0), reverse=True)
    return results


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
