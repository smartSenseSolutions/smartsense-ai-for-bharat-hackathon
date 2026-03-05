from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import re
from datetime import datetime
from app.core.config import settings
from app.core.database import get_db
from app.models.domain import Project, ProjectStatus, ProjectInvitedVendor
from app.services.activity import log_activity
from app.schemas.domain import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectInvitedVendorResponse,
)

router = APIRouter(prefix="/api/projects", tags=["Projects"])


async def _parse_to_dd_mm_yyyy_ai(date_str: Optional[str]) -> Optional[str]:
    """Try to parse a date string using AI to handle complex natural language formats."""
    if not date_str or not date_str.strip():
        return None

    date_str = date_str.strip()

    # Try basic regex formats first to save LLM calls
    if re.match(r"^\d{2}-\d{2}-\d{4}$", date_str):
        return date_str

    for fmt in (
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
    ):
        try:
            return datetime.strptime(date_str, fmt).strftime("%d-%m-%Y")
        except ValueError:
            continue

    # Use LLM for complex stuff ("in 30 days", "6 weeks from now", etc)
    from langchain_aws import ChatBedrockConverse
    from pydantic import BaseModel, Field

    class DateResponse(BaseModel):
        formatted_date: Optional[str] = Field(
            description="The date formatted as dd-mm-yyyy. Use null if it cannot be determined."
        )

    try:
        model_id = settings.BEDROCK_NOVA_MODEL_ID or "us.amazon.nova-2-lite-v1:0"
        llm = ChatBedrockConverse(
            model=model_id,
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            temperature=0,
        )
        structured_llm = llm.with_structured_output(schema=DateResponse)

        # We need a reference date for relative times
        now = datetime.now()
        prompt = f"""You need to convert a natural language date string into the format 'dd-mm-yyyy'.
        
Current Date: {now.strftime("%B %d, %Y")}

User Input: "{date_str}"

Rules:
1. Return ONLY the date in exactly 'dd-mm-yyyy' format.
2. If given a relative time frame like 'in 30 days' or 'next month', calculate the exact date from the Current Date.
3. If given '1 year from now' or 'in 2 years', calculate the date by adding the corresponding years to the Current Date.
4. Handle 'weeks', 'months', and 'years' precisely based on the Current Date.
5. If it's completely impossible to determine any date, return null.
"""
        import asyncio

        result = await asyncio.to_thread(structured_llm.invoke, prompt)
        return result.formatted_date
    except Exception as e:
        print(f"Failed to parse date with AI: {e}")
        return date_str  # Fallback


