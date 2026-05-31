from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root is three levels up from apps/api/app/config.py
ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    openrouter_api_key: str
    openrouter_model: str = "deepseek/deepseek-chat-v3.1"
    openrouter_referer: str = "http://localhost:3000"

    database_url: str

    jwt_signing_secret: str = "change-me-in-production-please"

    next_public_app_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8080"
    port: int = 8080
    node_env: str = "development"

    # optional — empty string means "not configured"
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "hirex-recordings"
    r2_public_base_url: str = ""

    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""

    redis_url: str = ""
    sentry_dsn: str = ""

    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()  # type: ignore[call-arg]
