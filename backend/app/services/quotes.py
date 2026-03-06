import asyncio
import json
import re
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.services.rfp import get_bedrock_client, get_llm
from langchain_core.messages import SystemMessage, HumanMessage
from app.schemas.domain import AIRecommendationsResponse
from app.models.domain import Project, Quote, ProjectInvitedVendor
from app.services.activity import log_activity


def clean_html(raw_html: str) -> str:
    """Remove HTML tags from a string."""
    if not raw_html:
        return ""
    # Basic tag removal
    cleanr = re.compile("<.*?>")
    cleantext = re.sub(cleanr, " ", raw_html)
    # Remove excessive whitespace
    cleantext = re.sub(r"\s+", " ", cleantext).strip()
    return cleantext


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

        def _invoke():
            r = bedrock.invoke_model(
                modelId=settings.BEDROCK_MODEL_ID,
                body=body,
                contentType="application/json",
                accept="application/json",
            )
            return json.loads(r.get("body").read())

        response_body = await asyncio.to_thread(_invoke)
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

        def _invoke():
            r = bedrock.invoke_model(
                modelId=settings.BEDROCK_MODEL_ID,
                body=body,
                contentType="application/json",
                accept="application/json",
            )
            return json.loads(r.get("body").read())

        response_body = await asyncio.to_thread(_invoke)
        return response_body.get("content", [])[0].get("text", "")
    except Exception as e:
        print(f"Error generating email: {e}")
        return "Error generating email."


