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
from app.services.email import (
    list_thread_messages,
    download_attachment_content,
    search_rfp_threads_nylas,
)
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
    We gather quotes, email threads, and attachments from Nylas, then prompt Amazon Nova.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found")

    # 1. Gather Quote Data
    invited = (
        db.query(ProjectInvitedVendor)
        .filter(ProjectInvitedVendor.project_id == project_id)
        .all()
    )
    name_by_email = {
        iv.contact_email: iv.vendor_name for iv in invited if iv.contact_email
    }

    invited_emails = set(name_by_email.keys())

    # We use a dictionary keyed by vendor_email to deduplicate data sources
    vendor_data_map = {}
    known_thread_ids = set()

    def fetch_thread_text(tid: str) -> list[str]:
        t_texts = []
        try:
            # Fetch thread messages
            messages = list_thread_messages(tid)
            for msg in messages:
                # Collect and clean text body
                body = msg.get("body", "")
                body = clean_html(body)
                if len(body) > 5000:
                    body = body[:5000] + "... [truncated]"

                from_addr = msg.get("from_")
                t_texts.append(f"From {from_addr}: {body}")

                # Process attachments
                attachments = msg.get("attachments", [])
                for att in attachments:
                    try:
                        att_id = att.get("id")
                        filename = att.get("filename", "unknown")
                        if not att_id:
                            continue

                        print(
                            f"[AI Rec] Downloading attachment: {filename} (id: {att_id})",
                            flush=True,
                        )
                        content_bytes, content_type, downloaded_filename = (
                            download_attachment_content(att_id, msg["id"])
                        )

                        att_text = ""
                        # Use loose check for PDF
                        if (
                            content_type and "pdf" in content_type.lower()
                        ) or filename.lower().endswith(".pdf"):
                            try:
                                import io
                                from pypdf import PdfReader

                                reader = PdfReader(io.BytesIO(content_bytes))
                                pages_text = []
                                for i, page in enumerate(reader.pages):
                                    text = page.extract_text()
                                    if text:
                                        pages_text.append(text)
                                att_text = "\n".join(pages_text)
                                print(
                                    f"[AI Rec] Extracted {len(att_text)} chars from PDF {filename}",
                                    flush=True,
                                )
                            except Exception as pdf_exc:
                                print(
                                    f"[AI Rec] PDF parsing failed for {filename}: {pdf_exc}",
                                    flush=True,
                                )
                        elif (
                            content_type
                            and "text" in content_type.lower()
                            or filename.lower().endswith((".txt", ".csv"))
                        ):
                            try:
                                att_text = content_bytes.decode(
                                    "utf-8", errors="ignore"
                                )
                                print(
                                    f"[AI Rec] Decoded {filename} as text, length: {len(att_text)}",
                                    flush=True,
                                )
                            except Exception as dec_exc:
                                print(
                                    f"[AI Rec] Text decoding failed for {filename}: {dec_exc}",
                                    flush=True,
                                )

                        if att_text.strip():
                            if len(att_text) > 8000:
                                att_text = att_text[:8000] + "... [truncated]"
                            t_texts.append(f"ATTACHMENT ({filename}):\n{att_text}")
                            print(
                                f"[AI Rec] Added attachment content for {filename} to thread text",
                                flush=True,
                            )
                    except Exception as att_exc:
                        print(
                            f"[AI Rec] Error processing attachment: {att_exc}",
                            flush=True,
                        )
        except Exception as e:
            print(f"[AI Rec] Error fetching thread {tid}: {e}", flush=True)
        return t_texts

    # 1.1 Process database quotes
    quotes = db.query(Quote).filter(Quote.project_id == project_id).all()
    for q in quotes:
        sla = q.sla_details or {}
        email = sla.get("sender_email", "")
        if not email:
            continue

        thread_id = sla.get("thread_id")
        thread_texts = []
        if thread_id:
            known_thread_ids.add(thread_id)
            thread_texts = fetch_thread_text(thread_id)

        v_name = name_by_email.get(email) or sla.get("sender_name") or email
        vendor_data_map[email] = {
            "vendor_name": v_name,
            "vendor_email": email,
            "thread_id": thread_id,
            "price": q.price,
            "currency": q.currency,
            "delivery_timeline": sla.get("delivery_timeline"),
            "notes": sla.get("notes"),
            "email_communications": "\n---\n".join(thread_texts),
        }

    try:
        active_threads = search_rfp_threads_nylas(project_id, invited_emails)
        for t in active_threads:
            tid = t["thread_id"]
            if tid in known_thread_ids:
                continue

            email = t["vendor_email"]
            v_name = name_by_email.get(email) or t["vendor_name"] or email
            thread_texts = fetch_thread_text(tid)

            new_comm = "\n---\n".join(thread_texts)

            if email in vendor_data_map:
                # Merge communications if we already had a DB quote
                existing = vendor_data_map[email]["email_communications"]
                if existing:
                    vendor_data_map[email]["email_communications"] = (
                        existing + "\n---\n" + new_comm
                    )
                else:
                    vendor_data_map[email]["email_communications"] = new_comm
            else:
                # New vendor found via Nylas
                vendor_data_map[email] = {
                    "vendor_name": v_name,
                    "vendor_email": email,
                    "thread_id": tid,
                    "price": None,
                    "currency": None,
                    "delivery_timeline": None,
                    "notes": None,
                    "email_communications": new_comm,
                }
    except Exception as exc:
        print(f"[AI Rec] Nylas thread search error: {exc}", flush=True)

    vendor_payloads = list(vendor_data_map.values())

    if not vendor_payloads:
        return {"recommendations": []}

    # If active_threads search failed or was skipped, use empty list for fingerprint
    if "active_threads" not in locals():
        active_threads = []

    # Create a cache fingerprint for current vendor data
    # Fingerprint = list of (thread_id, latest_date, message_count)
    current_fingerprint = {
        thread.get("thread_id"): {
            "latest_date": thread.get("latest_date"),
            "message_count": thread.get("message_count"),
        }
        for thread in active_threads
    }

    # Smart Cache Check: If not force_refresh, check if current fingerprints match cached fingerprints
    if project.ai_recommendations and not force_refresh:
        cached_metadata = project.ai_recommendations.get("metadata") or {}
        cached_fingerprint = cached_metadata.get("fingerprint") or {}

        if current_fingerprint == cached_fingerprint:
            print(
                f"[AI Rec] Returning cached recommendations for project {project_id} (fingerprints match)"
            )
            return project.ai_recommendations
        else:
            print(
                f"[AI Rec] Cache invalidated: fingerprints differ for project {project_id}"
            )

    print(
        f"[AI Rec] RFP Data: {json.dumps(project.rfp_data or {}, default=str)}",
        flush=True,
    )
    print(
        f"[AI Rec] Processing {len(vendor_payloads)} unique vendor submissions",
        flush=True,
    )
    for vp in vendor_payloads:
        clipped_comm = (
            (vp["email_communications"][:200] + "...")
            if len(vp["email_communications"]) > 200
            else vp["email_communications"]
        )
        print(
            f"[AI Rec] Vendor: {vp['vendor_name']}, Comm snippet: {clipped_comm}",
            flush=True,
        )

    # 2. Prompt Nova model
    llm = get_llm(settings.BEDROCK_NOVA_MODEL_ID)
    structured_llm = llm.with_structured_output(AIRecommendationsResponse)

    # DB formatted Baseline
    rfp_delivery_timeline = (
        project.delivery_timeline.strftime("%d-%m-%Y")
        if hasattr(project, "delivery_timeline") and project.delivery_timeline
        else project.rfp_data.get("deliveryTimeline", "N/A")
    )
    rfp_budget = project.rfp_data.get("budget", "N/A") if project.rfp_data else "N/A"

    system_prompt = f"""
    You are an expert AI Procurement Officer for the project "{project.project_name}".
    
    BASE REQUIREMENTS:
    - Evidence: Use "Vendor Submissions".
    - Baseline: Use "RFP Details" (Budget: {rfp_budget}, Timeline: {rfp_delivery_timeline}).
    
    STRICT SCORING RUBRIC (0-100) - NO EXCEPTIONS:
    1. **Price Competitiveness**: 100 for lowest, 90-100 for under budget. Over budget: 85 - 1pt per 2% over.
    2. **Delivery Timeline**: 
       - 100 if and only if (Bulk/Production timeline) <= RFP Baseline.
       - If Bulk timeline NOT found, use Trial timeline but note it's non-standard.
       - PENALTY: YOU MUST DEDUCT 10 points for every WEEK of delay. 
       - If RFP is "{rfp_delivery_timeline}" and Vendor is "30-45 days" (6 weeks), the delay is 4 weeks. Score MUST be ~60. 
       - NEVER award 100 for a delivery that exceeds the baseline.
    3. **Quality/Warranty/Compliance**: 100 (full evidence), 50 (partial), 0 (none/missing).
    
    CRITICAL INSTRUCTIONS:
    - MULTI-VENDOR: You MUST return exactly ONE recommendation object for EVERY vendor provided in the Evidence.
    - REASONING: Your reasoning MUST justify the score. Mention exact delays in weeks if applicable.
    - CITATIONS OBJECT: You MUST provide a 'citations' dictionary with EXACTLY these keys: "price_score", "delivery_score", "quality_score", "warranty_score", "compliance_score".
    - CITATION VALUES: Each must be an EXACT, short quote (10-20 words max) justifying that score.
    - DEPRECATED FIELD: Set the 'citation' field (string) to a short overall summary quote.
    """

    human_content = f"""
    RFP Details (BASELINE): {json.dumps(project.rfp_data or {}, default=str)}
    
    Vendor Submissions (EVIDENCE): {json.dumps(vendor_payloads, default=str)}
    
    Generate recommendations for ALL vendors following the schema precisely.
    """

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_content),
    ]

    print(
        f"[AI Rec] Invoking AI Model with {len(messages)} messages. Human content length: {len(human_content)}",
        flush=True,
    )
    try:
        response = await asyncio.to_thread(structured_llm.invoke, messages)
        if response is None:
            print(
                "[AI Rec] AI Model returned None. Retrying with simplified prompt...",
                flush=True,
            )
            # Simple fallback or retry logic could go here, but let's try to fix the root cause.
            return {"recommendations": []}

        res_dict = response.model_dump()

        # Map thread_id back from vendor_data_map (since LLM might not preserve it or we didn't ask it to)
        for rec in res_dict.get("recommendations", []):
            v_email = rec.get("vendor_email")
            if v_email in vendor_data_map:
                rec["thread_id"] = vendor_data_map[v_email].get("thread_id")

        # Add metadata to the response for caching
        res_dict["metadata"] = {
            "fingerprint": current_fingerprint,
            "generated_at": datetime.utcnow().isoformat(),
        }

        print(
            f"[AI Rec] AI Model response received successfully, count: {len(res_dict.get('recommendations', []))}",
            flush=True,
        )

        # 3. Cache the recommendations
        project.ai_recommendations = res_dict
        db.commit()

        # Log activity
        log_activity(
            db,
            type="ai_recommendation",
            title="AI recommendations generated",
            description=f"Generated for project: {project.project_name}",
            project_id=project_id,
        )

        return res_dict

    except Exception as e:
        print(f"Error generating AI recommendations: {e}")
        # Return empty list format on failure
        return {"recommendations": []}


