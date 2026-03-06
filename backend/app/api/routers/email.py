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

import io

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.domain import Project, Quote, Vendor
from app.schemas.email import (
    BulkSendResponse,
    BulkSendResult,
    BulkSendRFPRequest,
    EmailSendResponse,
    ReplyEmailRequest,
    SendRFPEmailRequest,
    ThreadMessagesResponse,
)
from app.services.email import (
    download_attachment_content,
    extract_project_id_from_subject,
    list_thread_messages,
    parse_quotation_with_bedrock,
    send_bulk_rfp_emails,
    send_reply_email,
    send_rfp_email,
    verify_webhook_signature,
)
from app.services.activity import log_activity

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
# Reply Email
# ---------------------------------------------------------------------------


@router.post("/reply", response_model=EmailSendResponse)
async def reply_to_thread(request: ReplyEmailRequest):
    """
    Send a reply to an existing email thread.
    Used by the Quotations sidebar UI to respond directly to a vendor.
    """
    try:
        message = send_reply_email(
            project_id=request.project_id,
            subject=request.subject,
            to_email=request.to_email,
            to_name=request.to_name,
            body=request.body,
        )
    except RuntimeError as exc:
        print(f"[email] RuntimeError in reply_to_thread: {exc}")
        if hasattr(exc, "__dict__"):
            print(f"[email] exc.__dict__: {exc.__dict__}")
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        print(f"[email] Exception in reply_to_thread: {exc}")
        if hasattr(exc, "__dict__"):
            print(f"[email] exc.__dict__: {exc.__dict__}")
        raise HTTPException(status_code=500, detail=f"Failed to send reply: {exc}")

    return EmailSendResponse(
        message_id=getattr(message, "id", "") or "",
        thread_id=getattr(message, "thread_id", "") or request.thread_id,
        subject=getattr(message, "subject", ""),
        sent_to=request.to_email,
    )


# ---------------------------------------------------------------------------
# Thread messages
# ---------------------------------------------------------------------------


