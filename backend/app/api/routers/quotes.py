from datetime import datetime
from app.core.config import settings

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.domain import ProjectInvitedVendor, Quote, Vendor, Project
from app.schemas.domain import (
    QuoteScoreRequest,
    NegotiationEmailRequest,
    QuoteBulkStatusUpdate,
)
from app.services.quotes import (
    score_quotes,
    generate_negotiation_email,
    generate_ai_recommendations,
    generate_negotiation_insights,
    generate_deal_closure_extract,
)
from app.services.activity import log_activity
from app.services.email import (
    search_rfp_threads_nylas,
    list_thread_messages,
    parse_quotation_with_bedrock,
    download_attachment_content,
)

router = APIRouter(prefix="/api/quotes", tags=["Quotes & Negotiation"])


@router.put("/bulk-status")
async def bulk_update_quote_status(
    request: QuoteBulkStatusUpdate, db: Session = Depends(get_db)
):
    """
    Update the status of multiple quotes for a project based on vendor emails.
    If a quote record doesn't exist (e.g. vendor discovered via AI/search),
    this record will be created.
    """
    import uuid
    from app.models.domain import Project

    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Find existing quotes
    existing_quotes = (
        db.query(Quote).filter(Quote.project_id == request.project_id).all()
    )
    existing_emails = {
        (q.sla_details or {}).get("sender_email"): q for q in existing_quotes
    }

    # AI recommendation data for fallback
    recs_data = (project.ai_recommendations or {}).get("recommendations", [])
    rec_by_email = {r.get("vendor_email"): r for r in recs_data}

    for email in request.vendor_emails:
        if email in existing_emails:
            existing_emails[email].status = request.status
        elif email in rec_by_email:
            # Create a shell quote record from AI recommendation data
            rec = rec_by_email[email]
            new_quote = Quote(
                id=str(uuid.uuid4()),
                project_id=request.project_id,
                status=request.status,
                sla_details={
                    "sender_email": email,
                    "sender_name": rec.get("vendor_name"),
                    "thread_id": rec.get("thread_id"),
                    "notes": rec.get("recommendation_reason"),
                },
            )
            db.add(new_quote)

    db.commit()
    return {
        "status": "success",
        "message": f"Updated {len(request.vendor_emails)} vendor status to {request.status}",
    }


