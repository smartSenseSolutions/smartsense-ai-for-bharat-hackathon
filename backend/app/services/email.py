"""
Nylas email service for sending RFPs and receiving vendor quotations.

Flow:
  1. Procurement team sends RFP to vendor via POST /api/email/send-rfp
     → Subject: "RFP-{project_id}: {project_name} - Request for Proposal"
  2. Vendor replies with their quotation (same thread)
  3. Nylas fires a webhook (POST /api/email/webhook) on message.created
  4. We extract project_id from the subject, parse the price with Bedrock,
     and create a Quote record in the database.
"""

import base64
import hmac
import hashlib
import json
import re
from typing import Optional

import boto3

from nylas import Client  # nylas>=6.0.0 (Nylas API v3)

from app.core.config import settings
from app.services.rfp import get_bedrock_client


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


def get_nylas_client() -> Client:
    if not settings.NYLAS_API_KEY:
        raise RuntimeError("NYLAS_API_KEY is not configured.")
    return Client(
        api_key=settings.NYLAS_API_KEY,
        api_uri=settings.NYLAS_API_URI,
    )


def _require_grant_id() -> str:
    if not settings.NYLAS_GRANT_ID:
        raise RuntimeError("NYLAS_GRANT_ID is not configured.")
    return settings.NYLAS_GRANT_ID


# ---------------------------------------------------------------------------
# S3 helpers
# ---------------------------------------------------------------------------


def download_rfp_pdf_from_s3(project_id: str) -> bytes:
    """
    Download the published RFP PDF from S3.
    File key: {project_id}.pdf in the S3_RFP_BUCKET bucket.
    Returns raw PDF bytes.
    """
    bucket = settings.S3_RFP_BUCKET
    if not bucket:
        raise RuntimeError("S3_RFP_BUCKET is not configured")

    region = settings.S3_RFP_BUCKET_REGION or settings.AWS_REGION
    s3 = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )

    s3_key = f"{project_id}.pdf"
    response = s3.get_object(Bucket=bucket, Key=s3_key)
    return response["Body"].read()


# ---------------------------------------------------------------------------
# Email template
# ---------------------------------------------------------------------------


def _build_rfp_email_html(
    vendor_name: str,
    project_name: str,
    project_id: str,
    rfp_data: dict,
) -> str:
    """Build a professional HTML email body for RFP distribution."""

    def row(label: str, value) -> str:
        if value is None:
            return ""
        return (
            f"<tr>"
            f"<td style='padding:8px 12px;font-weight:600;color:#374151;"
            f"background:#F9FAFB;width:200px;border:1px solid #E5E7EB'>{label}</td>"
            f"<td style='padding:8px 12px;color:#1F2937;border:1px solid #E5E7EB'>{value}</td>"
            f"</tr>"
        )

    detail_rows = ""
    field_labels = {
        "product_service": "Product / Service",
        "quantity": "Quantity / Scope",
        "timeline": "Delivery Timeline",
        "budget": "Budget (INR)",
        "deadline": "Quotation Deadline",
        "description": "Description",
        "requirements": "Requirements",
        "technical_specs": "Technical Specifications",
        "terms": "Terms & Conditions",
    }
    for key, label in field_labels.items():
        detail_rows += row(label, rfp_data.get(key))

    # Any extra keys not in the map
    for key, value in rfp_data.items():
        if key not in field_labels and value:
            detail_rows += row(key.replace("_", " ").title(), value)

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#F3F4F6;padding:32px 0;margin:0">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border-radius:8px;
              overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

    <!-- Header -->
    <div style="background:#3B82F6;padding:24px 32px">
      <h1 style="color:#FFFFFF;margin:0;font-size:20px;font-weight:700">
        Request for Proposal
      </h1>
      <p style="color:#BFDBFE;margin:4px 0 0;font-size:14px">
        Procure AI &mdash; Procurement Management Platform
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <p style="color:#1F2937;margin:0 0 16px">Dear <strong>{vendor_name}</strong>,</p>
      <p style="color:#4B5563;line-height:1.6;margin:0 0 24px">
        We are pleased to invite you to submit a quotation for the following
        procurement requirement. Please review the details below and reply to this
        email with your best offer, including unit price, total price, delivery
        timeline, and any applicable terms.
      </p>

      <!-- RFP Details -->
      <h2 style="color:#1F2937;font-size:16px;margin:0 0 12px">
        Project: {project_name}
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        {detail_rows}
      </table>

      <!-- Instructions -->
      <div style="background:#EFF6FF;border-left:4px solid #3B82F6;
                  padding:16px;border-radius:4px;margin-bottom:24px">
        <p style="color:#1E40AF;margin:0;font-weight:600;font-size:14px">
          How to submit your quotation
        </p>
        <ul style="color:#1D4ED8;margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.8">
          <li>Reply directly to this email.</li>
          <li>Include your <strong>unit price</strong>, <strong>total price</strong>,
              currency, and <strong>delivery timeline</strong>.</li>
          <li>Attach any product catalogues, brochures, or compliance certificates.</li>
          <li>Ensure your reply arrives before the quotation deadline.</li>
        </ul>
      </div>

      <p style="color:#4B5563;font-size:14px;line-height:1.6">
        If you have any questions, feel free to reply to this email.
        We look forward to receiving your proposal.
      </p>

      <p style="color:#1F2937;margin:24px 0 0">
        Best regards,<br>
        <strong>Procurement Team</strong><br>
        <span style="color:#6B7280;font-size:13px">Procure AI Platform</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F9FAFB;padding:16px 32px;border-top:1px solid #E5E7EB">
      <p style="color:#9CA3AF;font-size:12px;margin:0">
        Reference: RFP-{project_id} &bull;
        This email was sent via Procure AI. Do not forward this RFP to third parties.
      </p>
    </div>
  </div>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Send
