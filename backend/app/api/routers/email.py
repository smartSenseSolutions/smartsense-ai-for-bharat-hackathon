"""
Email router — Nylas-powered email endpoints for RFP distribution and
incoming quotation handling.

Endpoints:
  POST /api/email/send-rfp          — Send RFP to a single vendor
  POST /api/email/send-rfp/bulk     — Send RFP to multiple vendors
  GET  /api/email/threads/{id}      — Fetch all messages in a thread
  GET  /api/email/webhook           — Nylas webhook challenge (GET)
  POST /api/email/webhook           — Nylas webhook event handler

Webhook flow:
  Nylas POSTs a `message.created` event when a vendor replies.
  We verify the signature, extract the project_id from the email subject,
  parse the quotation price with Bedrock, and create a Quote record.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.domain import Project, Quote, Vendor
from app.schemas.email import (
    BulkSendResponse,
    BulkSendResult,
    BulkSendRFPRequest,
    EmailSendResponse,
    SendRFPEmailRequest,
    ThreadMessagesResponse,
)
from app.services.email import (
    extract_project_id_from_subject,
    list_thread_messages,
    parse_quotation_with_bedrock,
    send_bulk_rfp_emails,
    send_rfp_email,
    verify_webhook_signature,
)

router = APIRouter(prefix="/api/email", tags=["Email"])


# ---------------------------------------------------------------------------
# Send RFP — single vendor
# ---------------------------------------------------------------------------

@router.post("/send-rfp", response_model=EmailSendResponse)
async def send_rfp_to_vendor(request: SendRFPEmailRequest):
    """
    Send an RFP email to a single vendor via Nylas.

    The email subject embeds the project_id so that vendor replies are
    automatically matched when they arrive via the webhook.
    """
    try:
        message = send_rfp_email(
            vendor_email=request.vendor_email,
            vendor_name=request.vendor_name,
            project_id=request.project_id,
            project_name=request.project_name,
            rfp_data=request.rfp_data,
            cc=request.cc,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {exc}")

    return EmailSendResponse(
        message_id=message.id,
        thread_id=message.thread_id,
        subject=message.subject,
        sent_to=request.vendor_email,
    )


# ---------------------------------------------------------------------------
# Send RFP — bulk
# ---------------------------------------------------------------------------

@router.post("/send-rfp/bulk", response_model=BulkSendResponse)
async def send_rfp_bulk(request: BulkSendRFPRequest):
    """
    Send RFP emails to multiple vendors in one call.

    Each vendor in the `vendors` list must have: id, name, contact_email.
    Vendors missing an email are skipped with an error recorded in results.
    """
    try:
        results = send_bulk_rfp_emails(
            project_id=request.project_id,
            project_name=request.project_name,
            rfp_data=request.rfp_data,
            vendors=request.vendors,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    sent = sum(1 for r in results if r.get("success"))
    failed = len(results) - sent

    return BulkSendResponse(
        total=len(results),
        sent=sent,
        failed=failed,
        results=[BulkSendResult(**r) for r in results],
    )


# ---------------------------------------------------------------------------
# Thread messages
# ---------------------------------------------------------------------------

@router.get("/threads/{thread_id}", response_model=ThreadMessagesResponse)
async def get_thread_messages(thread_id: str):
    """Fetch all messages in an email thread (e.g., an RFP + its replies)."""
    try:
        messages = list_thread_messages(thread_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch thread: {exc}")

    return ThreadMessagesResponse(thread_id=thread_id, messages=messages)


# ---------------------------------------------------------------------------
# Nylas webhook — GET challenge
# ---------------------------------------------------------------------------

@router.get("/webhook")
async def webhook_challenge(challenge: str):
    """
    Nylas webhook verification endpoint.

    When you register a webhook URL in the Nylas dashboard, Nylas sends a
    GET request with a `challenge` query parameter. You must return it
    as plain text to confirm ownership of the endpoint.
    """
    return Response(content=challenge, media_type="text/plain")


# ---------------------------------------------------------------------------
# Nylas webhook — POST events
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def handle_nylas_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handle incoming Nylas webhook events.

    Currently processes `message.created` events to detect vendor quotation
    replies and automatically create Quote records in the database.

    Security: Verifies the HMAC-SHA256 signature in the X-Nylas-Signature header.
    """
    raw_body = await request.body()
    signature = request.headers.get("X-Nylas-Signature", "")

    if not verify_webhook_signature(raw_body, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    event_type = payload.get("type", "")

    if event_type != "message.created":
        # Acknowledge but ignore non-message events
        return {"status": "ignored", "type": event_type}

    # Extract the message object from the webhook data
    msg_obj = payload.get("data", {}).get("object", {})
    subject = msg_obj.get("subject", "")
    email_body = msg_obj.get("body", "")
    from_list = msg_obj.get("from", [])
    sender_email = from_list[0].get("email", "") if from_list else ""
    sender_name = from_list[0].get("name", sender_email) if from_list else ""

    # Only process replies to our RFP emails
    project_id = extract_project_id_from_subject(subject)
    if not project_id:
        return {"status": "ignored", "reason": "Not an RFP reply"}

    # Look up the project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {"status": "ignored", "reason": f"Project {project_id} not found"}

    # Look up the vendor by sender email
    vendor = (
        db.query(Vendor)
        .filter(Vendor.contact_email == sender_email)
        .first()
    )

    # Parse quotation data from the email body using Bedrock
    parsed = parse_quotation_with_bedrock(email_body, project.project_name)

    price = parsed.get("price")
    if price is None:
        # Cannot create a quote without a price — log and acknowledge
        print(
            f"[webhook] Received reply from {sender_email} for project {project_id} "
            f"but no price could be extracted. Subject: {subject!r}"
        )
        return {
            "status": "received",
            "note": "Reply received but no price extracted; no Quote record created.",
        }

    # Create the Quote record
    quote = Quote(
        id=str(uuid.uuid4()),
        project_id=project_id,
        vendor_id=vendor.id if vendor else None,
        price=float(price),
        currency=parsed.get("currency", "INR"),
        status="received",
        sla_details={
            "delivery_timeline": parsed.get("delivery_timeline"),
            "notes": parsed.get("notes"),
            "sender_email": sender_email,
            "sender_name": sender_name,
            "email_subject": subject,
        },
        created_at=datetime.utcnow(),
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)

    return {
        "status": "processed",
        "quote_id": quote.id,
        "project_id": project_id,
        "vendor_email": sender_email,
        "price": price,
        "currency": quote.currency,
    }