@router.get("/by-project/{project_id}")
async def get_quotes_by_project(project_id: str, db: Session = Depends(get_db)):
    """
    Return quotations for a project.

    Merges two sources:
      1. DB quotes — parsed by the Nylas webhook (have price / delivery data).
      2. Live Nylas search — finds threads matching "RFP-{project_id}" in the
         subject, so results appear even before the webhook fires.
    """
    # ── invited vendor lookup ──────────────────────────────────────────────
    invited = (
        db.query(ProjectInvitedVendor)
        .filter(ProjectInvitedVendor.project_id == project_id)
        .all()
    )
    name_by_email = {
        iv.contact_email: iv.vendor_name for iv in invited if iv.contact_email
    }
    invited_emails = set(name_by_email.keys())

    result: list[dict] = []
    thread_to_quote: dict[str, Quote] = {}

    # ── 1. DB-backed quotes (webhook-parsed, have price/delivery) ──────────
    db_quotes = (
        db.query(Quote)
        .filter(Quote.project_id == project_id)
        .order_by(Quote.created_at.desc())
        .all()
    )
    for q in db_quotes:
        sla = q.sla_details or {}
        thread_id = sla.get("thread_id")
        if thread_id:
            thread_to_quote[thread_id] = q

    # ── 2. Live Nylas search — threads not yet in DB or Updated ───────────────────────
    try:
        import uuid

        nylas_threads = search_rfp_threads_nylas(project_id, invited_emails)
        project = db.query(Project).filter(Project.id == project_id).first()

        for t in nylas_threads:
            thread_id = t["thread_id"]
            existing_quote = thread_to_quote.get(thread_id)
            nylas_date = t.get("latest_date") or 0

            # Check if we need to (re)extract
            needs_extraction = False
            if not existing_quote:
                needs_extraction = True
            else:
                db_last_msg_at = (existing_quote.sla_details or {}).get(
                    "last_message_at", 0
                )
                if nylas_date > db_last_msg_at:
                    print(
                        f"[quotes] Thread {thread_id} has new activity (Nylas={nylas_date}, DB={db_last_msg_at}). Re-extracting."
                    )
                    needs_extraction = True

            v_email = t["vendor_email"]
            v_name = name_by_email.get(v_email) or t["vendor_name"] or v_email

            if needs_extraction:
                # --- SELF-HEALING EXTRACTION ---
                # Fetch messages and extract attachments
                print(f"[quotes] Running on-demand extraction for thread: {thread_id}")
                messages = list_thread_messages(thread_id)
                if not messages:
                    if existing_quote:
                        result.append(_format_quote_resp(existing_quote, name_by_email))
                    continue

                # Filter: ONLY messages SENT by the vendor (not our platform)
                our_emails = {
                    settings.NYLAS_SENDER_EMAIL.lower(),
                    settings.SUPERUSER_EMAIL.lower(),
                }
                vendor_messages = []
                for m in messages:
                    # m["from"] is a list of dicts like [{"email": "...", "name": "..."}]
                    from_list = m.get("from", [])
                    if not from_list:
                        continue
                    sender_email = (from_list[0].get("email") or "").lower()
                    if sender_email not in our_emails:
                        vendor_messages.append(m)

                if not vendor_messages:
                    # No replies from vendor yet?
                    if existing_quote:
                        result.append(_format_quote_resp(existing_quote, name_by_email))
                    continue

                # Take the LATEST vendor message for metadata (last in ASC sorted list)
                latest_vendor_msg = vendor_messages[-1]

                # Combine bodies of all vendor messages for Bedrock context
                all_vendor_bodies = []
                for m in vendor_messages:
                    b = m.get("body", "")
                    if b:
                        all_vendor_bodies.append(b)
                combined_body_text = "\n\n--- Next Reply ---\n\n".join(
                    all_vendor_bodies
                )

                # Prepare attachments from ALL vendor messages
                new_attachments = []
                new_attachment_ids = []
                # If existing quote, we might want to skip IDs we already processed
                processed_ids = set(
                    (existing_quote.sla_details or {}).get(
                        "processed_attachment_ids", []
                    )
                    if existing_quote
                    else []
                )

                for vm in vendor_messages:
                    for att in vm.get("attachments", []):
                        att_id = att.get("id")
                        if att_id in processed_ids:
                            continue
                        try:
                            # Use the message_id corresponding to where the attachment is
                            content, c_type, fname = download_attachment_content(
                                att_id, vm.get("id")
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
                            # Ensure we don't process the same attachment twice in this loop
                            processed_ids.add(att_id)
                        except Exception as e:
                            print(
                                f"[quotes] Failed to download attachment {att_id}: {e}"
                            )

                # Parse with Bedrock
                parsed = parse_quotation_with_bedrock(
                    email_body=combined_body_text,
                    project_name=project.project_name if project else "Project",
                    attachments=new_attachments,
                )

                price = parsed.get("price")
                if price is not None:
                    # Upsert DB record
                    if not existing_quote:
                        vendor = (
                            db.query(Vendor)
                            .filter(Vendor.contact_email == v_email)
                            .first()
                        )
                        existing_quote = Quote(
                            id=str(uuid.uuid4()),
                            project_id=project_id,
                            vendor_id=vendor.id if vendor else None,
                            status="received",
                            created_at=datetime.utcnow(),
                        )
                        db.add(existing_quote)

                    # Update fields
                    existing_quote.price = float(price)
                    existing_quote.currency = parsed.get("currency", "INR")
                    existing_quote.delivery_timeline = parsed.get("delivery_timeline")
                    existing_quote.quality_standards = parsed.get("quality_standards")
                    existing_quote.warranty_terms = parsed.get("warranty_terms")
                    existing_quote.compliance_certifications = parsed.get(
                        "compliance_certifications"
                    )

                    # Merge SLA details
                    orig_sla = existing_quote.sla_details or {}
                    orig_processed = orig_sla.get("processed_attachment_ids", [])
                    # Union of processed IDs
                    updated_processed = list(
                        set(orig_processed) | set(new_attachment_ids)
                    )

                    existing_quote.sla_details = {
                        **orig_sla,
                        "notes": parsed.get("notes"),
                        "sender_email": v_email,
                        "sender_name": v_name,
                        "email_subject": t["subject"],
                        "thread_id": thread_id,
                        "message_id": latest_vendor_msg.get("id"),
                        "processed_attachment_ids": updated_processed,
                        "last_message_at": nylas_date,
                    }

                    db.commit()
                    db.refresh(existing_quote)
                    result.append(_format_quote_resp(existing_quote, name_by_email))
                else:
                    # No price found, if existing still return it, otherwise return placeholder
                    if existing_quote:
                        result.append(_format_quote_resp(existing_quote, name_by_email))
                    else:
                        created = (
                            datetime.utcfromtimestamp(t["latest_date"]).isoformat()
                            if t.get("latest_date")
                            else None
                        )
                        result.append(
                            {
                                "id": thread_id,
                                "project_id": project_id,
                                "vendor_name": v_name,
                                "sender_email": v_email,
                                "price": None,
                                "currency": "INR",
                                "status": "received",
                                "delivery_timeline": None,
                                "quality_standards": None,
                                "warranty_terms": None,
                                "compliance_certifications": None,
                                "notes": None,
                                "email_subject": t["subject"],
                                "thread_id": thread_id,
                                "message_id": None,
                                "created_at": created,
                            }
                        )
            else:
                # Existing and NO new activity, just format and return
                result.append(_format_quote_resp(existing_quote, name_by_email))

    except Exception as exc:
        print(f"[quotes] Nylas thread search/healing error: {exc}")
        import traceback

        traceback.print_exc()

    return result


def _format_quote_resp(q: Quote, name_by_email: dict) -> dict:
    """Helper to format a Quote model into a response dict."""
    sla = q.sla_details or {}
    sender_email = sla.get("sender_email", "")
    vendor_name = (
        name_by_email.get(sender_email) or sla.get("sender_name") or sender_email
    )
    return {
        "id": q.id,
        "project_id": q.project_id,
        "vendor_name": vendor_name,
        "sender_email": sender_email,
        "price": q.price,
        "currency": q.currency or "INR",
        "status": q.status,
        "delivery_timeline": q.delivery_timeline or sla.get("delivery_timeline"),
        "quality_standards": q.quality_standards,
        "warranty_terms": q.warranty_terms,
        "compliance_certifications": q.compliance_certifications,
        "notes": sla.get("notes"),
        "email_subject": sla.get("email_subject"),
        "thread_id": sla.get("thread_id"),
        "message_id": sla.get("message_id"),
        "created_at": q.created_at.isoformat() if q.created_at else None,
    }


@router.get("/by-project/{project_id}/recommendations")
async def get_project_ai_recommendations(
    project_id: str, refresh: bool = False, db: Session = Depends(get_db)
):
    """
    Generate and return AI recommendations for all vendors who submitted a quote for a given project.
    """
    try:
        recommendations = await generate_ai_recommendations(
            project_id, db, force_refresh=refresh
        )
        return recommendations
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/score")
async def review_and_score_quotes(request: QuoteScoreRequest):
    """
    Takes a list of vendor quotes and scores them based on Price, SLAs, and Risk.
    """
    scored_quotes = await score_quotes(request.quotes)
    return {"status": "success", "scored_quotes": scored_quotes}


@router.post("/negotiate/email")
async def create_negotiation_email(request: NegotiationEmailRequest):
    """
    Generates a negotiation email using Generative AI.
    """
    # In a real system, we'd fetch the vendor and quote details from the DB here
    # Mocking data for generation
    mock_vendor_name = "Mock Vendor " + request.quote_id
    mock_quote_price = 100000.0

    email_body = await generate_negotiation_email(
        vendor_name=mock_vendor_name,
        quote_price=mock_quote_price,
        target_discount=request.target_reduction_percentage,
        context=request.context,
    )

    # Log activity
    db = next(get_db())
    log_activity(
        db,
        type="negotiation_started",
        title=f"Negotiation started",
        description=f"Drafted negotiation email for quote {request.quote_id}",
    )

    return {"status": "success", "email_body": email_body}


@router.post("/negotiation-insights")
async def get_negotiation_insights(
    thread_id: str = "",
    vendor_name: str = "",
    vendor_email: str = "",
    project_id: str = "",
):
    """
    Analyze a negotiation email thread and return AI-extracted insights:
    price, delivery timeline, key terms, vendor sentiment, and summary.
    """
    if not thread_id:
        raise HTTPException(status_code=400, detail="thread_id is required")

    insights = await generate_negotiation_insights(
        thread_id=thread_id,
        vendor_name=vendor_name,
        vendor_email=vendor_email,
        project_id=project_id,
    )
    return insights


class DealClosureExtractRequest(BaseModel):
    project_id: str
    vendor_email: str
    thread_id: str = ""
    vendor_name: str = ""


@router.post("/deal-closure-extract")
async def extract_deal_closure(
    request: DealClosureExtractRequest,
    db: Session = Depends(get_db),
):
    """
    Use Nova to extract final deal terms from negotiation and quotation emails.
    Returns structured data to pre-populate the Closure Phase.
    """
    data = await generate_deal_closure_extract(
        project_id=request.project_id,
        vendor_email=request.vendor_email,
        thread_id=request.thread_id,
        vendor_name=request.vendor_name,
        db=db,
    )
    return data
