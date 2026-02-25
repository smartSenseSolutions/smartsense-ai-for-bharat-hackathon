from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import Optional
import base64
from app.services.vendors import verify_vendor_certification
from app.services.rfp import get_bedrock_client
import json

router = APIRouter(prefix="/api/vendors", tags=["Vendors"])


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
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
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
