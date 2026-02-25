from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"

    EXA_API_KEY: Optional[str] = None

    DATABASE_URL: str = (
        "postgresql+psycopg2://postgres:postgres@localhost:5432/procure_ai"
    )

    OPENSEARCH_URL: Optional[str] = None

    JWT_SECRET_KEY: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    SUPERUSER_EMAIL: str = "admin@example.com"
    SUPERUSER_PASSWORD: str = "changeme"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
