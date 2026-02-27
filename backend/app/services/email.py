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

import hmac
import hashlib
import json
import re
from typing import Optional

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
) -> dict:
    """
    Send an RFP email to a single vendor and return the Nylas message object.

    Subject format: "RFP-{project_id}: {project_name} - Request for Proposal"
    This format is parsed by the webhook handler to match incoming replies.
    """
    nylas = get_nylas_client()
    grant_id = _require_grant_id()

    subject = f"RFP-{project_id}: {project_name} - Request for Proposal"
    html_body = _build_rfp_email_html(vendor_name, project_name, project_id, rfp_data)

    request_body: dict = {
        "subject": subject,
        "body": html_body,
        "to": [{"name": vendor_name, "email": vendor_email}],
    }
    if cc:
        request_body["cc"] = [{"email": addr} for addr in cc]

    response = nylas.messages.send(identifier=grant_id, request_body=request_body)
    return response.data


def send_bulk_rfp_emails(
    project_id: str,
    project_name: str,
    rfp_data: dict,
    vendors: list[dict],
) -> list[dict]:
    """
    Send RFP emails to multiple vendors.

    Each vendor dict must have: id, name, contact_email.
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


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------

def list_thread_messages(thread_id: str) -> list[dict]:
    """Return all messages in an email thread (as plain dicts)."""
    nylas = get_nylas_client()
    grant_id = _require_grant_id()

    response = nylas.messages.list(
        identifier=grant_id,
        query_params={"thread_id": thread_id},
    )

    result = []
    for msg in response.data:
        result.append(
            {
                "id": msg.id,
                "subject": msg.subject,
                "from": msg.from_,
                "to": msg.to,
                "body": msg.body,
                "date": msg.date,
                "thread_id": msg.thread_id,
            }
        )
    return result


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
        return {"price": None, "currency": "INR", "delivery_timeline": None, "notes": None}