@router.get("/threads/{thread_id}", response_model=ThreadMessagesResponse)
async def get_thread_messages(
    thread_id: str,
    project_id: str = Query("", description="RFP project ID for cross-grant search"),
    vendor_email: str = Query("", description="Vendor email for filtering"),
):
    """Fetch all messages in an email thread (e.g., an RFP + its replies)."""
    try:
        messages = list_thread_messages(
            thread_id,
            project_id=project_id,
            vendor_email=vendor_email,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch thread: {exc}")

    return ThreadMessagesResponse(thread_id=thread_id, messages=messages)


# ---------------------------------------------------------------------------
# Attachment download
# ---------------------------------------------------------------------------


@router.get("/attachments/{attachment_id}")
async def download_attachment(attachment_id: str, message_id: str = Query(...)):
    """Download an email attachment from Nylas by its attachment ID."""
    try:
        content, content_type, filename = download_attachment_content(
            attachment_id, message_id
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to download attachment: {exc}"
        )

    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
        print(
            f"[webhook] SIGNATURE VERIFICATION FAILED. signature={signature[:10]}...",
            flush=True,
        )
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")

    print(f"[webhook] Signature verified. payload length={len(raw_body)}", flush=True)

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
    print(
        f"[webhook] Event: {event_type}, Subject: {subject}, Extracted project_id: {project_id}",
        flush=True,
    )
    if not project_id:
        return {"status": "ignored", "reason": "Not an RFP reply"}

    # Look up the project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {"status": "ignored", "reason": f"Project {project_id} not found"}

    # Look up the vendor by sender email (exact match)
    vendor = db.query(Vendor).filter(Vendor.contact_email == sender_email).first()

    # Look up existing quote
    quote = None
    if vendor:
        quote = (
            db.query(Quote)
            .filter(Quote.project_id == project_id, Quote.vendor_id == vendor.id)
            .first()
        )

    # Fallback: if vendor exact match fails (e.g., alias/subaddressing `name+acme@`),
    # try finding a quote natively by comparing the base of the sender email to the `sla_details` sender_email.
    if not quote:
        all_project_quotes = (
            db.query(Quote).filter(Quote.project_id == project_id).all()
        )
        sender_base = (
            sender_email.split("+")[0] + "@" + sender_email.split("@")[1]
            if "+" in sender_email and "@" in sender_email
            else sender_email
        )
        for q in all_project_quotes:
            q_sla = q.sla_details or {}
            q_email = q_sla.get("sender_email", "")
            q_base = (
                q_email.split("+")[0] + "@" + q_email.split("@")[1]
                if "+" in q_email and "@" in q_email
                else q_email
            )

            if q_base.lower() == sender_base.lower():
                quote = q
                break

    processed_attachment_ids = []
    if quote and quote.sla_details:
        processed_attachment_ids = quote.sla_details.get("processed_attachment_ids", [])

    new_attachments = []
    new_attachment_ids = []
    for att in msg_obj.get("attachments", []):
        att_id = att.get("id")
        if att_id and att_id not in processed_attachment_ids:
            try:
                content, c_type, fname = download_attachment_content(
                    att_id, msg_obj.get("id")
                )
                new_attachments.append(
                    {
                        "bytes": content,
                        "content_type": c_type,
                        "filename": fname,
                        "id": att_id,
                    }
                )
                new_attachment_ids.append(att_id)
            except Exception as e:
                print(f"[webhook] Failed to download attachment {att_id}: {e}")

    # Parse quotation data from the email body and NEW attachments using Bedrock
    parsed = parse_quotation_with_bedrock(
        email_body=email_body,
        project_name=project.project_name,
        attachments=new_attachments,
    )

    price = parsed.get("price")

    if quote:
        # Update existing quote with new information if provided
        if price is not None:
            quote.price = float(price)
        if parsed.get("currency"):
            quote.currency = parsed.get("currency")

        if parsed.get("delivery_timeline"):
            quote.delivery_timeline = parsed.get("delivery_timeline")
        if parsed.get("quality_standards"):
            quote.quality_standards = parsed.get("quality_standards")
        if parsed.get("warranty_terms"):
            quote.warranty_terms = parsed.get("warranty_terms")
        if parsed.get("compliance_certifications"):
            quote.compliance_certifications = parsed.get("compliance_certifications")

        sla_details = quote.sla_details or {}

        # Merge the new contract terms into sla_details
        if "po_number" in parsed and parsed["po_number"]:
            sla_details["po_number"] = parsed["po_number"]
        if "contract_number" in parsed and parsed["contract_number"]:
            sla_details["contract_number"] = parsed["contract_number"]
        if "payment_schedule" in parsed and parsed["payment_schedule"]:
            sla_details["payment_schedule"] = parsed["payment_schedule"]
        if "delivery_milestones" in parsed and parsed["delivery_milestones"]:
            sla_details["delivery_milestones"] = parsed["delivery_milestones"]

        # payment_terms fallback to project default if not provided
        payment_terms = parsed.get("payment_terms")
        if not payment_terms and project.rfp_data:
            payment_terms = project.rfp_data.get("paymentTerms")
        if payment_terms:
            sla_details["payment_terms"] = payment_terms

        if parsed.get("notes"):
            # Append new notes or override
            existing_notes = sla_details.get("notes", "")
            sla_details["notes"] = (
                f"{existing_notes}\n[Update]: {parsed.get('notes')}".strip()
            )

        sla_details["processed_attachment_ids"] = (
            processed_attachment_ids + new_attachment_ids
        )
        # Keep latest msg metadata
        sla_details.update(
            {
                "sender_email": sender_email,
                "sender_name": sender_name,
                "email_subject": subject,
                "thread_id": msg_obj.get("thread_id"),
                "message_id": msg_obj.get("id"),
            }
        )
        quote.sla_details = sla_details
        db.commit()
        db.refresh(quote)

        log_title = f"Quote updated by {sender_name}"
        log_desc = (
            f"Project: {project.project_name}, Info updated from new email/attachments."
        )
    else:
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

        # Handle initial fallback for payment terms
        payment_terms = parsed.get("payment_terms")
        if not payment_terms and project.rfp_data:
            payment_terms = project.rfp_data.get("paymentTerms")

        # Create the Quote record
        quote = Quote(
            id=str(uuid.uuid4()),
            project_id=project_id,
            vendor_id=vendor.id if vendor else None,
            price=float(price),
            currency=parsed.get("currency", "INR"),
            status="received",
            delivery_timeline=parsed.get("delivery_timeline"),
            quality_standards=parsed.get("quality_standards"),
            warranty_terms=parsed.get("warranty_terms"),
            compliance_certifications=parsed.get("compliance_certifications"),
            sla_details={
                "notes": parsed.get("notes"),
                "po_number": parsed.get("po_number"),
                "contract_number": parsed.get("contract_number"),
                "payment_schedule": parsed.get("payment_schedule", []),
                "delivery_milestones": parsed.get("delivery_milestones", []),
                "payment_terms": payment_terms,
                "sender_email": sender_email,
                "sender_name": sender_name,
                "email_subject": subject,
                "thread_id": msg_obj.get("thread_id"),
                "message_id": msg_obj.get("id"),
                "processed_attachment_ids": new_attachment_ids,
            },
            created_at=datetime.utcnow(),
        )
        db.add(quote)
        db.commit()
        db.refresh(quote)

        log_title = f"Quote received from {sender_name}"
        log_desc = (
            f"Project: {project.project_name}, Price: {quote.currency} {quote.price}"
        )

    # Log activity
    log_activity(
        db,
        type="quote_received",
        title=log_title,
        description=log_desc,
        project_id=project_id,
        vendor_id=vendor.id if vendor else None,
    )

    return {
        "status": "processed",
        "quote_id": quote.id,
        "project_id": project_id,
        "vendor_email": sender_email,
        "price": quote.price,
        "currency": quote.currency,
    }
