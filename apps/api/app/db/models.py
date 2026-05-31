import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class RoleType(str, enum.Enum):
    backend = "backend"
    frontend = "frontend"
    fullstack = "fullstack"
    data = "data"
    ml = "ml"
    devops = "devops"
    product = "product"
    hr = "hr"


# Free-form string column rather than a Postgres enum — experience taxonomies
# vary by company. Frontend ships a canonical list (`EXPERIENCE_LEVELS`) but the
# DB stays permissive so recruiters can add custom labels later.
EXPERIENCE_LEVELS_CANONICAL = ("fresher", "junior", "mid", "senior", "lead", "staff")


class RoleVariant(str, enum.Enum):
    marquee = "marquee"
    new = "new"


class Round(str, enum.Enum):
    R1 = "R1"
    R2 = "R2"
    R3 = "R3"


class InterviewStatus(str, enum.Enum):
    created = "created"
    scheduled = "scheduled"
    in_progress = "in_progress"
    completed = "completed"
    expired = "expired"


class QuestionType(str, enum.Enum):
    behavioural = "behavioural"
    technical = "technical"
    coding = "coding"
    system_design = "system_design"


class GeneratedBy(str, enum.Enum):
    template = "template"
    llm = "llm"


class Recommendation(str, enum.Enum):
    strong_hire = "strong_hire"
    hire = "hire"
    no_hire = "no_hire"
    strong_no_hire = "strong_no_hire"


def _utcnow() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String)
    clerk_id: Mapped[str | None] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recruiter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    candidate_email: Mapped[str] = mapped_column(String, nullable=False)
    candidate_name: Mapped[str | None] = mapped_column(String)
    role_type: Mapped[RoleType] = mapped_column(SAEnum(RoleType, name="role_type"), nullable=False)
    role_variant: Mapped[RoleVariant] = mapped_column(
        SAEnum(RoleVariant, name="role_variant"), nullable=False
    )
    jd_text: Mapped[str] = mapped_column(Text, nullable=False)
    resume_text: Mapped[str | None] = mapped_column(Text)
    resume_url: Mapped[str | None] = mapped_column(String)
    current_round: Mapped[Round] = mapped_column(
        SAEnum(Round, name="round"), default=Round.R1, nullable=False
    )
    status: Mapped[InterviewStatus] = mapped_column(
        SAEnum(InterviewStatus, name="interview_status"),
        default=InterviewStatus.created,
        nullable=False,
    )
    duration_limit_seconds: Mapped[int] = mapped_column(Integer, default=1800, nullable=False)
    question_limit: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    candidate_token: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # Recruiter-controlled interviewer behavior
    custom_instructions: Mapped[str | None] = mapped_column(Text)
    tone: Mapped[str] = mapped_column(String, default="professional", nullable=False)
    language: Mapped[str] = mapped_column(String, default="english", nullable=False)
    experience_level: Mapped[str] = mapped_column(String, default="mid", nullable=False)
    years_experience: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, onupdate=_utcnow, nullable=False
    )

    questions: Mapped[list["Question"]] = relationship(
        back_populates="interview", cascade="all, delete-orphan", order_by="Question.order_index"
    )
    report: Mapped["Report | None"] = relationship(
        back_populates="interview", uselist=False, cascade="all, delete-orphan"
    )


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False
    )
    round: Mapped[Round] = mapped_column(SAEnum(Round, name="round"), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(
        SAEnum(QuestionType, name="question_type"), nullable=False
    )
    expected_rubric: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    generated_by: Mapped[GeneratedBy] = mapped_column(
        SAEnum(GeneratedBy, name="generated_by"), nullable=False
    )
    time_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    # Copilot enrichment — populated by the AI when the recruiter starts conducting.
    expected_answer: Mapped[str | None] = mapped_column(Text)
    evaluation_checklist: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    default_follow_ups: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    # pending | asked | skipped | done
    conduct_status: Mapped[str] = mapped_column(String, default="pending", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    interview: Mapped[Interview] = relationship(back_populates="questions")
    response: Mapped["Response | None"] = relationship(
        back_populates="question", uselist=False, cascade="all, delete-orphan"
    )


class Response(Base):
    __tablename__ = "responses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    transcript: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[str | None] = mapped_column(String)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    follow_ups: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, default=list)
    score: Mapped[int | None] = mapped_column(Integer)
    score_reasoning: Mapped[str | None] = mapped_column(Text)
    rubric_match: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    question: Mapped[Question] = relationship(back_populates="response")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("interviews.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    recommendation: Mapped[Recommendation] = mapped_column(
        SAEnum(Recommendation, name="recommendation"), nullable=False
    )
    strengths: Mapped[list[str]] = mapped_column(JSONB, default=list)
    concerns: Mapped[list[str]] = mapped_column(JSONB, default=list)
    per_question_summary: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    pdf_url: Mapped[str | None] = mapped_column(String)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    interview: Mapped[Interview] = relationship(back_populates="report")


class QuestionTemplate(Base):
    """Reusable question library, owned by recruiters.

    Stage 2.5: recruiter-facing CRUD. Pre-seeded with starter questions for
    each role × round. On interview creation, selected templates are
    materialized as `Question` rows tied to the interview.
    """

    __tablename__ = "question_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_type: Mapped[RoleType] = mapped_column(SAEnum(RoleType, name="role_type"), nullable=False)
    round: Mapped[Round] = mapped_column(SAEnum(Round, name="round"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(
        SAEnum(QuestionType, name="question_type"), nullable=False
    )
    difficulty: Mapped[str] = mapped_column(String, default="medium", nullable=False)
    # Which experience levels this question fits — empty list = any.
    experience_levels: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    # Estimated time in minutes — used to derive the question count from the
    # interview's total duration budget.
    time_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    rubric: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    is_starter: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, onupdate=_utcnow, nullable=False
    )
