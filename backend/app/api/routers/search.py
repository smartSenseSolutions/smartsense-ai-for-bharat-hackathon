from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search import search_external_vendors

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.post("/vendors", response_model=SearchResponse)
async def search_vendors(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Search for external vendors using Exa AI and internal DB (OpenSearch mocked for now).
    """
    # Later: Combine Exa search results with OpenSearch vector search results from local DB
    results = await search_external_vendors(request.query)

    return SearchResponse(results=results, total=len(results))