# ---------------------------------------------------------------------------


def send_rfp_email(
    vendor_email: str,
    vendor_name: str,
    project_id: str,
    project_name: str,
    rfp_data: dict,
    cc: Optional[list[str]] = None,
    attachment_bytes: Optional[bytes] = None,
    attachment_name: Optional[str] = None,
) -> dict:
    """
    Send an RFP email to a single vendor and return the Nylas message object.

    Subject format: "RFP-{project_id}: {project_name} - Request for Proposal"
    This format is parsed by the webhook handler to match incoming replies.

    If attachment_bytes is provided, the PDF is attached to the email.
    """
    nylas = get_nylas_client()
    grant_id = _require_grant_id()

    subject = f"RFP-{project_id}: {project_name} - Request for Proposal"
    html_body = _build_rfp_email_html(vendor_name, project_name, project_id, rfp_data)

    request_body: dict = {
        "subject": subject,
        "body": html_body,
        "to": [{"name": vendor_name, "email": vendor_email}],
        "reply_to": [{"name": "Procure AI", "email": settings.NYLAS_SENDER_EMAIL}],
    }
    if cc:
        request_body["cc"] = [{"email": addr} for addr in cc]

    if attachment_bytes and attachment_name:
        request_body["attachments"] = [
            {
                "content": base64.b64encode(attachment_bytes).decode("utf-8"),
                "content_type": "application/pdf",
                "filename": attachment_name,
            }
        ]

    response = nylas.messages.send(identifier=grant_id, request_body=request_body)
    return response.data


def send_bulk_rfp_emails(
    project_id: str,
    project_name: str,
    rfp_data: dict,
    vendors: list[dict],
    attachment_bytes: Optional[bytes] = None,
    attachment_name: Optional[str] = None,
) -> list[dict]:
    """
    Send RFP emails to multiple vendors.

    Each vendor dict must have: id, name, contact_email.
    If attachment_bytes is provided, the PDF is attached to every email.
    Returns a list of result dicts with success/failure per vendor.
    """
    results = []
    for vendor in vendors:
        vendor_id = vendor.get("id", "")
        vendor_name = vendor.get("name", "Vendor")
        vendor_email = vendor.get("contact_email", "")

        if not vendor_email:
            results.append(
                {
                    "vendor_id": vendor_id,
                    "vendor_name": vendor_name,
                    "success": False,
                    "error": "No email address on record for this vendor.",
                }
            )
            continue

        try:
            message = send_rfp_email(
                vendor_email=vendor_email,
                vendor_name=vendor_name,
                project_id=project_id,
                project_name=project_name,
                rfp_data=rfp_data,
                attachment_bytes=attachment_bytes,
                attachment_name=attachment_name,
            )
            results.append(
                {
                    "vendor_id": vendor_id,
                    "vendor_name": vendor_name,
                    "success": True,
                    "message_id": message.id,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "vendor_id": vendor_id,
                    "vendor_name": vendor_name,
                    "success": False,
                    "error": str(exc),
                }
            )

    return results


