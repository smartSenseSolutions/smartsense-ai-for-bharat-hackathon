from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class RFPGenerateRequest(BaseModel):
    project_name: str
    requirements: str
    language: Optional[str] = "English"


class RFPGenerateResponse(BaseModel):
    title: str
    overview: str
    scope_of_work: List[str]
    timeline: str
    evaluation_criteria: List[str]


class RFPDistributeRequest(BaseModel):
    project_id: str
    vendor_ids: List[str]
    rfp_data: dict


# ---------------------------------------------------------------------------
# Conversational RFP chat (Nova Lite)
# ---------------------------------------------------------------------------


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class RFPChatRequest(BaseModel):
    project_name: str
    messages: List[ChatMessage]


class RFPDataResponse(BaseModel):
    productName: str
    quantity: str
    deliveryTimeline: str
    budget: str
    specifications: List[str]
    qualityStandards: List[str]
    rfpDeadline: str
    costBornByRespondents: str
    changesInScope: str
    clarificationOfSubmissions: str


class RFPChatResponse(BaseModel):
    reply: str
    is_complete: bool
    rfp_data: Optional[RFPDataResponse] = None


# ---------------------------------------------------------------------------
# RFP Publish (PDF → S3)
# ---------------------------------------------------------------------------


class RFPPublishRequest(BaseModel):
    project_id: str
    project_name: str
    rfp_data: dict


class RFPPublishResponse(BaseModel):
    s3_url: str
    s3_key: str
