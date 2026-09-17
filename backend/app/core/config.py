import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DEFAULT_DB_PATH = os.path.join(_BACKEND_DIR, "agent40.db").replace("\\", "/")

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Agent40-FeeManagement"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database URL: defaults to canonical SQLite for local zero-dependency run, postgresql+psycopg supported
    DATABASE_URL: str = f"sqlite:///{_DEFAULT_DB_PATH}"
    
    # Security / JWT
    JWT_SECRET: str = "agent40-super-secret-jwt-key-for-local-development-must-be-changed-in-prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # Audit & Logging
    LOG_LEVEL: str = "INFO"
    AUDIT_LOG_ALL_READS: bool = True
    
    # LLM Keys (optional for Phase 1, configured for future phases)
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
