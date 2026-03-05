from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.domain import ProjectInvitedVendor, Quote
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
)
from app.services.activity import log_activity

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
    known_thread_ids: set[str] = set()

    # ── 1. DB-backed quotes (webhook-parsed, have price/delivery) ──────────
    db_quotes = (
        db.query(Quote)
        .filter(Quote.project_id == project_id)
        .order_by(Quote.created_at.desc())
        .all()
    )
    for q in db_quotes:
        sla = q.sla_details or {}
        sender_email = sla.get("sender_email", "")
        vendor_name = (
            name_by_email.get(sender_email) or sla.get("sender_name") or sender_email
        )
        thread_id = sla.get("thread_id")
        if thread_id:
            known_thread_ids.add(thread_id)
        result.append(
            {
                "id": q.id,
                "project_id": q.project_id,
                "vendor_name": vendor_name,
                "sender_email": sender_email,
                "price": q.price,
                "currency": q.currency or "INR",
                "status": q.status,
                "delivery_timeline": sla.get("delivery_timeline"),
                "notes": sla.get("notes"),
                "email_subject": sla.get("email_subject"),
                "thread_id": thread_id,
                "message_id": sla.get("message_id"),
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
        )

    # ── 2. Live Nylas search — threads not yet in DB ───────────────────────
    try:
        nylas_threads = search_rfp_threads_nylas(project_id, invited_emails)
        for t in nylas_threads:
            if t["thread_id"] in known_thread_ids:
                continue  # already represented by a DB quote
            v_email = t["vendor_email"]
            v_name = name_by_email.get(v_email) or t["vendor_name"] or v_email
            created = (
                datetime.utcfromtimestamp(t["latest_date"]).isoformat()
                if t.get("latest_date")
                else None
            )
            result.append(
                {
                    "id": t["thread_id"],
                    "project_id": project_id,
                    "vendor_name": v_name,
                    "sender_email": v_email,
                    "price": None,
                    "currency": "INR",
                    "status": "received",
                    "delivery_timeline": None,
                    "notes": None,
                    "email_subject": t["subject"],
                    "thread_id": t["thread_id"],
                    "message_id": None,
                    "created_at": created,
                }
            )
    except Exception as exc:
        print(f"[quotes] Nylas thread search error: {exc}")

    return result


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
