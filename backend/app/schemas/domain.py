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
    rfp_expiry: Optional[str] = None


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    status: Optional[str] = None
    rfp_data: Optional[Any] = None
    rfp_expiry: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    project_name: str
    status: str
    rfp_data: Optional[Any]
    rfp_expiry: Optional[str] = None
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


class ProjectInvitedVendorResponse(BaseModel):
    id: str
    project_id: str
    vendor_id: Optional[str]
    vendor_name: str
    contact_email: Optional[str]
    products: Optional[str]
    invited_at: datetime

    class Config:
        from_attributes = True


class VendorRecommendationScore(BaseModel):
    vendor_name: str
    vendor_email: str
    price_score: float
    delivery_score: float
    quality_score: float
    warranty_score: float
    compliance_score: float
    overall_score: float
    is_recommended: bool
    recommendation_reason: str
    citation: str  # Deprecated in favor of citations, but keeping for compatibility
    citations: dict[str, str]  # Granular citations for each metric


class AIRecommendationsResponse(BaseModel):
    recommendations: List[VendorRecommendationScore]
    metadata: Optional[dict[str, Any]] = None  # Caching metadata (fingerprints, etc.)
