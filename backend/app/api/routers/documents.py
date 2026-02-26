from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.domain import VendorDocument
from app.schemas.documents import VendorDocumentOut, DocumentSearchResult
from app.services.documents import (
    process_pending_documents,
    search_documents,
)

router = APIRouter(prefix="/api/documents", tags=["Documents"])


# ---------------------------------------------------------------------------
# Trigger document processing
# ---------------------------------------------------------------------------


@router.post("/process-pending")
async def trigger_processing(db: Session = Depends(get_db)):
    """
    Process all pending vendor documents.

    Downloads each document from its S3 URL, extracts text via
    Amazon Nova Lite, generates a structured summary, creates an
    embedding, and indexes into OpenSearch.
    """
    result = await process_pending_documents(db)
    return {"status": "ok", **result}


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------


@router.get("/search", response_model=List[DocumentSearchResult])
async def search_vendor_documents(
    query: str = Query(..., description="Natural language search query"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Vector similarity search across all processed vendor documents.
    Uses Amazon Titan Embeddings + OpenSearch kNN.
    """
    results = await search_documents(query, db, limit=limit)
    return results


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


@router.get("/vendor/{vendor_id}", response_model=List[VendorDocumentOut])
def get_vendor_documents(vendor_id: str, db: Session = Depends(get_db)):
    """Get all document summaries for a specific vendor."""
    docs = (
        db.query(VendorDocument)
        .filter(VendorDocument.vendor_id == vendor_id)
        .order_by(VendorDocument.created_at.desc())
        .all()
    )
    return docs


@router.get("/{document_id}", response_model=VendorDocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db)):
    """Get a single document summary by ID."""
    doc = db.query(VendorDocument).filter(VendorDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
