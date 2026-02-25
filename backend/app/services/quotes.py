import json
from app.services.rfp import get_bedrock_client


async def score_quotes(quotes: list) -> list:
    """
    Use AWS Bedrock to review, normalize, and score quotes.
    Returns the quotes annotated with risk_score and reasoning.
    """
    bedrock = get_bedrock_client()

    prompt = f"""
    You are an AI Procurement Analyst. Review the following vendor quotes and score them based on Price, SLA completeness, and Risk.
    
    Quotes Data:
    {json.dumps(quotes, default=str)}
    
    Return a JSON array where each item corresponds to the quote in the input array.
    Include fields: "quote_id", "normalized_score" (0-100), "risk_level" (low/medium/high), "reasoning".
    Do not output any markdown formatting, just the raw JSON array.
    """

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
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

        response_body = json.loads(response.get("body").read())
        content = response_body.get("content", [])[0].get("text", "[]")

        return json.loads(content)
    except Exception as e:
        print(f"Error scoring quotes: {e}")
        return []


async def generate_negotiation_email(
    vendor_name: str, quote_price: float, target_discount: float, context: str
) -> str:
    """
    Generate a negotiation email using Bedrock.
    """
    bedrock = get_bedrock_client()

    prompt = f"""
    Write a professional and polite negotiation email to a vendor.
    
    Vendor Name: {vendor_name}
    Current Quote Price: {quote_price}
    Target Discount: {target_discount}%
    Context: {context}
    
    The tone should be collaborative but firm on pricing. Ensure it fits a modern procurement standard.
    Output only the email body.
    """

    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
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

        response_body = json.loads(response.get("body").read())
        return response_body.get("content", [])[0].get("text", "")
    except Exception as e:
        print(f"Error generating email: {e}")
        return "Error generating email."
