from fastapi import APIRouter, Depends, HTTPException
from app.schemas.domain import QuoteScoreRequest, NegotiationEmailRequest
from app.services.quotes import score_quotes, generate_negotiation_email

router = APIRouter(prefix="/api/quotes", tags=["Quotes & Negotiation"])


@router.post("/score")
async def review_and_score_quotes(request: QuoteScoreRequest):
    """
    Takes a list of vendor quotes and scores them based on Price, SLAs, and Risk.
    """
    scored_quotes = await score_quotes(request.quotes)
    return {"status": "success", "scored_quotes": scored_quotes}


@router.post("/negotiate/email")
async def create_negotiation_email(request: NegotiationEmailRequest):
    """
    Generates a negotiation email using Generative AI.
    """
    # In a real system, we'd fetch the vendor and quote details from the DB here
    # Mocking data for generation
    mock_vendor_name = "Mock Vendor " + request.quote_id
    mock_quote_price = 100000.0

    email_body = await generate_negotiation_email(
        vendor_name=mock_vendor_name,
        quote_price=mock_quote_price,
        target_discount=request.target_reduction_percentage,
        context=request.context,
    )

    return {"status": "success", "email_body": email_body}
