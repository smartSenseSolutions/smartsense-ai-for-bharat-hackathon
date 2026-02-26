import boto3
from langchain_aws import ChatBedrockConverse
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.core.config import settings
from app.schemas.rfp import RFPGenerateResponse, RFPChatResponse


def get_bedrock_client():
    return boto3.client(
        service_name="bedrock-runtime",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def get_llm(model_id: str):
    """
    Returns a configured LangChain ChatBedrockConverse instance.
    """
    return ChatBedrockConverse(
        model=model_id,
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        temperature=0.7,
        max_tokens=1024,
    )


async def generate_rfp_draft(
    project_name: str, requirements: str, language: str = "English"
) -> dict:
    """
    Use AWS Bedrock via LangChain to generate a structured RFP draft.
    """
    llm = get_llm(settings.BEDROCK_MODEL_ID)

    # Use LangChain's structured output with Pydantic
    structured_llm = llm.with_structured_output(RFPGenerateResponse)

    prompt = f"""
    You are an expert Procurement Officer AI. Generate a structured Request for Proposal (RFP) draft based on the following:
    
    Project Name: {project_name}
    Key Requirements: {requirements}
    Language: {language}
    """

    try:
        response: RFPGenerateResponse = structured_llm.invoke(prompt)
        return response.model_dump()
    except Exception as e:
        print(f"Error generating RFP with LangChain Bedrock: {e}")
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
# Conversational RFP chat — via LangChain Bedrock with Structured Output
# ---------------------------------------------------------------------------

_CHAT_SYSTEM_PROMPT = """You are an expert AI Procurement Officer helping users create a Request for Proposal (RFP).

TASK: Collect 5 required details through a short, friendly conversation, then produce a structured RFP data object.

REQUIRED FIELDS:
1. product     — product or service name (with description if provided)
2. quantity    — numeric quantity with unit, e.g. "500 units", "10,000 pairs"
3. delivery_timeline — delivery timeframe, e.g. "30 days", "6 weeks", "3 months"
4. budget      — budget amount with currency, e.g. "₹5,00,000", "$10,000", "₹2L–₹5L"
5. rfp_deadline — the deadline for vendors to submit their proposals

GUIDELINES:
- Be concise. Ask for the single most critical missing field first.
- If information is still missing, set `is_complete` to false and omit `rfp_data`.
- If all 5 fields are collected:
   - Set `is_complete` to true.
   - Reply affirmatively (e.g. "I have all the details needed. Generating your RFP now!").
   - Populate `rfp_data` with all the collected information. Generate relevant technical specifications and quality/compliance standards based on the product type.
"""


async def chat_rfp_assistant(project_name: str, messages: list[dict]) -> dict:
    """
    Multi-turn conversational RFP creation using LangChain Bedrock with Structured Output.

    `messages` is a list of {"role": "user"|"assistant", "content": "..."}.
    Returns {"reply": str, "is_complete": bool, "rfp_data": dict | None}.
    """
    # Build LangChain message history
    lc_messages = [SystemMessage(content=_CHAT_SYSTEM_PROMPT)]

    # Nova Lite (Bedrock Converse API) requires the first message to be from a user.
    # We must skip any leading assistant messages.
    has_seen_user = False

    for msg in messages:
        if msg["role"] == "user":
            has_seen_user = True
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            if has_seen_user:  # Only append assistant if we've already seen a user msg
                lc_messages.append(AIMessage(content=msg["content"]))

    # If the history has no user messages (or only system prompt), start the conversation
    if not has_seen_user:
        return {
            "reply": "Hi! I'm here to help you create an RFP. What product or service do you need to procure?",
            "is_complete": False,
            "rfp_data": None,
        }

    llm = get_llm(settings.BEDROCK_NOVA_MODEL_ID)
    structured_llm = llm.with_structured_output(RFPChatResponse)

    try:
        response: RFPChatResponse = structured_llm.invoke(lc_messages)
        return response.model_dump()

    except Exception as exc:
        print(f"Nova Lite LangChain chat error: {exc}")
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
