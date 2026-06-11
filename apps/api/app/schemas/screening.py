from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.db.models import CandidateStatus, ScreenStatus


class ScreenCandidateOut(BaseModel):
    id: UUID
    file_name: str
    candidate_name: str | None
    match_score: int | None
    verdict: str | None
    summary: str | None
    strengths: list[str]
    opportunities: list[str]
    status: CandidateStatus
    error: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScreenSummary(BaseModel):
    id: UUID
    title: str
    status: ScreenStatus
    candidate_count: int
    scored_count: int
    top_score: int | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScreenDetail(BaseModel):
    id: UUID
    title: str
    jd_text: str
    status: ScreenStatus
    candidate_count: int
    scored_count: int
    top_score: int | None
    created_at: datetime
    updated_at: datetime
    candidates: list[ScreenCandidateOut]

    model_config = ConfigDict(from_attributes=True)
