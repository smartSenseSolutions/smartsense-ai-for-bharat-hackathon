from exa_py import Exa
from app.core.config import settings


def get_exa_client() -> Exa:
    if not settings.EXA_API_KEY:
        raise ValueError("Exa API key not configured")
    return Exa(api_key=settings.EXA_API_KEY)


async def search_external_vendors(query: str, num_results: int = 10):
    """
    Search for vendors using Exa AI search.
    """
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

        results = []
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

        return results
    except Exception as e:
        print(f"Error searching Exa: {e}")
        return []
