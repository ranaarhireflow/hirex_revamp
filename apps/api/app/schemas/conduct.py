from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import RoleType, Round


class QuestionConduct(BaseModel):
    """A question as seen by the recruiter while conducting."""

    id: UUID
    order_index: int
    question_text: str
    question_type: str
    round: Round
    generated_by: str
    time_minutes: int = 5

    expected_answer: str | None
    evaluation_checklist: list[str]
    default_follow_ups: list[str]
    conduct_status: str  # pending | asked | skipped | done

    # Response (nullable until first scored)
    score: int | None = None
    notes: str | None = None
    coverage: list[str] = Field(default_factory=list)
    follow_up_history: list[dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ConductState(BaseModel):
    interview_id: UUID
    candidate_name: str | None
    candidate_email: str
    role_type: RoleType
    current_round: Round
    experience_level: str
    custom_instructions: str | None
    tone: str
    language: str
    duration_limit_seconds: int
    question_limit: int

    questions: list[QuestionConduct]
    status: str  # interview.status


class ResponseUpsert(BaseModel):
    score: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None
    coverage: list[str] = Field(default_factory=list)
    follow_up_history: list[dict[str, Any]] = Field(default_factory=list)
    conduct_status: str | None = None  # asked | skipped | done


class FollowUpRequest(BaseModel):
    notes: str | None = None
    coverage: list[str] = Field(default_factory=list)


class FollowUpResponse(BaseModel):
    follow_up: str


class GenerateMoreRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=10)
    focus: str | None = None  # extra steer for THIS batch (combined with interview's custom_instructions)


class FinalizeResponse(BaseModel):
    interview_id: UUID
    overall_score: int
    recommendation: str
    advance_to_next_round: bool
    advance_reasoning: str
    strengths: list[str]
    concerns: list[str]
    per_question_summary: list[dict[str, Any]]
