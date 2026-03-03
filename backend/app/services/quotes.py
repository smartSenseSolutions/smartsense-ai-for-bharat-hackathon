import json
import io
from pypdf import PdfReader
from sqlalchemy.orm import Session
from app.core.config import settings
from app.services.rfp import get_bedrock_client, get_llm
from app.schemas.domain import AIRecommendationsResponse
from app.models.domain import Project, Quote, ProjectInvitedVendor
from app.services.email import list_thread_messages, download_attachment_content


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
            modelId=settings.BEDROCK_MODEL_ID,
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
            modelId=settings.BEDROCK_MODEL_ID,
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        response_body = json.loads(response.get("body").read())
        return response_body.get("content", [])[0].get("text", "")
    except Exception as e:
        print(f"Error generating email: {e}")
        return "Error generating email."


async def generate_ai_recommendations(project_id: str, db: Session) -> dict:
    """
    Generate AI recommendations for all vendors who submitted a quote for a given project.
    We gather quotes, email threads, and attachments from Nylas, then prompt Amazon Nova.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found")

    # If we already have generated recommendations, return them (caching)
    if project.ai_recommendations:
        return project.ai_recommendations

    # 1. Gather Quote Data
    invited = (
        db.query(ProjectInvitedVendor)
        .filter(ProjectInvitedVendor.project_id == project_id)
        .all()
    )
    name_by_email = {
        iv.contact_email: iv.vendor_name for iv in invited if iv.contact_email
    }

    quotes = db.query(Quote).filter(Quote.project_id == project_id).all()

    vendor_payloads = []

    for q in quotes:
        sla = q.sla_details or {}
        sender_email = sla.get("sender_email", "")
        vendor_name = (
            name_by_email.get(sender_email) or sla.get("sender_name") or sender_email
        )
        thread_id = sla.get("thread_id")

        thread_texts = []
        if thread_id:
            try:
                # Fetch thread messages
                messages = list_thread_messages(thread_id)
                for msg in messages:
                    # Collect text body
                    body = msg.get("body", "")
                    # Basic cleanup of HTML could be done here, but Nova is good enough
                    if len(body) > 2000:
                        body = body[:2000] + "... [truncated]"
                    thread_texts.append(f"From {msg.get('from_')}: {body}")

                    # Fetch attachments
                    for att in msg.get("attachments", []):
                        if att["size"] < 5 * 1024 * 1024:  # under 5MB
                            try:
                                content_bytes, content_type, filename = (
                                    download_attachment_content(att["id"], msg["id"])
                                )
                                att_text = ""
                                if (
                                    filename.lower().endswith(".pdf")
                                    or "pdf" in content_type.lower()
                                ):
                                    try:
                                        reader = PdfReader(io.BytesIO(content_bytes))
                                        for page in reader.pages:
                                            text = page.extract_text()
                                            if text:
                                                att_text += text + "\n"
                                    except Exception as pdf_e:
                                        print(
                                            f"Failed to parse PDF {filename}: {pdf_e}"
                                        )
                                else:
                                    try:
                                        att_text = content_bytes.decode("utf-8")
                                        print(
                                            f"[AI Rec] Decoded {filename} as UTF-8, length: {len(att_text)}",
                                            flush=True,
                                        )
                                    except UnicodeDecodeError:
                                        print(
                                            f"[AI Rec] Failed to decode {filename} as UTF-8",
                                            flush=True,
                                        )
                                        pass  # Skip unreadable binary data

                                if att_text.strip():
                                    if len(att_text) > 3000:
                                        att_text = att_text[:3000] + "... [truncated]"
                                    thread_texts.append(
                                        f"Attachment ({filename}): {att_text}"
                                    )
                                    print(
                                        f"[AI Rec] Added attachment {filename} to thread text",
                                        flush=True,
                                    )
                            except Exception as dl_e:
                                print(
                                    f"Failed to process attachment {att.get('id')}: {dl_e}",
                                    flush=True,
                                )
            except Exception as e:
                print(f"Error fetching thread {thread_id}: {e}", flush=True)

        print(
            f"[AI Rec] Thread texts for {vendor_name}: {len(thread_texts)} parts",
            flush=True,
        )

        vendor_payloads.append(
            {
                "vendor_name": vendor_name,
                "vendor_email": sender_email,
                "price": q.price,
                "currency": q.currency,
                "delivery_timeline": sla.get("delivery_timeline"),
                "notes": sla.get("notes"),
                "email_communications": "\n---\n".join(thread_texts),
            }
        )

    if not vendor_payloads:
        return {"recommendations": []}

    print(f"[AI Rec] Processing {len(vendor_payloads)} vendor submissions", flush=True)

    # 2. Prompt Nova model
    llm = get_llm(settings.BEDROCK_NOVA_MODEL_ID)
    structured_llm = llm.with_structured_output(AIRecommendationsResponse)

    prompt = f"""
    You are an expert AI Procurement Officer. Review the following vendor quotes, email threads, and attachments for the project "{project.project_name}".
    
    RFP Details:
    {json.dumps(project.rfp_data or {}, default=str)}
    
    Vendor Submissions:
    {json.dumps(vendor_payloads, default=str)}
    
    Evaluate each vendor on the following criteria out of 100:
    - Price Competitiveness
    - Delivery Timeline
    - Quality Standards
    - Warranty Terms
    - Compliance & Certifications
    
    Also provide an 'overall_score' (0-100), a boolean 'is_recommended' (true for the best 1 or 2 vendors), a succinct 'recommendation_reason', and a 'citation' (a short exact quote from their email or attachment that supports the score).
    """

    print("[AI Rec] Invoking AI Model", flush=True)
    try:
        response: AIRecommendationsResponse = structured_llm.invoke(prompt)
        res_dict = response.model_dump()
        print(
            f"[AI Rec] AI Model response received successfully, count: {len(res_dict.get('recommendations', []))}",
            flush=True,
        )

        # 3. Cache the recommendations
        project.ai_recommendations = res_dict
        db.commit()

        return res_dict

    except Exception as e:
        print(f"Error generating AI recommendations: {e}")
        # Return empty list format on failure
        return {"recommendations": []}
