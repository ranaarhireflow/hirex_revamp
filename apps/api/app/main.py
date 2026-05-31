from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import conduct, health, interviews, question_templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Hirex API", version="0.0.1", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.next_public_app_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(interviews.router)
app.include_router(question_templates.router)
app.include_router(conduct.router)
