import asyncio
import traceback
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.schemas.search import (
    SearchRequest,
    SearchResponse,
    VendorSmartSearchRequest,
    VendorSmartSearchResponse,
    VendorSearchResult,
    SearchHistoryResponse,
)
from app.models.domain import SearchHistory
import uuid
import datetime
from app.services.search import (
    search_external_vendors,
    search_vendors_hybrid,
    search_gemini_vendors,
)

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.post("/vendors", response_model=SearchResponse)
async def search_vendors(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Search for external vendors using Exa AI and internal DB (OpenSearch mocked for now).
    """
    results = await search_external_vendors(request.query)
    return SearchResponse(results=results, total=len(results))


@router.post("/vendors/smart", response_model=VendorSmartSearchResponse)
async def smart_search_vendors(request: VendorSmartSearchRequest):
    """
    Legacy Hybrid vendor search: internal OpenSearch (BM25 + kNN) merged with external Exa results.
    Both searches run concurrently. Internal results appear first, then external Exa results.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")

    # Run internal hybrid search and Exa search concurrently
    try:
        internal_raw, external_raw = await asyncio.gather(
            search_vendors_hybrid(request.query),
            search_gemini_vendors(
                request.query, num_results=settings.VENDOR_SEARCH_EXTERNAL_N
            ),
            return_exceptions=True,
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Search failed: {e}")

    # Treat exceptions from either phase as empty results
    if isinstance(internal_raw, Exception):
        print(f"[search] internal phase raised: {internal_raw}")
        internal_raw = []
    if isinstance(external_raw, Exception):
        print(f"[search] external phase raised: {external_raw}")
        external_raw = []

    all_results = [VendorSearchResult(**r) for r in internal_raw + external_raw]

    return VendorSmartSearchResponse(
        results=all_results,
        total=len(all_results),
        internal_count=len(internal_raw),
        external_count=len(external_raw),
        query=request.query,
        top_n=settings.VENDOR_SEARCH_TOP_N,
    )


@router.post("/vendors/smart/internal", response_model=VendorSmartSearchResponse)
async def smart_search_vendors_internal(request: VendorSmartSearchRequest):
    """
    Internal vendor search only: OpenSearch (BM25 + kNN).
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")

    try:
        internal_raw = await search_vendors_hybrid(request.query)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Internal search failed: {e}")

    all_results = [VendorSearchResult(**r) for r in internal_raw]

    return VendorSmartSearchResponse(
        results=all_results,
        total=len(all_results),
        internal_count=len(internal_raw),
        external_count=0,
        query=request.query,
        top_n=settings.VENDOR_SEARCH_TOP_N,
    )


@router.post("/vendors/smart/external", response_model=VendorSmartSearchResponse)
async def smart_search_vendors_external(request: VendorSmartSearchRequest):
    """
    External vendor search only using Gemini.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")

    try:
        external_raw = await search_gemini_vendors(
            request.query, num_results=settings.VENDOR_SEARCH_EXTERNAL_N
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"External search failed: {e}")

    all_results = [VendorSearchResult(**r) for r in external_raw]

    return VendorSmartSearchResponse(
        results=all_results,
        total=len(all_results),
        internal_count=0,
        external_count=len(external_raw),
        query=request.query,
        top_n=settings.VENDOR_SEARCH_TOP_N,
    )


@router.get("/history", response_model=List[SearchHistoryResponse])
def get_search_history(db: Session = Depends(get_db)):
    """Retrieve all past search histories, ordered by most recent."""
    history_records = (
        db.query(SearchHistory).order_by(SearchHistory.created_at.desc()).all()
    )

    response = []
    for record in history_records:
        date_str = record.created_at.strftime("%d %b %Y") if record.created_at else ""
        response.append(
            SearchHistoryResponse(
                query=record.query,
                date=date_str,
                internal_results=record.internal_results or [],
                external_results=record.external_results or [],
            )
        )
    return response


@router.post("/history")
def save_search_history(payload: SearchHistoryResponse, db: Session = Depends(get_db)):
    """Save a new search history result to PostgreSQL."""
    # To prevent huge duplicate lists, check if query already exists.
    # If yes, overwrite or ignore. Here we chose to overwrite it to keep it fresh.
    existing = (
        db.query(SearchHistory).filter(SearchHistory.query == payload.query).first()
    )

    if existing:
        existing.internal_results = [r.dict() for r in payload.internal_results]
        existing.external_results = [r.dict() for r in payload.external_results]
        existing.created_at = datetime.datetime.utcnow()
    else:
        new_history = SearchHistory(
            id=str(uuid.uuid4()),
            query=payload.query,
            internal_results=[r.dict() for r in payload.internal_results],
            external_results=[r.dict() for r in payload.external_results],
        )
        db.add(new_history)

    db.commit()
    return {"status": "success"}
