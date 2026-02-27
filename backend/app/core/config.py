from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"

    EXA_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    DATABASE_URL: str = (
        "postgresql+psycopg2://postgres:postgres@localhost:5432/procure_ai"
    )

    OPENSEARCH_URL: Optional[str] = None
    OPENSEARCH_USER: Optional[str] = None
    OPENSEARCH_PASSWORD: Optional[str] = None
    OPENSEARCH_INDEX: str = "vendor-documents"
    VENDOR_INDEX_NAME: str = "vendors"

    S3_BUCKET_NAME: Optional[str] = None
    S3_RFP_BUCKET: Optional[str] = None  # bucket for published RFP PDFs
    S3_RFP_BUCKET_REGION: Optional[str] = None  # region override for the RFP bucket

    # Bedrock model IDs
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-haiku-20240307-v1:0"
    BEDROCK_NOVA_MODEL_ID: str = "amazon.nova-lite-v1:0"
    BEDROCK_EMBEDDING_MODEL_ID: str = "amazon.titan-embed-text-v2:0"

    JWT_SECRET_KEY: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    SUPERUSER_EMAIL: str = "admin@example.com"
    SUPERUSER_PASSWORD: str = "changeme"

    # Vendor smart search settings
    VENDOR_SEARCH_TOP_N: int = 3  # number of top internal vendors to return
    VENDOR_SEARCH_EXTERNAL_N: int = 3  # number of Exa external vendors to return
    VENDOR_SEARCH_KEYWORD_WEIGHT: float = 0.4  # weight for BM25 keyword score
    VENDOR_SEARCH_VECTOR_WEIGHT: float = 0.6  # weight for kNN vector score
    VENDOR_SEARCH_INTERNAL_THRESHOLD: float = (
        0.3  # minimum final_score to accept internal vendors
    )
    VENDOR_SEARCH_CANDIDATE_MULTIPLIER: int = (
        10  # fetch top_n * multiplier candidates per phase
    )

    # Nylas Email Integration
    NYLAS_API_KEY: Optional[str] = None
    NYLAS_GRANT_ID: Optional[str] = None
    NYLAS_API_URI: str = "https://api.us.nylas.com"
    NYLAS_WEBHOOK_SECRET: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
