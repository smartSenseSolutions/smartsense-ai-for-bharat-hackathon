import boto3
from app.core.config import settings


def get_translate_client():
    return boto3.client(
        service_name="translate",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


async def translate_text(
    text: str, target_language_code: str, source_language_code: str = "auto"
) -> str:
    """
    Translates text using AWS Translate.
    """
    if not text:
        return ""

    try:
        translate = get_translate_client()
        response = translate.translate_text(
            Text=text,
            SourceLanguageCode=source_language_code,
            TargetLanguageCode=target_language_code,
        )
        return response.get("TranslatedText", text)
    except Exception as e:
        print(f"Translation Error: {e}")
        return f"[Translation Error] {text}"
