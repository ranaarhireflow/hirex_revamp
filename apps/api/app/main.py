from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import conduct, health, interviews, question_templates, screenings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Hirex API", version="0.0.1", lifespan=lifespan)

def _allow_origins() -> list[str]:
    """NEXT_PUBLIC_APP_URL can be a single URL or a comma-separated list."""
    raw = settings.next_public_app_url or ""
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins(),
    # Catch Railway / Vercel preview URLs (e.g. *.up.railway.app) so that
    # branch deploys and renamed services keep working without a backend
    # env-var change. Production URLs should still go in NEXT_PUBLIC_APP_URL.
    allow_origin_regex=r"^https://([a-z0-9-]+\.)*(up\.railway\.app|vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(interviews.router)
app.include_router(question_templates.router)
app.include_router(conduct.router)
app.include_router(screenings.router)
