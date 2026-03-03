from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.domain import Activity

router = APIRouter(prefix="/api/activities", tags=["Activities"])

@router.get("", response_model=List[dict])
def get_recent_activities(db: Session = Depends(get_db)):
    """Retrieve 10 latest activities sorted by latest to oldest."""
    activities = (
        db.query(Activity)
        .order_by(Activity.created_at.desc())
        .limit(10)
        .all()
    )
    
    result = []
    for activity in activities:
        result.append({
            "id": activity.id,
            "type": activity.type,
            "title": activity.title,
            "description": activity.description,
            "project_id": activity.project_id,
            "vendor_id": activity.vendor_id,
            "is_new": activity.is_new,
            "created_at": activity.created_at.isoformat()
        })
    
    return result
