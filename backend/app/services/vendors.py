import boto3
from app.core.config import settings
from app.services.rfp import get_bedrock_client
import json


def get_textract_client():
    return boto3.client(
        service_name="textract",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


async def verify_vendor_certification(document_bytes: bytes, cert_type: str) -> dict:
    """
    Use AWS Textract combined with Bedrock to verify if a certification is valid and unexpired.
    """
    try:
        textract = get_textract_client()
        response = textract.detect_document_text(Document={"Bytes": document_bytes})

        extracted_text = " ".join(
            [item["Text"] for item in response["Blocks"] if item["BlockType"] == "LINE"]
        )

        # Pass the extracted text to Bedrock for semantic validation
        bedrock = get_bedrock_client()
        prompt = f"""
        Analyze the following extracted text from a vendor certification document.
        Target Certification Type expected: {cert_type}
        
        Extracted Text:
        {extracted_text}
        
        Is this document a valid {cert_type} certification? Does it appear to be expired? 
        Return strictly a JSON object: {{"is_valid": true/false, "expiration_date": "YYYY-MM-DD or null", "reason": "short explanation"}}
        """

        body = json.dumps(
            {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "messages": [{"role": "user", "content": prompt}],
            }
        )

        br_response = bedrock.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        content = (
            json.loads(br_response.get("body").read())
            .get("content", [])[0]
            .get("text", "{}")
        )
        return json.loads(content)

    except Exception as e:
        print(f"Error verifying cert: {e}")
        return {
            "is_valid": False,
            "expiration_date": None,
            "reason": "Error processing document.",
        }
