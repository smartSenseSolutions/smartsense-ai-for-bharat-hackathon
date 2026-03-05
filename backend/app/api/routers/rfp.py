from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.core.database import get_db
from app.models.domain import Project, ProjectInvitedVendor
from app.schemas.rfp import (
    RFPGenerateRequest,
    RFPGenerateResponse,
    RFPDistributeRequest,
    RFPChatRequest,
    RFPChatResponse,
    RFPPublishRequest,
    RFPPublishResponse,
)
from app.services.rfp import generate_rfp_draft, chat_rfp_assistant, publish_rfp_to_s3
from app.services.email import download_rfp_pdf_from_s3, send_bulk_rfp_emails

router = APIRouter(prefix="/api/rfp", tags=["RFP Management"])


@router.post("/generate", response_model=RFPGenerateResponse)
async def generate_rfp(request: RFPGenerateRequest):
    """
    Generate an AI-assisted RFP draft using Bedrock.
    """
    draft = await generate_rfp_draft(
        project_name=request.project_name,
        requirements=request.requirements,
        language=request.language,
    )

    return RFPGenerateResponse(**draft)


@router.post("/chat", response_model=RFPChatResponse)
async def rfp_chat(request: RFPChatRequest):
    """
    Conversational RFP creation powered by Amazon Nova Lite.

    Send the full message history on every turn. The AI collects:
    product, quantity, delivery timeline, and budget — then returns a
    complete rfp_data object with is_complete=true.
    """
    result = await chat_rfp_assistant(
        project_name=request.project_name,
        messages=[m.model_dump() for m in request.messages],
    )
    return result


@router.post("/publish", response_model=RFPPublishResponse)
async def publish_rfp(request: RFPPublishRequest, db: Session = Depends(get_db)):
    """
    Generate a PDF of the RFP and upload it to S3.
    File stored as {project_id}.pdf in the S3_RFP_BUCKET bucket.
    Returns the public S3 URL and S3 key.
    """
    try:
        # Sync dates from DB source of truth
        project = db.query(Project).filter(Project.id == request.project_id).first()
        if project:
            if project.rfp_expiry:
                request.rfp_data["rfpDeadline"] = project.rfp_expiry
            if project.delivery_timeline:
                request.rfp_data["deliveryTimeline"] = project.delivery_timeline.strftime(
                    "%d-%m-%Y"
                )

        result = publish_rfp_to_s3(
            project_id=request.project_id,
            project_name=request.project_name,
            rfp_data=request.rfp_data,
            company_logo_url=request.company_logo_url,
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish RFP: {e}")


@router.post("/distribute")
async def distribute_rfp(request: RFPDistributeRequest, db: Session = Depends(get_db)):
    """
    Distribute the finalized RFP to selected vendors via email.
    Downloads the RFP PDF from S3 and sends it as an attachment
    to each vendor using Nylas.
    If the PDF doesn't exist in S3 yet, generates and uploads it first.
    """
    # 1. Try to download the RFP PDF from S3
    pdf_bytes = None
    try:
        pdf_bytes = download_rfp_pdf_from_s3(request.project_id)
    except Exception:
        # PDF not in S3 yet — generate and upload it if we have rfp_data
        if request.rfp_data:
            try:
                publish_rfp_to_s3(
                    project_id=request.project_id,
                    project_name=request.project_name,
                    rfp_data=request.rfp_data,
                )
                pdf_bytes = download_rfp_pdf_from_s3(request.project_id)
            except Exception as gen_err:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to generate RFP PDF: {gen_err}",
                )
        else:
            raise HTTPException(
                status_code=404,
                detail="RFP PDF not found in S3 and no rfp_data provided to generate it.",
            )

    # 2. Sync dates from DB source of truth if rfp_data is present
    if request.rfp_data:
        project = db.query(Project).filter(Project.id == request.project_id).first()
        if project:
            if project.rfp_expiry:
                request.rfp_data["rfpDeadline"] = project.rfp_expiry
            if project.delivery_timeline:
                request.rfp_data["deliveryTimeline"] = project.delivery_timeline.strftime(
                    "%d-%m-%Y"
                )

    # 3. Send emails to all vendors with the PDF attached
    attachment_name = f"RFP-{request.project_id}.pdf"
    vendors_dicts = [v.model_dump() for v in request.vendors]

    results = send_bulk_rfp_emails(
        project_id=request.project_id,
        project_name=request.project_name,
        rfp_data=request.rfp_data or {},
        vendors=vendors_dicts,
        attachment_bytes=pdf_bytes,
        attachment_name=attachment_name,
    )

    sent_count = sum(1 for r in results if r["success"])
    failed_count = len(results) - sent_count

    # Persist invited vendors for successfully sent emails.
    # Skip vendors already recorded for this project (idempotent on re-invite).
    existing_names = {
        row.vendor_name
        for row in db.query(ProjectInvitedVendor.vendor_name)
        .filter(ProjectInvitedVendor.project_id == request.project_id)
        .all()
    }
    vendor_map = {v.name: v for v in request.vendors}
    now = datetime.utcnow()
    for result in results:
        if not result["success"]:
            continue
        vendor_name = result["vendor_name"]
        if vendor_name in existing_names:
            continue
        v = vendor_map.get(vendor_name)
        db.add(
            ProjectInvitedVendor(
                id=str(uuid.uuid4()),
                project_id=request.project_id,
                vendor_id=v.id if v else None,
                vendor_name=vendor_name,
                contact_email=v.contact_email if v else None,
                products=v.products if v else None,
                invited_at=now,
            )
        )
    db.commit()

    return {
        "status": "success" if failed_count == 0 else "partial",
        "message": f"Emails sent to {sent_count}/{len(results)} vendor(s)",
        "results": results,
    }
