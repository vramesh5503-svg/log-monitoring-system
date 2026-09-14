"""
Application configuration loaded from environment variables (.env file).
All sensitive values should live in a .env file — never hard-coded.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── Application ─────────────────────────────────────────────────
    APP_NAME: str = "Log Security Monitoring System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── Database ─────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./logs_security.db"

    # ── JWT ──────────────────────────────────────────────────────────
    SECRET_KEY: str = "super-secret-key-change-in-production-32chars!!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── CORS ─────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Email (optional SMTP config) ─────────────────────────────────
    EMAIL_HOST: Optional[str] = None
    EMAIL_PORT: int = 587
    EMAIL_USER: Optional[str] = None
    EMAIL_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[str] = None

    # ── Alert thresholds ─────────────────────────────────────────────
    ALERT_THRESHOLD: int = 5        # failed attempts before alert
    BRUTE_FORCE_WINDOW: int = 300   # seconds (5 min window)

    # ── File upload ───────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"   # ignore unknown keys like ADMIN_* from .env


# Singleton instance imported everywhere
settings = Settings()
