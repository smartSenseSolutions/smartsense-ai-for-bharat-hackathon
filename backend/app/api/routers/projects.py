from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import re
from datetime import datetime

from app.core.database import get_db
from app.models.domain import Project, ProjectStatus, ProjectInvitedVendor
from app.schemas.domain import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectInvitedVendorResponse,
)

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def _parse_to_dd_mm_yyyy(date_str: Optional[str]) -> Optional[str]:
    """Try to parse a date string in various formats and return dd-mm-yyyy.

    Supports: dd-mm-yyyy (passthrough), yyyy-mm-dd, mm/dd/yyyy, dd/mm/yyyy,
    and natural-language dates like 'March 15, 2026' or '15 March 2026'.
    Returns None if parsing fails.
    """
    if not date_str or not date_str.strip():
        return None
    date_str = date_str.strip()

    # Already in dd-mm-yyyy
    if re.match(r"^\d{2}-\d{2}-\d{4}$", date_str):
        return date_str

    # Try common formats
    for fmt in (
        "%Y-%m-%d",  # 2026-03-15
        "%m/%d/%Y",  # 03/15/2026
        "%d/%m/%Y",  # 15/03/2026
        "%B %d, %Y",  # March 15, 2026
        "%b %d, %Y",  # Mar 15, 2026
        "%d %B %Y",  # 15 March 2026
        "%d %b %Y",  # 15 Mar 2026
        "%d-%m-%Y",  # 15-03-2026 (already matched above, but just in case)
    ):
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%d-%m-%Y")
        except ValueError:
            continue

    return date_str  # Return as-is if we can't parse it


def _resolve_rfp_expiry(
    explicit_expiry: Optional[str], rfp_data: Optional[dict]
) -> Optional[str]:
    """Return the rfp_expiry value, preferring the explicit parameter,
    falling back to rfp_data.rfpDeadline."""
    if explicit_expiry:
        return _parse_to_dd_mm_yyyy(explicit_expiry)
    if rfp_data and isinstance(rfp_data, dict):
        deadline = rfp_data.get("rfpDeadline")
        if deadline:
            return _parse_to_dd_mm_yyyy(deadline)
    return None


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    rfp_expiry = _resolve_rfp_expiry(project.rfp_expiry, project.rfp_data)
    db_project = Project(
        id=str(uuid.uuid4()),
        project_name=project.project_name,
        status=ProjectStatus(project.status),
        rfp_data=project.rfp_data,
        rfp_expiry=rfp_expiry,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
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
def update_project(
    project_id: str, project_update: ProjectUpdate, db: Session = Depends(get_db)
):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_update.model_dump(exclude_unset=True)

    # Auto-resolve rfp_expiry from rfp_data.rfpDeadline when not explicitly provided
    if "rfp_expiry" not in update_data and "rfp_data" in update_data:
        resolved = _resolve_rfp_expiry(None, update_data["rfp_data"])
        if resolved:
            update_data["rfp_expiry"] = resolved

    for key, value in update_data.items():
        if key == "status":
            setattr(db_project, key, ProjectStatus(value))
        else:
            setattr(db_project, key, value)

    db.commit()
    db.refresh(db_project)
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
