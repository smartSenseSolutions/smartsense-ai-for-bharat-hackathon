import boto3
import re
import uuid
from io import BytesIO
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
   - Populate `rfp_data` with all the collected information. Generate relevant technical specifications and quality/compliance standards.
   - For `costBornByRespondents`, securely generate a statement about how "All expenses incurred by Respondents in any way associated with the development, preparation and submission of a response... will be borne entirely and exclusively by the Respondent."
   - For `changesInScope`, generate a statement how the Company reserves the right to change, add or delete any part of this RFP.
   - For `clarificationOfSubmissions`, generate a statement how the Company may seek clarification from any Respondent at its sole discretion.
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


# ---------------------------------------------------------------------------
# PDF generation + S3 publish
# ---------------------------------------------------------------------------


def _strip_html(text: str) -> str:
    """Strip HTML tags from contentEditable innerHTML, preserving line breaks."""
    if not text:
        return ""
    # Convert block-level closers to newlines
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</div>|</p>|</li>", "\n", text, flags=re.IGNORECASE)
    # Remove remaining tags
    text = re.sub(r"<[^>]+>", "", text)
    # Decode common HTML entities
    text = (
        text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
    )
    # Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def generate_rfp_pdf(project_name: str, rfp_data: dict) -> bytes:
    """
    Build a professional A4 PDF of the RFP using reportlab.
    Returns raw PDF bytes.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        HRFlowable,
        KeepTogether,
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    W = A4[0] - 5 * cm  # usable width

    # ── Styles ───────────────────────────────────────────────────────────────
    base = getSampleStyleSheet()
    gray900 = colors.HexColor("#111827")
    gray700 = colors.HexColor("#374151")
    gray500 = colors.HexColor("#6B7280")
    gray400 = colors.HexColor("#9CA3AF")
    gray200 = colors.HexColor("#E5E7EB")
    gray100 = colors.HexColor("#F3F4F6")
    gray50  = colors.HexColor("#F9FAFB")
    blue600 = colors.HexColor("#2563EB")

    def sty(name, **kw):
        return ParagraphStyle(name, parent=base["Normal"], **kw)

    title_sty   = sty("T", fontSize=22, fontName="Helvetica-Bold", textColor=gray900, spaceAfter=2)
    sub_sty     = sty("S", fontSize=12, fontName="Helvetica",      textColor=gray500, spaceAfter=2)
    meta_sty    = sty("M", fontSize=8,  fontName="Helvetica",      textColor=gray500)
    h_sty       = sty("H", fontSize=8,  fontName="Helvetica-Bold", textColor=gray900,
                       spaceBefore=14, spaceAfter=6, borderPadding=(0,0,2,0))
    body_sty    = sty("B", fontSize=9,  fontName="Helvetica",      textColor=gray700,
                       spaceAfter=4, leading=14)
    label_sty   = sty("L", fontSize=8,  fontName="Helvetica-Bold", textColor=gray500)
    bullet_sty  = sty("BU", fontSize=9, fontName="Helvetica",      textColor=gray700,
                       leftIndent=12, spaceAfter=3, leading=14)
    footer_sty  = sty("F", fontSize=7,  fontName="Helvetica",      textColor=gray400,
                       leading=10)

    def h(v):
        return _strip_html(str(v)) if v else ""

    def section(title: str):
        return Paragraph(title, h_sty)

    story = []

    # ── Header ───────────────────────────────────────────────────────────────
    story.append(Paragraph(h(rfp_data.get("documentTitle", "REQUEST FOR PROPOSAL")), title_sty))
    story.append(Paragraph(h(project_name or rfp_data.get("projectName", "")), sub_sty))
    story.append(Spacer(1, 4))

    meta_rows = [
        [Paragraph("<b>Document No.</b>", label_sty),
         Paragraph(h(rfp_data.get("documentNo", "")), meta_sty)],
        [Paragraph("<b>Date</b>", label_sty),
         Paragraph(h(rfp_data.get("documentDate", "")), meta_sty)],
    ]
    t = Table(meta_rows, colWidths=[3.5 * cm, W - 3.5 * cm])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(t)
    story.append(HRFlowable(width="100%", thickness=0.75, color=gray200, spaceAfter=10))

    # ── Executive Summary ────────────────────────────────────────────────────
    summary = h(rfp_data.get("executiveSummary", ""))
    if summary:
        story.append(section("EXECUTIVE SUMMARY"))
        for line in summary.split("\n"):
            if line.strip():
                story.append(Paragraph(line.strip(), body_sty))
        story.append(Spacer(1, 6))

    # ── Product Requirements ─────────────────────────────────────────────────
    story.append(section("1. PRODUCT REQUIREMENTS"))
    prod_rows = [
        ["Product Name",       h(rfp_data.get("productName", ""))],
        ["Quantity Required",  h(rfp_data.get("quantity", ""))],
        ["Delivery Timeline",  h(rfp_data.get("deliveryTimeline", ""))],
        ["Budget Allocation",  h(rfp_data.get("budget", ""))],
    ]
    if rfp_data.get("rfpDeadline"):
        prod_rows.append(["Submission Deadline", h(rfp_data["rfpDeadline"])])
    pt = Table(
        [[Paragraph(f"<b>{r[0]}</b>", label_sty), Paragraph(r[1], body_sty)] for r in prod_rows],
        colWidths=[5 * cm, W - 5 * cm],
    )
    pt.setStyle(TableStyle([
        ("VALIGN",          (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS",  (0, 0), (-1, -1), [gray50, colors.white]),
        ("TOPPADDING",      (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",   (0, 0), (-1, -1), 5),
        ("LEFTPADDING",     (0, 0), (-1, -1), 8),
    ]))
    story.append(pt)
    story.append(Spacer(1, 6))

    # ── Technical Specifications ─────────────────────────────────────────────
    specs = rfp_data.get("specifications", [])
    if specs:
        story.append(section("2. TECHNICAL SPECIFICATIONS"))
        for i, s in enumerate(specs, 1):
            story.append(Paragraph(f"{i}.  {h(s)}", bullet_sty))
        story.append(Spacer(1, 6))

    # ── Quality Standards ────────────────────────────────────────────────────
    standards = rfp_data.get("qualityStandards", [])
    if standards:
        story.append(section("3. QUALITY STANDARDS & COMPLIANCE"))
        for s in standards:
            story.append(Paragraph(f"•  {h(s)}", bullet_sty))
        story.append(Spacer(1, 6))

    # ── Scope of Work ────────────────────────────────────────────────────────
    scope = rfp_data.get("scopeOfWork", [])
    if scope:
        story.append(section("4. SCOPE OF WORK"))
        for s in scope:
            story.append(Paragraph(f"•  {h(s)}", bullet_sty))
        story.append(Spacer(1, 6))

    # ── Submission Requirements ──────────────────────────────────────────────
    reqs = rfp_data.get("submissionRequirements", [])
    if reqs:
        story.append(section("5. PROPOSAL SUBMISSION REQUIREMENTS"))
        for r in reqs:
            story.append(Paragraph(f"•  {h(r)}", bullet_sty))
        story.append(Spacer(1, 6))

    # ── Evaluation Criteria ──────────────────────────────────────────────────
    criteria = rfp_data.get("evaluationCriteria", [])
    if criteria:
        story.append(section("6. EVALUATION CRITERIA"))
        story.append(Paragraph("Proposals will be evaluated based on the following criteria:", body_sty))
        ct_data = [
            [Paragraph("<b>Criteria</b>", label_sty), Paragraph("<b>Weight</b>", label_sty)]
        ] + [
            [Paragraph(h(c.get("name", "")), body_sty), Paragraph(h(c.get("weight", "")), body_sty)]
            for c in criteria
        ]
        ct = Table(ct_data, colWidths=[W - 4 * cm, 4 * cm])
        ct.setStyle(TableStyle([
            ("BACKGROUND",      (0, 0), (-1, 0), gray100),
            ("ROWBACKGROUNDS",  (0, 1), (-1, -1), [colors.white, gray50]),
            ("GRID",            (0, 0), (-1, -1), 0.5, gray200),
            ("ALIGN",           (1, 0), (1, -1), "CENTER"),
            ("VALIGN",          (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",      (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING",   (0, 0), (-1, -1), 5),
            ("LEFTPADDING",     (0, 0), (-1, -1), 8),
        ]))
        story.append(ct)
        story.append(Spacer(1, 6))

    # ── Terms & Conditions ───────────────────────────────────────────────────
    terms = rfp_data.get("termsAndConditions", [])
    if terms:
        story.append(section("7. TERMS & CONDITIONS"))
        for term in terms:
            story.append(Paragraph(h(term.get("title", "")), label_sty))
            story.append(Paragraph(h(term.get("description", "")), body_sty))
        story.append(Spacer(1, 6))

    # ── Cost Born By Respondents ─────────────────────────────────────────────
    cost = rfp_data.get("costBornByRespondents", "")
    if cost:
        story.append(section("8. COST BORN BY RESPONDENTS"))
        story.append(Paragraph(h(cost), body_sty))
        story.append(Spacer(1, 6))

    # ── Changes in Scope ─────────────────────────────────────────────────────
    scope_chg = rfp_data.get("changesInScope", "")
    if scope_chg:
        story.append(section("9. CHANGES IN SCOPE"))
        story.append(Paragraph(h(scope_chg), body_sty))
        story.append(Spacer(1, 6))

    # ── Clarification of Submissions ─────────────────────────────────────────
    clarification = rfp_data.get("clarificationOfSubmissions", "")
    if clarification:
        story.append(section("10. CLARIFICATION OF SUBMISSIONS"))
        story.append(Paragraph(h(clarification), body_sty))
        story.append(Spacer(1, 6))

    # ── Footer ───────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.75, color=gray200, spaceBefore=12))
    story.append(Paragraph(
        "This document is confidential and proprietary. All information contained herein is "
        "for the exclusive use of the intended recipient(s). Unauthorized disclosure, distribution, "
        "or copying is strictly prohibited.",
        footer_sty,
    ))

    doc.build(story)
    return buffer.getvalue()


def publish_rfp_to_s3(project_id: str, project_name: str, rfp_data: dict) -> dict:
    """
    Generate a PDF for the RFP and upload it to S3.
    File key: {project_id}.pdf
    Returns {"s3_url": str, "s3_key": str}.
    Raises RuntimeError if S3_RFP_BUCKET is not configured.
    """
    bucket = settings.S3_RFP_BUCKET
    if not bucket:
        raise RuntimeError("S3_RFP_BUCKET is not configured")

    # Use the bucket-specific region if set, otherwise fall back to the global AWS region
    region = settings.S3_RFP_BUCKET_REGION or settings.AWS_REGION

    pdf_bytes = generate_rfp_pdf(project_name, rfp_data)
    s3_key = f"{project_id}.pdf"

    s3 = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    s3.put_object(
        Bucket=bucket,
        Key=s3_key,
        Body=pdf_bytes,
        ContentType="application/pdf",
    )

    s3_url = f"https://{bucket}.s3.{region}.amazonaws.com/{s3_key}"
    return {"s3_url": s3_url, "s3_key": s3_key}
