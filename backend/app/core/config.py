from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional


class Settings(BaseSettings):
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"

    EXA_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    ENVIRONMENT: str = "dev"
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
    VENDOR_SEARCH_TOP_N: int = 5  # number of top internal vendors to return
    VENDOR_SEARCH_EXTERNAL_N: int = 3  # number of Exa external vendors to return
    VENDOR_SEARCH_RRF_K: int = 60  # RRF constant k (Cormack 2009 default)
    # OpenSearch cosinesimil scores = 1 + cosine_similarity (range [0, 2]).
    # Vendors below this threshold are excluded before RRF to prevent false positives.
    # 1.3 = cosine > 0.3 (30% semantic similarity required).  Raise to 1.4–1.5 to
    # tighten results; lower toward 1.1 if too many relevant vendors are filtered out.
    VENDOR_SEARCH_VECTOR_MIN_SCORE: float = 1.1
    VENDOR_SEARCH_CANDIDATE_MULTIPLIER: int = (
        10  # fetch top_n * multiplier candidates per phase
    )

    # Nylas Email Integration
    NYLAS_API_KEY: Optional[str] = None
    NYLAS_GRANT_ID: Optional[str] = None
    NYLAS_INBOUND_GRANT_ID: Optional[str] = (
        None  # grant for the Nylas inbound email (receives vendor replies)
    )
    NYLAS_API_URI: str = "https://api.us.nylas.com"
    NYLAS_WEBHOOK_SECRET: Optional[str] = None
    NYLAS_SENDER_EMAIL: str = "noreply@procureai.nylas.email"

    @model_validator(mode="after")
    def set_dynamic_names(self):
        # We now take these from .env, so we don't need to append environment or hardcode them here.
        if self.DATABASE_URL and not self.DATABASE_URL.endswith(f"_{self.ENVIRONMENT}"):
            # self.DATABASE_URL = f"{self.DATABASE_URL}_{self.ENVIRONMENT}"
            self.DATABASE_URL = f"{self.DATABASE_URL}"

        return self

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