def send_reply_email(
    project_id: str,
    subject: str,
    to_email: str,
    to_name: str,
    body: str,
) -> dict:
    """
    Send a reply to an existing email thread.
    Uses the sender grant ID (Gmail) explicitly since it's an outbound email.
    We look up the original sent message in the sender grant to use its true ID
    for reply_to_message_id, ensuring the reply threads perfectly in Gmail.
    """
    nylas = get_nylas_client()
    grant_id = _require_grant_id()

    # Find the original message sent to this vendor for this project
    # so we can use its ID for threading explicitly on the Gmail grant.
    original_msg_id = None
    if project_id:
        try:
            query = f"subject:RFP-{project_id} to:{to_email}"
            response = nylas.messages.list(
                identifier=grant_id,
                query_params={"search_query_native": query, "limit": 1},
            )
            if response.data:
                original_msg_id = response.data[0].id
        except Exception as exc:
            print(f"[email] Failed to find original message for threading: {exc}")

    # Create the subject. Ensure it has "Re: " prefix for standard threading
    reply_subject = subject if subject.lower().startswith("re:") else f"Re: {subject}"

    request_body: dict = {
        "subject": reply_subject,
        "body": body,
        "to": [{"name": to_name, "email": to_email}],
        "reply_to": [{"name": "Procure AI", "email": settings.NYLAS_SENDER_EMAIL}],
    }

    if original_msg_id:
        request_body["reply_to_message_id"] = original_msg_id

    try:
        response = nylas.messages.send(identifier=grant_id, request_body=request_body)
    except Exception as exc:
        print(f"[email] Nylas send reply exception: {exc}")
        if hasattr(exc, "status_code"):
            print(f"[email] status_code: {exc.status_code}")
        if hasattr(exc, "body"):
            print(f"[email] body: {getattr(exc, 'body')}")
        raise RuntimeError(f"Failed to send reply via Nylas API: {exc}")

    return response.data


# ---------------------------------------------------------------------------
# Thread Fetching
# ---------------------------------------------------------------------------


def _addr_list(addrs) -> list[dict]:
    """Normalise a Nylas address list to plain dicts regardless of SDK version."""
    result = []
    for p in addrs or []:
        if isinstance(p, dict):
            result.append({"name": p.get("name", ""), "email": p.get("email", "")})
        else:
            result.append(
                {
                    "name": getattr(p, "name", "") or "",
                    "email": getattr(p, "email", "") or "",
                }
            )
    return result


