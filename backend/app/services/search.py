from exa_py import Exa
from app.core.config import settings
from app.services.documents import (
    generate_embedding,
    _get_opensearch_client,
    VENDOR_INDEX_NAME,
)


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
        # Exa search works best with natural language queries looking for matches
        response = exa.search_and_contents(
            query=f"Companies or vendors providing: {query}",
            type="neural",
            use_autoprompt=True,
            num_results=num_results,
            text=True,
            highlights=True,
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
