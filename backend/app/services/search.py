from exa_py import Exa
from app.core.config import settings
from app.services.documents import (
    generate_embedding,
    _get_opensearch_client,
    VENDOR_INDEX_NAME,
)
from app.services.rfp import get_bedrock_client
import json
import asyncio


def get_exa_client() -> Exa:
    if not settings.EXA_API_KEY:
        raise ValueError("Exa API key not configured")
    return Exa(api_key=settings.EXA_API_KEY)


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

    # 2. Search Exa
    try:
        exa = get_exa_client()
        response = exa.search_and_contents(
            query=f"Companies or vendors providing: {query}",
            type="neural",
            # use_autoprompt=True,
            num_results=num_results,
            text=True,
            highlights=True,
            exclude_domains=[
                "indiamart.com",
                "dir.indiamart.com",
                "tradeindia.com",
                "justdial.com",
                "sulekha.com",
                "exportersindia.com",
                "jdmagicbox.com",
                "crunchbase.com",
                "zaubacorp.com",
                "tofler.in",
                "instafinancials.com",
                "ambitionbox.com",
                "glassdoor.co.in",
                "glassdoor.com",
                "linkedin.com",
                "dial4trade.com",
            ],
        )

        for res in response.results:
            # Score normalization (Exa returns score, but usually we just rank them)
            # We'll assign a mock relevancy_score for now based on normalized rank
            results.append(
                {
                    "id": res.id,
                    "name": res.title or res.url,
                    "url": res.url,
                    "description": res.text[:200] + "..." if res.text else "",
                    "relevancy_score": res.score
                    if hasattr(res, "score") and res.score
                    else 0.8,
                    "source": "external",
                }
            )

    except Exception as e:
        print(f"Error searching Exa: {e}")

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


async def extract_vendor_details_from_text(text: str) -> dict:
    """
    Extract structured vendor details from raw website text using Nova Lite.
    Returns a dict with location, products, contact_email, mobile, estd, and summary.
    """
    if not text:
        return {}

    try:
        bedrock = get_bedrock_client()
        prompt = f"""
        Extract the following information about the company or vendor from the text below.
        Return strictly a JSON object matching this structure:
        {{
            "location": "City, State, or Country (or empty string)",
            "products": ["list", "of", "products/services", "offered", "or", "empty", "list"],
            "contact_email": "email address or empty string",
            "mobile": "phone number or empty string",
            "estd": "establishment year as integer or null",
            "summary": "a concise 2-sentence summary of what the company does"
        }}

        Text:
        {text[:4000]} # Limit text length for prompt
        """

        # Amazon Nova API format
        body = json.dumps(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt}],
                    }
                ],
                "inferenceConfig": {"max_new_tokens": 500},
            }
        )

        response = bedrock.invoke_model(
            modelId=settings.BEDROCK_NOVA_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        # Amazon Nova response format
        response_body = json.loads(response.get("body").read())
        content = (
            response_body.get("output", {})
            .get("message", {})
            .get("content", [])[0]
            .get("text", "{}")
        )

        # Clean up the output if it contains markdown formatting
        if content.startswith("```json"):
            content = content[7:-3]

        return json.loads(content)
    except Exception as e:
        print(f"Error extracting vendor details: {e}")
        return {}


async def search_exa_vendors(query: str, num_results: int = 5) -> list[dict]:
    """
    Search for external vendors using Exa neural search.

    Returns a list of result dicts shaped like VendorSearchResult so they
    can be merged directly with internal results.  External results carry
    `source="external"` and only populate `vendor_name`, `website`,
    `description`, and `final_score`.
    """
    try:
        exa = get_exa_client()
        response = exa.search_and_contents(
            query=f"Companies or vendors providing: {query}",
            type="neural",
            # use_autoprompt=True,
            num_results=num_results,
            text=True,
            exclude_domains=[
                "indiamart.com",
                "dir.indiamart.com",
                "tradeindia.com",
                "justdial.com",
                "sulekha.com",
                "exportersindia.com",
                "jdmagicbox.com",
                "crunchbase.com",
                "zaubacorp.com",
                "tofler.in",
                "instafinancials.com",
                "ambitionbox.com",
                "glassdoor.co.in",
                "glassdoor.com",
                "linkedin.com",
                "dial4trade.com",
            ],
        )

        # Extract structured data for all results concurrently
        extraction_tasks = [
            extract_vendor_details_from_text(res.text or "") for res in response.results
        ]
        extracted_details = await asyncio.gather(
            *extraction_tasks, return_exceptions=True
        )

        results = []
        for i, res in enumerate(response.results):
            score = res.score if hasattr(res, "score") and res.score else 0.5
            text = res.text or ""

            # Use extracted details if available and valid
            details = extracted_details[i]
            if isinstance(details, Exception):
                print(f"[search] Extraction failed for {res.url}: {details}")
                details = {}

            snippet = details.get("summary") or (
                text[:300] + "…" if len(text) > 300 else text
            )

            results.append(
                {
                    "vendor_id": res.id,
                    "vendor_name": res.title or res.url,
                    "source": "external",
                    "description": snippet,
                    "location": details.get("location", ""),
                    "products": details.get("products", []),
                    "certificates": [],
                    "certificate_details": [],
                    "website": res.url,
                    "contact_email": details.get("contact_email", ""),
                    "mobile": details.get("mobile", ""),
                    "estd": details.get("estd", None),
                    "final_score": round(float(score), 4),
                    "keyword_score": 0.0,
                    "vector_score": 0.0,
                }
            )
        print(f"[search] Exa phase: {len(results)} hits")
        return results
    except Exception as e:
        print(f"[search] Exa phase failed: {e}")
        return []