def list_thread_messages(thread_id: str) -> list[dict]:
    """Return all messages in an email thread (as plain dicts).

    Searches both the sender grant and the inbound grant so that outgoing
    RFP emails and vendor replies (which arrive at the Nylas inbound email)
    are both included.
    """
    nylas = get_nylas_client()
    grant_id = _require_grant_id()

    # Collect raw messages from both grants
    raw_messages = []

    try:
        response = nylas.messages.list(
            identifier=grant_id,
            query_params={"thread_id": thread_id, "fields": "include_headers"},
        )
        raw_messages.extend(response.data)
    except Exception:
        pass

    inbound_grant = settings.NYLAS_INBOUND_GRANT_ID
    if inbound_grant and inbound_grant != grant_id:
        try:
            response = nylas.messages.list(
                identifier=inbound_grant,
                query_params={"thread_id": thread_id, "fields": "include_headers"},
            )
            raw_messages.extend(response.data)
        except Exception:
            pass

    # Deduplicate by message ID
    seen_ids: set[str] = set()
    result = []
    for msg in raw_messages:
        if msg.id in seen_ids:
            continue
        seen_ids.add(msg.id)

        # Extract RFC-2822 Message-ID from headers
        rfc_message_id = ""
        for h in getattr(msg, "headers", None) or []:
            if getattr(h, "name", "").lower() == "message-id":
                rfc_message_id = getattr(h, "value", "")
                break

        attachments = []
        for att in getattr(msg, "attachments", None) or []:
            if getattr(att, "is_inline", False):
                continue
            attachments.append(
                {
                    "id": getattr(att, "id", ""),
                    "filename": getattr(att, "filename", None) or "attachment",
                    "content_type": getattr(att, "content_type", None)
                    or "application/octet-stream",
                    "size": getattr(att, "size", 0) or 0,
                }
            )
        result.append(
            {
                "id": msg.id,
                "rfc_message_id": rfc_message_id,
                "subject": msg.subject,
                "from": _addr_list(getattr(msg, "from_", None)),
                "to": _addr_list(getattr(msg, "to", None)),
                "body": msg.body or "",
                "date": msg.date,
                "thread_id": msg.thread_id,
                "attachments": attachments,
            }
        )
    return result


def search_rfp_threads_nylas(
    project_id: str, invited_emails: set | None = None
) -> list[dict]:
    """
    Search Nylas for all email threads whose subject contains RFP-{project_id}.
    Searches both the sender grant (Gmail) and the inbound grant (Nylas virtual
    email) so that outgoing RFPs and vendor replies are both visible.
    Returns one dict per unique thread_id.
    """
    nylas = get_nylas_client()
    grant_id = _require_grant_id()

    # Collect messages from both grants
    all_messages = []

    # 1. Search the sender grant (Gmail — outgoing RFP emails)
    try:
        response = nylas.messages.list(
            identifier=grant_id,
            query_params={
                "search_query_native": f"subject:RFP-{project_id}",
                "limit": 50,
            },
        )
        all_messages.extend(response.data)
    except Exception as exc:
        print(f"[email] Nylas sender grant thread search failed: {exc}")

    # 2. Search the inbound grant (Nylas virtual email — vendor replies)
    inbound_grant = settings.NYLAS_INBOUND_GRANT_ID
    subject_tag = f"RFP-{project_id}"
    if inbound_grant and inbound_grant != grant_id:
        try:
            response = nylas.messages.list(
                identifier=inbound_grant,
                query_params={
                    "search_query_native": f"subject:RFP-{project_id}",
                    "limit": 50,
                },
            )
            # Client-side filter: only keep messages whose subject contains
            # the exact RFP tag for this project (case-insensitive).
            tag_lower = subject_tag.lower()
            for msg in response.data:
                if tag_lower in (msg.subject or "").lower():
                    all_messages.append(msg)
        except Exception as exc:
            print(f"[email] Nylas inbound grant thread search failed: {exc}")

    if not all_messages:
        return []

    our_emails = {
        settings.NYLAS_SENDER_EMAIL.lower(),
        settings.SUPERUSER_EMAIL.lower(),
    }

    threads: dict[str, dict] = {}
    for msg in all_messages:
        tid = msg.thread_id or msg.id
        to_addrs = _addr_list(getattr(msg, "to", None))
        from_addrs = _addr_list(getattr(msg, "from_", None))
        all_addrs = to_addrs + from_addrs

        if tid not in threads:
            vendor: dict = {}

            # 1st priority: address that matches a known invited vendor
            if invited_emails:
                vendor = next(
                    (a for a in all_addrs if a.get("email") in invited_emails),
                    {},
                )

            # 2nd priority: any address not in our known sender set
            if not vendor:
                vendor = next(
                    (
                        a
                        for a in all_addrs
                        if a.get("email", "").lower() not in our_emails
                    ),
                    all_addrs[0] if all_addrs else {},
                )

            threads[tid] = {
                "thread_id": tid,
                "vendor_email": vendor.get("email", ""),
                "vendor_name": vendor.get("name", ""),
                "subject": msg.subject or "",
                "latest_date": msg.date,
                "message_count": 1,
            }
        else:
            threads[tid]["message_count"] += 1
            if msg.date and (
                threads[tid]["latest_date"] is None
                or msg.date > threads[tid]["latest_date"]
            ):
                threads[tid]["latest_date"] = msg.date

    return list(threads.values())


