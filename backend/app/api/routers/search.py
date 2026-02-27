import asyncio
import traceback

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
)
from app.services.search import search_external_vendors, search_vendors_hybrid, search_exa_vendors

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
    Hybrid vendor search: internal OpenSearch (BM25 + kNN) merged with external Exa results.

    Internal scoring
    ────────────────
    1. Vector phase  — 1024-dim Titan embedding, kNN cosine similarity.
    2. Keyword phase — bool/should BM25 with per-field boosts:
       vendor_name ×5, products ×4, certificates ×3, location ×2,
       certificate_details.document_type ×2,
       certificate_details.document_summary ×1.5,
       certificate_details.issuing_authority ×1.

       final = KEYWORD_WEIGHT × kw_norm + VECTOR_WEIGHT × vec_norm

    Both searches run concurrently.  Internal results appear first, then
    external Exa results.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query must not be empty")

    # Run internal hybrid search and Exa search concurrently
    try:
        internal_raw, external_raw = await asyncio.gather(
            search_vendors_hybrid(request.query),
            search_exa_vendors(request.query, num_results=settings.VENDOR_SEARCH_EXTERNAL_N),
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