async def _resolve_date_fields(
    explicit_expiry: Optional[str], rfp_data: Optional[dict]
) -> tuple[Optional[str], Optional[datetime], Optional[datetime]]:
    """Return the rfp_expiry (dd-mm-yyyy), rfp_deadline (datetime), and delivery_timeline (datetime)."""
    rfp_expiry_str = None
    rfp_deadline_dt = None
    delivery_timeline_dt = None

    # 1. Resolve RFP Expiry / Deadline
    if explicit_expiry:
        rfp_expiry_str = await _parse_to_dd_mm_yyyy_ai(explicit_expiry)

    if not rfp_expiry_str and rfp_data and isinstance(rfp_data, dict):
        deadline = rfp_data.get("rfpDeadline")
        if deadline:
            rfp_expiry_str = await _parse_to_dd_mm_yyyy_ai(deadline)

    if rfp_expiry_str:
        try:
            rfp_deadline_dt = datetime.strptime(rfp_expiry_str, "%d-%m-%Y")
        except ValueError:
            pass

    # 2. Resolve Delivery Timeline
    if rfp_data and isinstance(rfp_data, dict):
        timeline = rfp_data.get("deliveryTimeline")
        if timeline:
            timeline_str = await _parse_to_dd_mm_yyyy_ai(timeline)
            if timeline_str:
                try:
                    delivery_timeline_dt = datetime.strptime(timeline_str, "%d-%m-%Y")
                except ValueError:
                    pass

    return rfp_expiry_str, rfp_deadline_dt, delivery_timeline_dt


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    rfp_expiry, rfp_deadline_dt, delivery_timeline_dt = await _resolve_date_fields(
        project.rfp_expiry, project.rfp_data
    )

    # Also extract and store search intent using Nova
    from app.services.search import decompose_rfp_to_intent

    search_intent_json = None
    if project.rfp_data:
        try:
            intent_obj = await decompose_rfp_to_intent(project.rfp_data)
            search_intent_json = intent_obj.model_dump()
        except Exception as e:
            print(f"Failed to decompose search intent: {e}")

    # Write dates and email back into rfp_data for PDF rendering and consistency
    if project.rfp_data:
        if rfp_expiry:
            project.rfp_data["rfpDeadline"] = rfp_expiry
        if delivery_timeline_dt:
            project.rfp_data["deliveryTimeline"] = delivery_timeline_dt.strftime(
                "%d-%m-%Y"
            )

    db_project = Project(
        id=str(uuid.uuid4()),
        project_name=project.project_name,
        status=ProjectStatus(project.status),
        rfp_data=project.rfp_data,
        rfp_expiry=rfp_expiry,
        rfp_deadline=rfp_deadline_dt,
        delivery_timeline=delivery_timeline_dt,
        search_intent=search_intent_json,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    # Log activity
    status_type = (
        "rfp_draft" if db_project.status == ProjectStatus.DRAFT else "rfp_created"
    )
    log_activity(
        db,
        type=status_type,
        title=f"New RFP Project created: {db_project.project_name}",
        description=f"Project status: {db_project.status.value}",
        project_id=db_project.id,
    )

    return db_project


@router.get("", response_model=List[ProjectResponse])
def get_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .order_by(Project.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_update.model_dump(exclude_unset=True)

    # Re-resolve dates and intent if rfp_data changed
    if "rfp_data" in update_data:
        rfp_expiry, rfp_deadline_dt, delivery_timeline_dt = await _resolve_date_fields(
            update_data.get("rfp_expiry"), update_data["rfp_data"]
        )
        if rfp_expiry:
            update_data["rfp_expiry"] = rfp_expiry
        if rfp_deadline_dt:
            update_data["rfp_deadline"] = rfp_deadline_dt
        if delivery_timeline_dt:
            update_data["delivery_timeline"] = delivery_timeline_dt

        from app.services.search import decompose_rfp_to_intent

        try:
            intent_obj = await decompose_rfp_to_intent(update_data["rfp_data"])
            update_data["search_intent"] = intent_obj.model_dump()
        except Exception as e:
            print(f"Failed to decompose search intent on update: {e}")

    # Write dates and email back into rfp_data for PDF rendering and consistency
    if "rfp_data" in update_data and update_data["rfp_data"]:
        data = update_data["rfp_data"]
        if "rfp_expiry" in update_data and update_data["rfp_expiry"]:
            data["rfpDeadline"] = update_data["rfp_expiry"]
        if "delivery_timeline" in update_data and update_data["delivery_timeline"]:
            data["deliveryTimeline"] = update_data["delivery_timeline"].strftime(
                "%d-%m-%Y"
            )
        update_data["rfp_data"] = data

    elif "rfp_expiry" in update_data and update_data["rfp_expiry"]:
        rfp_expiry, rfp_deadline_dt, _ = await _resolve_date_fields(
            update_data["rfp_expiry"], db_project.rfp_data
        )
        update_data["rfp_expiry"] = rfp_expiry
        if rfp_deadline_dt:
            update_data["rfp_deadline"] = rfp_deadline_dt

    old_status = db_project.status
    for key, value in update_data.items():
        if key == "status":
            setattr(db_project, key, ProjectStatus(value))
        else:
            setattr(db_project, key, value)

    db.commit()
    db.refresh(db_project)

    # Log activity for status changes
    if "status" in update_data and old_status != db_project.status:
        if db_project.status == ProjectStatus.COMPLETED:
            log_activity(
                db,
                type="rfp_closed",
                title=f"RFP Project Closed: {db_project.project_name}",
                project_id=db_project.id,
            )
        elif db_project.status == ProjectStatus.PUBLISHED:
            log_activity(
                db,
                type="rfp_published",
                title=f"RFP Published: {db_project.project_name}",
                project_id=db_project.id,
            )

    return db_project


@router.get(
    "/{project_id}/invited-vendors", response_model=List[ProjectInvitedVendorResponse]
)
def get_invited_vendors(project_id: str, db: Session = Depends(get_db)):
    """Return all vendors invited to a project, ordered by invitation time."""
    return (
        db.query(ProjectInvitedVendor)
        .filter(ProjectInvitedVendor.project_id == project_id)
        .order_by(ProjectInvitedVendor.invited_at)
        .all()
    )
