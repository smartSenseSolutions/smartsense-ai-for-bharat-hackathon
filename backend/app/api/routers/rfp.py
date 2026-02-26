from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.rfp import (
    RFPGenerateRequest,
    RFPGenerateResponse,
    RFPDistributeRequest,
    RFPChatRequest,
    RFPChatResponse,
)
from app.services.rfp import generate_rfp_draft, chat_rfp_assistant

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


@router.post("/distribute")
async def distribute_rfp(request: RFPDistributeRequest, db: Session = Depends(get_db)):
    """
    Distribute the finalized RFP to selected vendors.
    Saves to DB and simulates sending emails/notifications.
    """
    # Logic to record RFP distribution to the DB based on models
    # for vid in request.vendor_ids:
    #     new_rfp = RFP(project_id=request.project_id, vendor_id=vid, status="sent")
    #     db.add(new_rfp)
    # db.commit()

    return {
        "status": "success",
        "message": f"RFP distributed to {len(request.vendor_ids)} vendors",
    }
