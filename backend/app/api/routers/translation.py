from fastapi import APIRouter
from pydantic import BaseModel
from app.services.translation import translate_text

router = APIRouter(prefix="/api/translate", tags=["Translation"])


class TranslationRequest(BaseModel):
    text: str
    target_language: str
    source_language: str = "auto"


@router.post("/")
async def translate_content(request: TranslationRequest):
    """
    Translates RFP content, messages, or interface strings perfectly.
    """
    # Mapping friendly names to AWS language codes if needed, assuming mapped by frontend
    # Example: 'hi' for Hindi, 'ta' for Tamil etc.
    translated = await translate_text(
        text=request.text,
        target_language_code=request.target_language,
        source_language_code=request.source_language,
    )
    return {"status": "success", "translated_text": translated}
