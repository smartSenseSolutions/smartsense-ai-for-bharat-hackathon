import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.domain import Activity

def log_activity(
    db: Session,
    type: str,
    title: str,
    description: str = None,
    project_id: str = None,
    vendor_id: str = None,
    is_new: bool = True
):
    """
    Log a system activity to the database.
    Types: rfp_created, rfp_draft, rfp_published, quote_received, vendor_uploaded, ai_recommendation, negotiation_started, rfp_closed, vendor_search
    """
    activity = Activity(
        id=str(uuid.uuid4()),
        type=type,
        title=title,
        description=description,
        project_id=project_id,
        vendor_id=vendor_id,
        is_new=is_new,
        created_at=datetime.utcnow()
    )
    db.add(activity)
    db.commit()
    return activity
