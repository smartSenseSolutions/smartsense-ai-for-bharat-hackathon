from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


class QuoteSubmitRequest(BaseModel):
    project_id: str
    vendor_id: str
    price: float
    currency: str = "INR"
    sla_details: dict


class QuoteScoreRequest(BaseModel):
    quotes: List[dict]  # list of serialized quotes


class NegotiationEmailRequest(BaseModel):
    quote_id: str
    target_reduction_percentage: float
    context: str


class CertificationVerifyRequest(BaseModel):
    vendor_id: str
    document_base64: str
    document_type: str  # e.g. "ISO_13485"


class ProjectCreate(BaseModel):
    project_name: str
    status: str = "draft"
    rfp_data: Optional[Any] = None


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    status: Optional[str] = None
    rfp_data: Optional[Any] = None


class ProjectResponse(BaseModel):
    id: str
    project_name: str
    status: str
    rfp_data: Optional[Any]
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectVendorResponse(BaseModel):
    id: str
    project_id: str
    vendor_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
