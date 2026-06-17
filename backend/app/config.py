# AML Guard — Backend Configuration
# Reads from environment variables with sensible defaults for local dev

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AML Guard API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database — SQLite pre local dev, PostgreSQL pre produkciu
    # Pre PostgreSQL: postgresql+asyncpg://user:pass@host:5432/amlguard
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/aml_guard.db"

    # Auth
    SECRET_KEY: str = "aml-guard-dev-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Stripe — optional, pre produkciu
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # CORS
    CORS_ORIGINS: str = "http://localhost:8000,https://dancenitra.github.io"

    # Admin
    ADMIN_API_KEY: Optional[str] = None  # Pre profesionálne komory

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
