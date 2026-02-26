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


class RFPChatResponse(BaseModel):
    reply: str
    is_complete: bool
    rfp_data: Optional[dict] = None
