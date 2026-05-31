from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db.models import InterviewStatus, RoleType, RoleVariant, Round


class InterviewSummary(BaseModel):
    id: UUID
    candidate_email: str
    candidate_name: str | None
    role_type: RoleType
    current_round: Round
    experience_level: str
    status: InterviewStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewOut(BaseModel):
    id: UUID
    candidate_email: str
    candidate_name: str | None
    role_type: RoleType
    role_variant: RoleVariant
    jd_text: str
    resume_url: str | None
    current_round: Round
    status: InterviewStatus
    duration_limit_seconds: int
    question_limit: int
    custom_instructions: str | None
    tone: str
    language: str
    experience_level: str
    years_experience: int | None
    candidate_token: str
    candidate_url: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuestionInInterview(BaseModel):
    id: UUID
    order_index: int
    question_text: str
    question_type: str
    round: str
    generated_by: str
    time_minutes: int = 5


class InterviewDetail(InterviewOut):
    questions: list[QuestionInInterview] = Field(default_factory=list)


class GenerateQuestionsRequest(BaseModel):
    role_type: RoleType
    round: Round = Round.R1
    experience_level: str = "mid"
    years_experience: int | None = None
    jd_text: str = Field(min_length=20)
    resume_text: str | None = None
    custom_instructions: str | None = None
    count: int = Field(default=6, ge=2, le=15)


class GeneratedQuestion(BaseModel):
    question_text: str
    question_type: str
    difficulty: str
    experience_levels: list[str]
    time_minutes: int = 5


class GenerateQuestionsResponse(BaseModel):
    questions: list[GeneratedQuestion]