async def generate_ai_recommendations(
    project_id: str, db: Session, force_refresh: bool = False
) -> dict:
    """
    Generate AI recommendations for all vendors who submitted a quote for a given project.
    Uses pre-extracted details from the database (Quote model) instead of re-processing emails.
    All vendors are evaluated in a single go for consistent relative scoring.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found")

    # 1. Gather Quote Data from DB
    quotes = db.query(Quote).filter(Quote.project_id == project_id).all()
    if not quotes:
        print(f"[AI Rec] No quotes found in DB for project {project_id}")
        return {"recommendations": []}

    invited = (
        db.query(ProjectInvitedVendor)
        .filter(ProjectInvitedVendor.project_id == project_id)
        .all()
    )
    name_by_email = {
        iv.contact_email: iv.vendor_name for iv in invited if iv.contact_email
    }

    # 2. Build Cache Fingerprint & Vendor Payloads
    # Fingerprint = list of (quote_id, last_message_at) to detect updates
    current_fingerprint = {}
    vendor_payloads = []

    for q in quotes:
        sla = q.sla_details or {}
        email = sla.get("sender_email", "")
        if not email:
            continue

        thread_id = sla.get("thread_id")
        last_msg_at = sla.get("last_message_at", 0)
        current_fingerprint[str(q.id)] = last_msg_at

        # Construct vendor payload for LLM from structured DB data
        v_name = name_by_email.get(email) or sla.get("sender_name") or email
        vendor_payloads.append(
            {
                "vendor_name": v_name,
                "vendor_email": email,
                "thread_id": thread_id,
                "price": f"{q.price} {q.currency or 'INR'}",
                "delivery_timeline": q.delivery_timeline
                or sla.get("delivery_timeline", "Not specified"),
                "quality_standards": q.quality_standards or "Not specified",
                "warranty_terms": q.warranty_terms or "Not specified",
                "compliance_certifications": q.compliance_certifications
                or "Not specified",
                "notes": sla.get("notes", ""),
            }
        )

    # Smart Cache Check
    if project.ai_recommendations and not force_refresh:
        cached_metadata = project.ai_recommendations.get("metadata") or {}
        cached_fingerprint = cached_metadata.get("fingerprint") or {}

        if current_fingerprint == cached_fingerprint:
            print(f"[AI Rec] Returning cached recommendations for project {project_id}")
            return project.ai_recommendations

    if not vendor_payloads:
        return {"recommendations": []}

    # 3. Prompt Nova model
    llm = get_llm(settings.BEDROCK_NOVA_MODEL_ID)
    structured_llm = llm.with_structured_output(AIRecommendationsResponse)

    # Project Baseline
    rfp_delivery_timeline = (
        project.delivery_timeline.strftime("%d-%m-%Y")
        if hasattr(project, "delivery_timeline") and project.delivery_timeline
        else (project.rfp_data.get("deliveryTimeline") if project.rfp_data else "N/A")
    )
    rfp_budget = project.rfp_data.get("budget", "N/A") if project.rfp_data else "N/A"

    system_prompt = f"""
    You are an expert AI Procurement Officer for the project "{project.project_name}".
    
    TASK: Evaluate and compare multiple vendor quotes against the RFP Baseline.
    
    BASE REQUIREMENTS:
    - Evidence: Use "Vendor Quote Details" (already extracted structured data).
    - Baseline: Use "RFP Details" (Budget: {rfp_budget}, Timeline: {rfp_delivery_timeline}).
    
    STRICT SCORING RUBRIC (0-100) - EVALUATE RELATIVELY:
    1. **Price Competitiveness**: 100 for the best value/lowest price. Penalize others relatively.
    2. **Delivery Timeline**: 
       - 100 if timeline <= RFP Baseline.
       - PENALTY: Deduct 10 points for every WEEK of delay beyond baseline.
    3. **Quality/Warranty/Compliance**: 100 (full evidence), 50 (partial), 0 (missing).
    
    CITATION STRUCTURE (Required for each recommendation):
    - **price_score**: "Budget vs Quoted with % change" (e.g., "Budget: 1L, Quoted: 1.1L (10% over)")
    - **delivery_score**: "RFP vs Quoted" (e.g., "RFP: 15 days, Quoted: 20 days")
    - **quality_score**: "List of standards being followed" (e.g., "ISO 9001, ASTM-A615")
    - **warranty_score**: "RFP vs quotation" (e.g., "RFP: 1 year, Quoted: 2 years")
    - **compliance_score**: "List of certifications" (e.g., "BIS, CE, LEED")
    
    CRITICAL INSTRUCTIONS:
    - BATCH EVALUATION: You are provided with multiple vendors. Evaluate them RELATIVE to each other.
    - REASONING: Your reasoning MUST justify the score. Mention why one vendor is better than another.
    - CITATIONS OBJECT: You MUST provide a 'citations' dictionary with these keys: "price_score", "delivery_score", "quality_score", "warranty_score", "compliance_score".
    - SCHEMA: You MUST return a 'recommendations' list with exactly one object per unique vendor.
    """

    human_content = f"""
    RFP Details (BASELINE): {json.dumps(project.rfp_data or {}, default=str)}
    
    Vendor Quote Details (EVIDENCE): {json.dumps(vendor_payloads, default=str)}
    
    Generate relative recommendations for ALL vendors following the schema precisely.
    """

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_content),
    ]

    print(
        f"[AI Rec] Invoking Nova for {len(vendor_payloads)} vendors for project {project_id}",
        flush=True,
    )

    try:
        response = await asyncio.to_thread(structured_llm.invoke, messages)
        if response is None:
            return {"recommendations": []}

        res_dict = response.model_dump()

        # Add thread_id mapping and metadata
        quote_by_email = {}
        for q in quotes:
            q_email = (q.sla_details or {}).get("sender_email", "").lower()
            if q_email:
                quote_by_email[q_email] = q

        for rec in res_dict.get("recommendations", []):
            email = rec.get("vendor_email", "").lower()
            if email in quote_by_email:
                rec["thread_id"] = (quote_by_email[email].sla_details or {}).get(
                    "thread_id"
                )

        res_dict["metadata"] = {
            "fingerprint": current_fingerprint,
            "generated_at": datetime.utcnow().isoformat(),
        }

        # 4. Cache and save
        project.ai_recommendations = res_dict
        db.commit()

        log_activity(
            db,
            type="ai_recommendation",
            title="AI recommendations generated",
            description=f"Batch evaluation completed for {len(vendor_payloads)} vendors.",
            project_id=project_id,
        )

        return res_dict

    except Exception as e:
        print(f"Error generating batch AI recommendations: {e}")
        import traceback

        traceback.print_exc()
        return {"recommendations": []}


async def generate_negotiation_insights(
    thread_id: str, vendor_name: str, vendor_email: str, project_id: str, db: Session
) -> dict:
    """
    Analyze a negotiation email thread and extract structured insights:
    price, delivery timeline, key terms, vendor sentiment, and summary.
    """
    from app.services.email import list_thread_messages

    # 1. Fetch thread messages (with cross-grant search)
    try:
        messages = list_thread_messages(
            thread_id, project_id=project_id, vendor_email=vendor_email
        )
    except Exception as e:
        print(f"[Neg Insights] Thread fetch error for {thread_id}: {e}")
        return _default_insights(vendor_name)

    if not messages:
        return _default_insights(vendor_name)

    # 2. Build a condensed conversation transcript
    transcript_parts = []
    for msg in messages:
        from_list = msg.get("from") or [{}]
        from_name = (
            from_list[0].get("name") or from_list[0].get("email") or "Unknown"
            if isinstance(from_list, list) and from_list
            else "Unknown"
        )
        body = clean_html(msg.get("body", ""))
        if len(body) > 3000:
            body = body[:3000] + "... [truncated]"
        transcript_parts.append(f"From: {from_name}\n{body}")

    transcript = "\n---\n".join(transcript_parts)

    # 3. Prompt the LLM
    llm = get_llm(settings.BEDROCK_NOVA_MODEL_ID)

    prompt = f"""You are an expert procurement analyst. Analyze the following negotiation email thread between our company and vendor "{vendor_name}" ({vendor_email}).

