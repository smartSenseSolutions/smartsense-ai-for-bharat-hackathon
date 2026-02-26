from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VendorDocumentOut(BaseModel):
    id: str
    vendor_id: str
    document_url: str
    document_name: Optional[str] = None
    issued_to: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    document_summary: Optional[str] = None
    document_type: Optional[str] = None
    processing_status: str = "pending"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentSearchQuery(BaseModel):
    query: str
    limit: int = 10


class DocumentSearchResult(BaseModel):
    document: VendorDocumentOut
    score: float
    vendor_name: Optional[str] = None
