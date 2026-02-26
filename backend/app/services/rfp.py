import boto3
import json
import re
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
            modelId=settings.BEDROCK_MODEL_ID,
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


# ---------------------------------------------------------------------------
# Conversational RFP chat — Amazon Nova Lite via Bedrock Converse API
# ---------------------------------------------------------------------------

_CHAT_SYSTEM_PROMPT = """You are an expert AI Procurement Officer helping users create a Request for Proposal (RFP).

TASK: Collect 4 required details through a short, friendly conversation, then produce a structured RFP data object.

REQUIRED FIELDS:
1. product     — product or service name (with description if provided)
2. quantity    — numeric quantity with unit, e.g. "500 units", "10,000 pairs"
3. delivery_timeline — delivery timeframe, e.g. "30 days", "6 weeks", "3 months"
4. budget      — budget amount with currency, e.g. "₹5,00,000", "$10,000", "₹2L–₹5L"

RESPONSE FORMAT — always respond with valid JSON only. No prose outside the JSON.

When information is still missing:
{"reply": "<your conversational message>", "is_complete": false, "rfp_data": null}

When all 4 fields are collected:
{
  "reply": "I have all the details needed. Generating your RFP now!",
  "is_complete": true,
  "rfp_data": {
    "productName": "<full product name>",
    "quantity": "<quantity with unit>",
    "deliveryTimeline": "<timeline>",
    "budget": "<budget with currency>",
    "specifications": ["<spec1>", "<spec2>", "<spec3>", "<spec4>", "<spec5>"],
    "qualityStandards": ["<standard1>", "<standard2>", "<standard3>"]
  }
}

GUIDELINES:
- Be concise. Ask for the single most critical missing field first.
- Generate relevant technical specifications and quality/compliance standards based on the product type.
- Never output anything outside the JSON structure."""


async def chat_rfp_assistant(project_name: str, messages: list[dict]) -> dict:
    """
    Multi-turn conversational RFP creation using Amazon Nova Lite.

    `messages` is a list of {"role": "user"|"assistant", "content": "..."}.
    Returns {"reply": str, "is_complete": bool, "rfp_data": dict | None}.
    """
    # Nova Lite converse API requires messages to alternate user/assistant
    # and must start with a user message — drop any leading assistant turns.
    filtered = []
    for msg in messages:
        if not filtered and msg["role"] == "assistant":
            continue
        filtered.append({"role": msg["role"], "content": [{"text": msg["content"]}]})

    if not filtered:
        return {
            "reply": "Hi! I'm here to help you create an RFP. What product or service do you need to procure?",
            "is_complete": False,
            "rfp_data": None,
        }

    bedrock = get_bedrock_client()

    try:
        response = bedrock.converse(
            modelId=settings.BEDROCK_NOVA_MODEL_ID,
            system=[{"text": _CHAT_SYSTEM_PROMPT}],
            messages=filtered,
            inferenceConfig={"maxTokens": 1024, "temperature": 0.7},
        )
        raw_text = response["output"]["message"]["content"][0]["text"].strip()

        # The model should return JSON; strip markdown fences if present
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        parsed = json.loads(raw_text)
        return {
            "reply": parsed.get("reply", ""),
            "is_complete": bool(parsed.get("is_complete", False)),
            "rfp_data": parsed.get("rfp_data"),
        }

    except Exception as exc:
        print(f"Nova Lite chat error: {exc}")
        # Graceful fallback so the UI doesn't break
        return {
            "reply": (
                "I'm having trouble connecting to the AI right now. "
                "Please tell me: what product do you need, the quantity, "
                "delivery timeline, and your budget?"
            ),
            "is_complete": False,
            "rfp_data": None,
        }