def download_attachment_content(
    attachment_id: str, message_id: str
) -> tuple[bytes, str, str]:
    """Fetch attachment bytes from Nylas. Returns (content_bytes, content_type, filename).

    Tries the sender grant first, then falls back to the inbound grant
    (vendor replies with attachments live on the inbound grant).
    Uses download_bytes() for the actual file content.
    """
    nylas = get_nylas_client()
    grant_id = _require_grant_id()

    grants_to_try = [grant_id]
    inbound_grant = settings.NYLAS_INBOUND_GRANT_ID
    if inbound_grant and inbound_grant != grant_id:
        grants_to_try.append(inbound_grant)

    last_exc = None
    for gid in grants_to_try:
        try:
            # Get metadata (filename, content_type) from find()
            meta_response = nylas.attachments.find(
                identifier=gid,
                attachment_id=attachment_id,
                query_params={"message_id": message_id},
            )
            att = meta_response.data
            filename = getattr(att, "filename", None) or "attachment"
            content_type = (
                getattr(att, "content_type", None) or "application/octet-stream"
            )

            # Get actual file bytes from download_bytes()
            content = nylas.attachments.download_bytes(
                identifier=gid,
                attachment_id=attachment_id,
                query_params={"message_id": message_id},
            )
            return content, content_type, filename
        except Exception as exc:
            last_exc = exc

    raise last_exc or RuntimeError("Failed to download attachment from any grant.")


# ---------------------------------------------------------------------------
# Webhook verification
# ---------------------------------------------------------------------------


def verify_webhook_signature(raw_body: bytes, nylas_signature: str) -> bool:
    """
    Verify that a Nylas webhook request is authentic.

    Nylas signs the raw request body with HMAC-SHA256 using the webhook secret.
    The signature is sent in the X-Nylas-Signature header.
    """
    if not settings.NYLAS_WEBHOOK_SECRET:
        # If no secret is configured, skip verification (not recommended for prod)
        return True

    expected = hmac.new(
        settings.NYLAS_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, nylas_signature)


# ---------------------------------------------------------------------------
# Quotation parsing from incoming reply email
# ---------------------------------------------------------------------------

# Matches subject lines like "Re: RFP-abc123: Project Name - ..."
_RFP_SUBJECT_RE = re.compile(r"RFP-([A-Za-z0-9_-]+):", re.IGNORECASE)


def extract_project_id_from_subject(subject: str) -> Optional[str]:
    """Parse the project_id embedded in the RFP email subject."""
    match = _RFP_SUBJECT_RE.search(subject)
    return match.group(1) if match else None


def parse_quotation_with_bedrock(email_body: str, project_name: str) -> dict:
    """
    Use AWS Bedrock to extract structured quotation data from a vendor reply email.

    Returns a dict with: price, currency, delivery_timeline, notes.
    Falls back to empty defaults if Bedrock is unavailable.
    """
    prompt = f"""
You are an AI procurement assistant. A vendor has replied to an RFP for "{project_name}".
Extract the quotation details from the email body below.

Return ONLY a valid JSON object with these fields:
- "price": number (total price, null if not found)
- "currency": string (e.g. "INR", "USD"; default "INR")
- "delivery_timeline": string (e.g. "4 weeks", null if not found)
- "notes": string (any important terms, conditions, or remarks)

Email body:
---
{email_body[:3000]}
---

Return only the JSON object, no markdown formatting.
"""

    try:
        bedrock = get_bedrock_client()
        body = json.dumps(
            {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 512,
                "messages": [{"role": "user", "content": prompt}],
            }
        )
        response = bedrock.invoke_model(
            modelId=settings.BEDROCK_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        text = json.loads(response["body"].read())["content"][0]["text"]
        return json.loads(text)
    except Exception as exc:
        print(f"[email service] Bedrock quotation parsing failed: {exc}")
        return {
            "price": None,
            "currency": "INR",
            "delivery_timeline": None,
            "notes": None,
        }
