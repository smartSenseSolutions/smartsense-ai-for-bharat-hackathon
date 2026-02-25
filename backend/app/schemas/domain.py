from pydantic import BaseModel
from typing import List, Optional


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
