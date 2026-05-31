from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import QuestionType, RoleType, Round


class QuestionTemplateOut(BaseModel):
    id: UUID
    role_type: RoleType
    round: Round
    question_text: str
    question_type: QuestionType
    difficulty: str
    experience_levels: list[str]
    time_minutes: int
    rubric: dict[str, Any] | None
    is_starter: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QuestionTemplateCreate(BaseModel):
    role_type: RoleType
    round: Round
    question_text: str = Field(min_length=8)
    question_type: QuestionType
    difficulty: str = "medium"
    experience_levels: list[str] = Field(default_factory=list)
    time_minutes: int = Field(default=5, ge=2, le=30)
    rubric: dict[str, Any] | None = None


class QuestionTemplateUpdate(BaseModel):
    role_type: RoleType | None = None
    round: Round | None = None
    question_text: str | None = Field(default=None, min_length=8)
    question_type: QuestionType | None = None
    difficulty: str | None = None
    experience_levels: list[str] | None = None
    time_minutes: int | None = Field(default=None, ge=2, le=30)
    rubric: dict[str, Any] | None = None