async def generate_negotiation_insights(
    thread_id: str, vendor_name: str, vendor_email: str, project_id: str = ""
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
  "delivery_timeline": "<latest delivery timeline, e.g. '30-45 days' or 'Not specified'>",
  "key_terms": ["<term 1>", "<term 2>", "<term 3>"],
  "sentiment": "<one of: cooperative, neutral, resistant, aggressive>",
  "summary": "<1-2 sentence summary of current negotiation status>",
  "latest_change": "<what changed in the most recent message, or 'Initial contact' if only one message>"
}}

RULES:
- Extract from the ACTUAL email content, not from assumptions.
- key_terms should include payment terms, warranty, MOQ, certifications, etc. if mentioned. Max 5 terms.
- sentiment reflects the VENDOR's tone toward the negotiation.
- If information is not available, say "Not specified" or "Not available".
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
        return {
            "price": result.get("price", "Not specified"),
            "delivery_timeline": result.get("delivery_timeline", "Not specified"),
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
    Use Nova to extract final agreed deal terms from all negotiation and quotation emails.
    Returns structured closure data to pre-populate the Closure Phase.
    """
    from app.models.domain import Project, Quote

    project = db.query(Project).filter(Project.id == project_id).first()
    # sender_email is stored inside sla_details JSON, so filter in Python
    all_quotes = (
        db.query(Quote)
        .filter(Quote.project_id == project_id)
        .order_by(Quote.created_at.desc())
        .all()
    )
    quote = next(
        (
            q
            for q in all_quotes
            if (q.sla_details or {}).get("sender_email") == vendor_email
        ),
        all_quotes[0] if all_quotes else None,
    )

    # Build email transcript and structured thread for frontend rendering
    transcript_parts = []
    email_thread = []
    if thread_id:
        try:
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
                body_text = clean_html(body_html)
                if len(body_text) > 3000:
                    body_text = body_text[:3000] + "... [truncated]"
                transcript_parts.append(f"From: {from_name}\n{body_text}")

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
                        "body_text": body_text,
                        "date": msg.get("date", 0),
                        "is_vendor": from_email.lower() == vendor_email.lower(),
                        "attachments": attachments,
                    }
                )
        except Exception as e:
            print(f"[Deal Closure] Thread fetch error: {e}")

    transcript = (
        "\n---\n".join(transcript_parts)
        if transcript_parts
        else "No email thread available."
    )

    # Build quote context
    original_price = None
    quote_context = ""
    if quote:
        original_price = float(quote.price) if quote.price else None
        sla = quote.sla_details or {}
        quote_context = (
            f"Quote Record:\n"
            f"- Original Price: {quote.price} {quote.currency or 'INR'}\n"
            f"- Delivery Timeline: {sla.get('delivery_timeline', 'N/A')}\n"
            f"- Notes: {sla.get('notes', 'N/A')}"
        )

    project_name = project.project_name if project else "Unknown"
    rfp_budget = (
        project.rfp_data.get("budget", "N/A") if project and project.rfp_data else "N/A"
    )

    llm = get_llm(settings.BEDROCK_NOVA_MODEL_ID)

    prompt = f"""You are an expert procurement analyst finalizing a deal with vendor "{vendor_name}" ({vendor_email}).

Project: {project_name}
RFP Budget: {rfp_budget}
{quote_context}

EMAIL THREAD (complete negotiation history):
{transcript}

Based on all the negotiation and quotation emails above, extract the final agreed deal terms.
Return ONLY valid JSON with these exact keys:
{{
  "final_price": <number or null>,
  "original_price": <number or null>,
  "currency": "INR",
  "delivery_days": <number or null>,
  "delivery_milestones": [
    {{"phase": "<phase name>", "duration": "<e.g. 5 days>", "estimated_date": "<date string or null>"}}
  ],
  "warranty": "<warranty terms or 'Not mentioned'>",
  "payment_terms": "<payment terms or 'Not mentioned'>",
  "payment_schedule": [
    {{"milestone": "<name>", "percentage": <number>, "dueDate": "<date string or ''>"}}
  ],
  "certifications": ["<cert1>", "<cert2>"],
  "key_terms": ["<term1>", "<term2>"],
  "summary": "<1-2 sentence deal summary>",
  "vendor_location": "<city, state if mentioned or ''>",
  "vendor_contact": "<phone number if mentioned or ''>",
  "contact_person": "<name of vendor's contact person if mentioned or ''>",
  "contract_start_date": "<contract start date if mentioned or ''>",
  "contract_end_date": "<contract end date or duration if mentioned or ''>"
}}
RULES:
- Extract from ACTUAL email content only.
- If information is not found, use null for numbers and empty string for strings.
- delivery_milestones: list the logical phases (e.g. Order Processing, Manufacturing, Shipping, Delivery). Include duration and any dates mentioned.
- payment_schedule: reflect any milestone/installment structure discussed (e.g. 30% advance, 50% on delivery).
- certifications: list any quality/compliance certs mentioned (ISO, CE, FDA, GMP, etc.).
- key_terms: important negotiated conditions like warranty, SLA, training, spare parts, etc.
- Return ONLY the JSON object, no markdown."""

    try:
        response = await asyncio.to_thread(llm.invoke, prompt)
        content = response.content if hasattr(response, "content") else str(response)
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        result = json.loads(content)

        final_price = result.get("final_price")
        orig_price = result.get("original_price") or original_price
        savings = None
        savings_pct = None
        if final_price and orig_price and orig_price > final_price:
            savings = round(orig_price - final_price, 2)
            savings_pct = round((savings / orig_price) * 100, 1)

        return {
            "vendor_name": vendor_name,
            "vendor_email": vendor_email,
            "final_price": final_price,
            "original_price": orig_price,
            "savings": savings,
            "savings_percentage": savings_pct,
            "currency": result.get("currency", "INR"),
            "delivery_days": result.get("delivery_days"),
            "delivery_milestones": result.get("delivery_milestones", []),
            "warranty": result.get("warranty", ""),
            "payment_terms": result.get("payment_terms", ""),
            "payment_schedule": result.get("payment_schedule", []),
            "certifications": result.get("certifications", []),
            "key_terms": result.get("key_terms", []),
            "summary": result.get("summary", ""),
            "vendor_location": result.get("vendor_location", ""),
            "vendor_contact": result.get("vendor_contact", ""),
            "contact_person": result.get("contact_person", ""),
            "contract_start_date": result.get("contract_start_date", ""),
            "contract_end_date": result.get("contract_end_date", ""),
            "thread_id": thread_id,
            "email_thread": email_thread,
            "message_count": len(email_thread),
        }
    except Exception as e:
        print(f"[Deal Closure] LLM error: {e}")
        return {
            "vendor_name": vendor_name,
            "vendor_email": vendor_email,
            "final_price": original_price,
            "original_price": original_price,
            "savings": None,
            "savings_percentage": None,
            "currency": "INR",
            "delivery_days": None,
            "delivery_milestones": [],
            "warranty": "",
            "payment_terms": "",
            "payment_schedule": [],
            "certifications": [],
            "key_terms": [],
            "summary": "",
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
