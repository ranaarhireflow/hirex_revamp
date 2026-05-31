from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_HERE = Path(__file__).resolve()


def _find_root() -> Path:
    """Locate the directory that holds the `.env` file when running locally
    out of the monorepo (~/hirex/apps/api/app/config.py → ~/hirex).

    In a Docker container the file lives at /app/app/config.py and there's
    no .env at all (env vars come from the PaaS), so we just fall back to
    the parent of the `app` package — `/app`.
    """
    for parent in _HERE.parents:
        if (parent / ".env").exists() or (parent / ".git").exists():
            return parent
    # Defensive fallback: parent of the app package.
    return _HERE.parents[1] if len(_HERE.parents) > 1 else Path("/app")


ROOT = _find_root()
_ENV_FILE = ROOT / ".env"


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

    # Only point pydantic-settings at the .env file when it actually exists.
    # In production (Railway / Fly / Cloud Run) env vars come from the
    # platform, not a file, so env_file=None is the right call.
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


settings = Settings()  # type: ignore[call-arg]
