import json
import io
import re
from datetime import datetime
from pypdf import PdfReader
from sqlalchemy.orm import Session
from app.core.config import settings
from app.services.rfp import get_bedrock_client, get_llm
from app.schemas.domain import AIRecommendationsResponse
from app.models.domain import Project, Quote, ProjectInvitedVendor
from app.services.email import (
    list_thread_messages,
    download_attachment_content,
    search_rfp_threads_nylas,
)


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
                if len(body) > 10000:
                    body = body[:10000] + "... [truncated]"

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
                            if len(att_text) > 15000:
                                att_text = att_text[:15000] + "... [truncated]"
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

    prompt = f"""
    You are an expert AI Procurement Officer. Review the following vendor quotes, email threads, and attachments for the project "{project.project_name}".
    
    STRICT REQUIREMENT: Generate scores and recommendations ONLY based on the provided supplier responses and quotes. 
    Ignore any prior knowledge or information not present in the "Vendor Submissions" section below.

    RFP Details (for context only):
    {json.dumps(project.rfp_data or {}, default=str)}
    
    Vendor Submissions (PRIMARY SOURCE):
    {json.dumps(vendor_payloads, default=str)}
    
    Evaluate each vendor on the following criteria out of 100:
    - Price Competitiveness
    - Delivery Timeline
    - Quality Standards
    - Warranty Terms
    - Compliance & Certifications
    
    CRITICAL INSTRUCTIONS for 'citations' and 'recommendation_reason':
    - SOURCE TRUTH: Every score and reasoning MUST be directly traceable to the "Vendor Submissions".
    - NO HTML: Ensure they do NOT contain any HTML tags or raw email headers.
    - GRANULAR CITATIONS: You MUST provide a 'citations' object.
    - KEYS: Use EXACTLY these keys: "price_score", "delivery_score", "quality_score", "warranty_score", "compliance_score".
    - EXACT QUOTES: Each citation MUST be an EXACT, short quote (10-20 words max) from the vendor's email communications or attachments that justifies that specific score.
    - EXAMPLES of 'citations' entries:
        - "price_score": "Total cost for the lot is INR 1,20,000 inclusive of taxes."
        - "delivery_score": "We provide a standard delivery lead time of 45 days."
        - "quality_score": "All items are certified under ISO 9001:2015 standards."
    - UNIQUE EVIDENCE: Find the most relevant piece of evidence for each specific metric.
    - NO REPETITION: Do not use the same citation across different metrics.
    - For the 'citation' field (deprecated), providing a short overall summary quote.
    """

    print("[AI Rec] Invoking AI Model", flush=True)
    try:
        response: AIRecommendationsResponse = structured_llm.invoke(prompt)
        res_dict = response.model_dump()

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

        return res_dict

    except Exception as e:
        print(f"Error generating AI recommendations: {e}")
        # Return empty list format on failure
        return {"recommendations": []}
