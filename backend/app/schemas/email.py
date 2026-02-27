from pydantic import BaseModel
from typing import Optional


class SendRFPEmailRequest(BaseModel):
    vendor_id: str
    vendor_email: str
    vendor_name: str
    project_id: str
    project_name: str
    rfp_data: dict
    cc: Optional[list[str]] = None


class BulkSendRFPRequest(BaseModel):
    project_id: str
    project_name: str
    rfp_data: dict
    # List of vendor dicts with at least {id, name, contact_email}
    vendors: list[dict]


class EmailSendResponse(BaseModel):
    message_id: str
    thread_id: str
    subject: str
    sent_to: str


class BulkSendResult(BaseModel):
    vendor_id: str
    vendor_name: str
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


class BulkSendResponse(BaseModel):
    total: int
    sent: int
    failed: int
    results: list[BulkSendResult]


class ThreadMessagesResponse(BaseModel):
    thread_id: str
    messages: list[dict]