EMAIL THREAD:
{transcript}

Extract the following information from the LATEST state of the negotiation. Return ONLY valid JSON with these exact keys:

{{
  "price": "<latest quoted price as a string, e.g. '₹1,20,000' or 'Not quoted yet'>",
  "negotiated_price": <number or null>,
  "delivery_timeline": "<latest delivery timeline, e.g. '30-45 days' or 'Not specified'>",
  "warranty": "<warranty terms or 'Not mentioned'>",
  "key_terms": ["<term 1>", "<term 2>", "<term 3>"],
  "sentiment": "<Evaluate overall vendor tone based on their replies. Must be EXACTLY ONE of: cooperative, neutral, resistant, aggressive>",
  "summary": "<1-2 sentence summary of current negotiation status>",
  "latest_change": "<Describe exactly what the vendor or buyer said in the most recent message (e.g. 'Vendor offered a 5% discount', 'Requested updated delivery date'). Do NOT just say 'Initial contact' unless there is literally only 1 message in the entire thread.>"
}}

RULES:
- Extract from the ACTUAL email content, not from assumptions.
- Only extract `negotiated_price` as a NUMBER if the vendor explicitly agreed to a new price or offered a specific discount value. If the user requests a discount but the vendor does not reply or agree, output null. IMPORTANT: For the negotiated_price, you MUST calculate and return the absolute numerical value (e.g., 90000). DO NOT return terms like 'cheaper', '10%', or 'discounted'.
- key_terms should include payment terms, warranty, MOQ, certifications, etc. if mentioned. Max 5 terms.
- sentiment reflects the VENDOR's tone toward the negotiation.
- If information is not available, say "Not specified" or "Not available" for strings, and use null for numbers.
- Return ONLY the JSON object, no markdown formatting."""

    try:
        response = await asyncio.to_thread(llm.invoke, prompt)
        content = response.content if hasattr(response, "content") else str(response)

        # Parse JSON from response
        # Strip markdown code fences if present
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        result = json.loads(content)

        # 4. Save fields to DB
        from app.models.domain import Quote

        all_quotes = (
            db.query(Quote)
            .filter(Quote.project_id == project_id)
            .order_by(Quote.created_at.desc())
            .all()
        )
        vendor_email_lower = vendor_email.strip().lower() if vendor_email else ""
        quote = next(
            (
                q
                for q in all_quotes
                if (q.sla_details or {}).get("sender_email", "").strip().lower()
                == vendor_email_lower
            ),
            all_quotes[0] if all_quotes else None,
        )

        if quote:
            neg_price = result.get("negotiated_price")
            delivery_timeline = result.get("delivery_timeline")
            warranty_terms = result.get("warranty")

            updated = False
            if neg_price is not None:
                quote.negotiated_price = float(neg_price)
                updated = True

            if delivery_timeline and delivery_timeline not in [
                "Not specified",
                "Not available",
            ]:
                quote.delivery_timeline = delivery_timeline
                updated = True

            if warranty_terms and warranty_terms not in [
                "Not mentioned",
                "Not specified",
                "Not available",
            ]:
                quote.warranty_terms = warranty_terms
                updated = True

            if updated:
                db.commit()

        display_price = result.get("price", "Not specified")
        display_delivery = result.get("delivery_timeline", "Not specified")

        if quote:
            cur = quote.currency or "INR"
            if quote.negotiated_price is not None:
                display_price = f"{cur} {quote.negotiated_price}"
            elif quote.price is not None:
                display_price = f"{cur} {quote.price}"

            if quote.delivery_timeline:
                display_delivery = quote.delivery_timeline

        return {
            "price": display_price,
            "negotiated_price": result.get("negotiated_price"),
            "delivery_timeline": display_delivery,
            "warranty": result.get("warranty", "Not mentioned"),
            "key_terms": result.get("key_terms", []),
            "sentiment": result.get("sentiment", "neutral"),
            "summary": result.get("summary", "Negotiation in progress."),
            "latest_change": result.get("latest_change", "No changes detected"),
            "message_count": len(messages),
        }
    except Exception as e:
        print(f"[Neg Insights] LLM error: {e}")
        return _default_insights(vendor_name, len(messages))


async def generate_deal_closure_extract(
    project_id: str, vendor_email: str, thread_id: str, vendor_name: str, db
) -> dict:
    """
    Extract final agreed deal terms directly from the database (Quote record).
    Returns structured closure data to pre-populate the Closure Phase.
    """
    from app.models.domain import Quote

    # sender_email is stored inside sla_details JSON, so filter in Python
    all_quotes = (
        db.query(Quote)
        .filter(Quote.project_id == project_id)
        .order_by(Quote.created_at.desc())
        .all()
    )
    # Sort so that accepted quotes are first
    all_quotes.sort(
        key=lambda q: (
            q.status == "accepted",
            q.created_at.timestamp() if q.created_at else 0,
        ),
        reverse=True,
    )

    quote = next(
        (
            q
            for q in all_quotes
            if vendor_email
            and (q.sla_details or {}).get("sender_email") == vendor_email
        ),
        all_quotes[0] if all_quotes else None,
    )

    if quote and not vendor_email:
        vendor_email = (quote.sla_details or {}).get("sender_email", "")
        thread_id = (quote.sla_details or {}).get("thread_id", "")

    # Always fetch the real vendor name from DB to prevent showing contact person names
    from app.models.domain import ProjectInvitedVendor

    if vendor_email:
        piv = (
            db.query(ProjectInvitedVendor)
            .filter(
                ProjectInvitedVendor.project_id == project_id,
                ProjectInvitedVendor.contact_email == vendor_email,
            )
            .first()
        )
        if piv and piv.vendor_name:
            vendor_name = piv.vendor_name
        elif not vendor_name and quote:
            vendor_name = (quote.sla_details or {}).get("sender_name", "")

    # Build structured thread for frontend rendering
    email_thread = []
    if thread_id:
        try:
            from app.services.email import list_thread_messages

            messages = list_thread_messages(
                thread_id, project_id=project_id, vendor_email=vendor_email
            )
            for msg in messages:
                from_list = msg.get("from") or [{}]
                from_entry = (
                    from_list[0] if isinstance(from_list, list) and from_list else {}
                )
                from_name = (
                    from_entry.get("name") or from_entry.get("email") or "Unknown"
                )
                from_email = from_entry.get("email") or ""
                to_list = msg.get("to") or []
                to_emails = [t.get("email", "") for t in to_list if isinstance(t, dict)]

                body_html = msg.get("body", "") or ""

                # We'll import clean_html locally here to avoid scope issues
                from app.services.quotes import clean_html

                body_text = clean_html(body_html)

                # Build structured message for frontend (cap body_html size)
                attachments = []
                for att in msg.get("attachments") or []:
                    attachments.append(
                        {
                            "id": att.get("id", ""),
                            "filename": att.get("filename", "attachment"),
                            "content_type": att.get("content_type", ""),
                            "size": att.get("size", 0),
                            "message_id": msg.get("id", ""),
                        }
                    )

                email_thread.append(
                    {
                        "id": msg.get("id", ""),
                        "from_name": from_name,
                        "from_email": from_email,
                        "to_emails": to_emails,
                        "subject": msg.get("subject", ""),
                        "body_html": body_html[:8000]
                        if len(body_html) > 8000
                        else body_html,
                        "body_text": body_text[:3000]
                        if len(body_text) > 3000
                        else body_text,
                        "date": msg.get("date", 0),
                        "is_vendor": from_email.lower() == vendor_email.lower(),
                        "attachments": attachments,
                    }
                )
        except Exception as e:
            print(f"[Deal Closure] Thread fetch error: {e}")

    # Build return payload from Quote model
    original_price = float(quote.price) if quote and quote.price else None
    neg_price = (
        quote.negotiated_price
        if quote and quote.negotiated_price is not None
        else original_price
    )

    sla = quote.sla_details or {} if quote else {}

    savings = None
    savings_pct = None
    if (
        neg_price is not None
        and original_price is not None
        and original_price > neg_price
    ):
        savings = round(original_price - neg_price, 2)
        savings_pct = round((savings / original_price) * 100, 1)

    return {
        "vendor_name": vendor_name,
        "vendor_email": vendor_email,
        "final_price": neg_price,
        "original_price": original_price,
        "negotiated_price": neg_price,
        "savings": savings,
        "savings_percentage": savings_pct,
        "currency": quote.currency if quote else "INR",
        "po_number": sla.get("po_number"),
        "contract_number": sla.get("contract_number"),
        "payment_schedule": sla.get("payment_schedule", []),
        "delivery_milestones": sla.get("delivery_milestones", []),
        "payment_terms": sla.get("payment_terms", ""),
        "delivery_days": quote.delivery_timeline if quote else None,
        "warranty": quote.warranty_terms if quote else "",
        "certifications": [quote.compliance_certifications]
        if quote and quote.compliance_certifications
        else [],
        "key_terms": [],  # Extracted at negotiation stage or not essential for this UI
        "summary": "Deal closed based on negotiation.",
        "vendor_location": "",
        "vendor_contact": "",
        "contact_person": "",
        "contract_start_date": "",
        "contract_end_date": "",
        "thread_id": thread_id,
        "email_thread": email_thread,
        "message_count": len(email_thread),
    }


def _default_insights(vendor_name: str, message_count: int = 0) -> dict:
    """Return a default insights object when LLM analysis is unavailable."""
    return {
        "price": "Not specified",
        "delivery_timeline": "Not specified",
        "key_terms": [],
        "sentiment": "neutral",
        "summary": f"Negotiation with {vendor_name} has been initiated."
        if message_count == 0
        else f"Conversation with {vendor_name} has {message_count} messages. Awaiting analysis.",
        "latest_change": "Initial contact",
        "message_count": message_count,
    }
