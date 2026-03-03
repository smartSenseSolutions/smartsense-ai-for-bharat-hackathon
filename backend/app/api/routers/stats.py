from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Vendor, Project

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
