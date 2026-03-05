from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Vendor, Project, ProjectStatus

router = APIRouter(prefix="/api/stats", tags=["Statistics"])

@router.get("/marketplace")
def get_marketplace_stats(db: Session = Depends(get_db)):
    try:
        vendors_count = db.query(Vendor).count()
        projects_count = db.query(Project).count()
        
        # Simple heuristic to count unique product categories across all vendors
        all_products_lists = db.query(Vendor.products).all()
        categories = set()
        for row in all_products_lists:
            res = row[0]
            if not res:
                continue
            
            if isinstance(res, list):
                # Ensure all items in the list are strings and filter out empty ones
                categories.update(str(p).strip() for p in res if p)
            elif isinstance(res, str):
                try:
                    import json
                    parsed = json.loads(res)
                    if isinstance(parsed, list):
                        categories.update(str(p).strip() for p in parsed if p)
                    else:
                        categories.add(res.strip())
                except:
                    # If it's just a plain string or comma-separated
                    if ',' in res:
                        categories.update(p.strip() for p in res.split(',') if p.strip())
                    else:
                        categories.add(res.strip())
                
        return {
            "verified_vendors_count": int(vendors_count or 0),
            "product_categories_count": int(len(categories) or 0),
            "total_projects_count": int(projects_count or 0)
        }
    except Exception as e:
        print(f"[stats] Error fetching marketplace stats: {e}")
        return {
            "verified_vendors_count": 0,
            "product_categories_count": 0,
            "total_projects_count": 0,
            "error": str(e)
        }


@router.get("/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Retrieve real-time stats for the dashboard:
    1. Active RFPs (not in closure/draft stage)
    2. Total savings (fixed to 0 for now)
    3. Active vendors (real count from DB)
    4. Top 4 performing RFPs (recent active projects)
    """
    try:
        # 0. Total RFPs (All Projects)
        total_rfps_count = db.query(Project).count()

        # 1. Active RFPs (Strictly IN_PROGRESS)
        active_rfps_count = db.query(Project).filter(
            Project.status == "in-progress"
        ).count()

        # 2. Total Savings (Fixed to 0 for now)
        total_savings = 0

        # 3. Active Vendors
        active_vendors_count = db.query(Vendor).count()

        # 4. Active RFPs (Top 4 recent projects, IN_PROGRESS only)
        top_rfps = (
            db.query(Project)
            .filter(Project.status == "in-progress")
            .order_by(Project.created_at.desc())
            .limit(4)
            .all()
        )

        top_rfps_data = []
        for p in top_rfps:
            top_rfps_data.append({
                "id": p.id,
                "project_name": p.project_name,
                "status": p.status.value if hasattr(p.status, "value") else p.status,
                "created_at": p.created_at.isoformat()
            })

        return {
            "active_rfps_count": active_rfps_count,
            "total_rfps_count": total_rfps_count,
            "total_savings": total_savings,
            "active_vendors_count": active_vendors_count,
            "top_rfps": top_rfps_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[stats] Error fetching dashboard stats: {e}")
        return {
            "active_rfps_count": 0,
            "total_savings": 0,
            "active_vendors_count": 0,
            "top_rfps": [],
            "error": str(e)
        }
