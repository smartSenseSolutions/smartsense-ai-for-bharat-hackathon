from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class VendorCreate(BaseModel):
    name: str
    location: Optional[str] = None
    estd: Optional[int] = None
    mobile: Optional[str] = None
    contact_email: Optional[str] = None
    certificates: Optional[List[str]] = None
    products: Optional[List[str]] = None
    website: Optional[str] = None


class VendorOut(BaseModel):
    id: str
    name: str
    location: Optional[str] = None
    estd: Optional[int] = None
    mobile: Optional[str] = None
    contact_email: Optional[str] = None
    certificates: Optional[List[str]] = None
    products: Optional[List[str]] = None
    website: Optional[str] = None
    certification_status: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BulkUploadResult(BaseModel):
    total: int
    created: int
    updated: int = 0
    failed: int
    documents_queued: int = 0
    errors: List[dict] = []
