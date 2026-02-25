import boto3
import json
from app.core.config import settings


def get_bedrock_client():
    return boto3.client(
        service_name="bedrock-runtime",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


async def generate_rfp_draft(
    project_name: str, requirements: str, language: str = "English"
) -> dict:
    """
    Use AWS Bedrock Claude 3 to generate a structured RFP draft.
    """
    bedrock = get_bedrock_client()

    prompt = f"""
    You are an expert Procurement Officer AI. Generate a structured Request for Proposal (RFP) draft based on the following:
    
    Project Name: {project_name}
    Key Requirements: {requirements}
    Language: {language}
    
    Please return the result strictly as a JSON object with the following structure:
    {{
       "title": "...",
       "overview": "...",
       "scope_of_work": ["item 1", "item 2"],
       "timeline": "...",
       "evaluation_criteria": ["criteria 1", "criteria 2"]
    }}
    Do not output any markdown code blocks, only raw JSON.
    """

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [{"role": "user", "content": prompt}],
        }
    )

    try:
        # Assuming Claude 3 Haiku for speed, but can be Sonnet/Opus
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        response_body = json.loads(response.get("body").read())
        content = response_body.get("content", [])[0].get("text", "{}")

        # Parse output
        return json.loads(content)

    except Exception as e:
        print(f"Error generating RFP with Bedrock: {e}")
        # Fallback fake response if Bedrock isn't configured for hackathon demo
        return {
            "title": f"RFP: {project_name}",
            "overview": f"Generating procurement requirements for {project_name}",
            "scope_of_work": [
                "Standard supply delivery",
                "Quality assurance",
                "SLA compliance",
            ],
            "timeline": "30 Days",
            "evaluation_criteria": ["Price", "Delivery Speed", "Prior Experience"],
        }
