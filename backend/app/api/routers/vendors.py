from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import json

from app.core.database import get_db
from app.core.config import settings
from app.schemas.vendors import VendorCreate, VendorOut, BulkUploadResult
from app.services.vendors import (
    verify_vendor_certification,
    bulk_create_vendors,
    create_vendor,
    list_vendors,
    get_vendor,
    get_csv_template,
)
from app.services.rfp import get_bedrock_client

router = APIRouter(prefix="/api/vendors", tags=["Vendors"])


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


@router.post("", response_model=VendorOut, status_code=201)
def create_vendor_endpoint(payload: VendorCreate, db: Session = Depends(get_db)):
    """Create a single vendor."""
    return create_vendor(db, payload.model_dump())


@router.get("", response_model=List[VendorOut])
def list_vendors_endpoint(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """List all vendors with optional pagination."""
    return list_vendors(db, skip=skip, limit=limit)


@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor_endpoint(vendor_id: str, db: Session = Depends(get_db)):
    """Fetch a single vendor by ID."""
    vendor = get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


# ---------------------------------------------------------------------------
# CSV bulk upload
# ---------------------------------------------------------------------------


@router.get("/bulk-upload/template")
def download_csv_template():
    """Download a CSV template for bulk vendor onboarding."""
    content = get_csv_template()
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=vendor_bulk_upload_template.csv"
        },
    )


@router.post("/bulk-upload", response_model=BulkUploadResult)
async def bulk_upload_vendors(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    """
    Upload a CSV file to bulk-onboard vendors.

    Expected columns: vendor_name, location, estd, mobile, email,
    certificates (semicolon-separated), products (semicolon-separated), website.

    Download the template from GET /api/vendors/bulk-upload/template.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")

    contents = await file.read()
    result = await bulk_create_vendors(db, contents)
    return result


# ---------------------------------------------------------------------------
# AI features
# ---------------------------------------------------------------------------


@router.post("/verify-certification")
async def verify_certification(
    vendor_id: str = Form(...), cert_type: str = Form(...), file: UploadFile = File(...)
):
    """
    Upload a vendor certificate (PDF/Image) to be verified by AWS Textract & Bedrock.
    """
    contents = await file.read()

    result = await verify_vendor_certification(
        document_bytes=contents, cert_type=cert_type
    )

    return {"status": "success", "vendor_id": vendor_id, "verification_result": result}


@router.post("/qa/answer")
async def answer_vendor_question(question: str):
    """
    Centralized Vendor Q&A: AI generates a suggested answer for a vendor's query.
    Human-in-the-loop will review this before sending.
    """
    bedrock = get_bedrock_client()
    prompt = f"""
    You are an AI Procurement Assistant. A vendor has asked the following question regarding an ongoing RFP:
    "{question}"

    Provide a professional, concise, and helpful suggested response.
    """

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 500,
            "messages": [{"role": "user", "content": prompt}],
        }
    )

    try:
        response = bedrock.invoke_model(
            modelId=settings.BEDROCK_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        content = (
            json.loads(response.get("body").read())
            .get("content", [])[0]
            .get("text", "")
        )
        return {"suggested_answer": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
