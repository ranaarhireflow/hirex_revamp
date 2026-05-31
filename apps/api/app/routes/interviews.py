import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import (
    GeneratedBy,
    Interview,
    Question,
    QuestionTemplate,
    QuestionType,
    RoleType,
    RoleVariant,
    Round,
)
from app.db.session import get_session
from app.schemas.interview import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    GeneratedQuestion,
    InterviewDetail,
    InterviewOut,
    InterviewSummary,
)
from app.schemas.question_template import QuestionTemplateOut
from app.services.jwt_token import issue_candidate_token
from app.services.question_generator import generate_questions
from app.services.upload import save_resume

router = APIRouter(prefix="/interviews", tags=["interviews"])


def _candidate_url(token: str) -> str:
    return f"{settings.next_public_app_url}/interview/{token}"


def _summarize(interview: Interview) -> InterviewOut:
    return InterviewOut(
        id=interview.id,
        candidate_email=interview.candidate_email,
        candidate_name=interview.candidate_name,
        role_type=interview.role_type,
        role_variant=interview.role_variant,
        jd_text=interview.jd_text,
        resume_url=interview.resume_url,
        current_round=interview.current_round,
        status=interview.status,
        duration_limit_seconds=interview.duration_limit_seconds,
        question_limit=interview.question_limit,
        custom_instructions=interview.custom_instructions,
        tone=interview.tone,
        language=interview.language,
        experience_level=interview.experience_level,
        years_experience=interview.years_experience,
        candidate_token=interview.candidate_token,
        candidate_url=_candidate_url(interview.candidate_token),
        created_at=interview.created_at,
        updated_at=interview.updated_at,
    )


def _detail(interview: Interview, questions: list[Question]) -> InterviewDetail:
    base = _summarize(interview)
    return InterviewDetail(
        **base.model_dump(),
        questions=[
            {
                "id": q.id,
                "order_index": q.order_index,
                "question_text": q.question_text,
                "question_type": q.question_type.value,
                "round": q.round.value,
                "generated_by": q.generated_by.value,
                "time_minutes": q.time_minutes,
            }
            for q in questions
        ],
    )


def _materialize_questions(
    session: Session,
    interview: Interview,
    template_ids: list[UUID],
    custom_questions: list[dict],
) -> None:
    order = 0

    # Default minutes by question type for custom questions that don't specify one.
    DEFAULT_MIN = {
        QuestionType.behavioural: 4,
        QuestionType.technical: 6,
        QuestionType.coding: 12,
        QuestionType.system_design: 12,
    }

    if template_ids:
        templates = {
            t.id: t
            for t in session.scalars(
                select(QuestionTemplate).where(QuestionTemplate.id.in_(template_ids))
            ).all()
        }
        for tid in template_ids:
            t = templates.get(tid)
            if t is None:
                continue
            session.add(
                Question(
                    interview_id=interview.id,
                    round=t.round,
                    order_index=order,
                    question_text=t.question_text,
                    question_type=t.question_type,
                    expected_rubric=t.rubric,
                    generated_by=GeneratedBy.template,
                    time_minutes=t.time_minutes,
                )
            )
            order += 1

    for cq in custom_questions:
        qtype_raw = cq.get("question_type", "behavioural")
        try:
            qtype = QuestionType(qtype_raw)
        except ValueError:
            qtype = QuestionType.behavioural
        text = (cq.get("question_text") or "").strip()
        if not text:
            continue
        try:
            minutes = int(cq.get("time_minutes") or DEFAULT_MIN[qtype])
            minutes = max(2, min(20, minutes))
        except (ValueError, TypeError):
            minutes = DEFAULT_MIN[qtype]
        session.add(
            Question(
                interview_id=interview.id,
                round=interview.current_round,
                order_index=order,
                question_text=text,
                question_type=qtype,
                generated_by=GeneratedBy.template,
                time_minutes=minutes,
            )
        )
        order += 1


@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions_route(
    payload: GenerateQuestionsRequest,
) -> GenerateQuestionsResponse:
    """Call DeepSeek via OpenRouter to generate role-aware questions.

    Stateless — does not persist anything. The recruiter reviews the questions in
    the UI; selected ones are sent back as `custom_questions_json` on the
    interview-create call, optionally also saved to the bank as templates.
    """
    try:
        questions = await generate_questions(
            role_type=payload.role_type,
            round=payload.round,
            experience_level=payload.experience_level,
            years_experience=payload.years_experience,
            jd_text=payload.jd_text,
            resume_text=payload.resume_text,
            custom_instructions=payload.custom_instructions,
            count=payload.count,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"LLM returned unparseable output: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM call failed: {type(e).__name__}: {e}")

    return GenerateQuestionsResponse(
        questions=[GeneratedQuestion(**q) for q in questions]
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=InterviewDetail)
async def create_interview(
    candidate_email: Annotated[str, Form()],
    role_type: Annotated[RoleType, Form()],
    jd_text: Annotated[str, Form(min_length=20)],
    candidate_name: Annotated[str | None, Form()] = None,
    role_variant: Annotated[RoleVariant, Form()] = RoleVariant.marquee,
    current_round: Annotated[Round, Form()] = Round.R1,
    duration_limit_seconds: Annotated[int, Form(ge=60, le=14400)] = 1800,
    question_limit: Annotated[int, Form(ge=1, le=20)] = 6,
    custom_instructions: Annotated[str | None, Form()] = None,
    tone: Annotated[str, Form()] = "professional",
    language: Annotated[str, Form()] = "english",
    experience_level: Annotated[str, Form()] = "mid",
    years_experience: Annotated[int | None, Form()] = None,
    template_ids_json: Annotated[str, Form()] = "[]",
    custom_questions_json: Annotated[str, Form()] = "[]",
    resume: Annotated[UploadFile | None, File()] = None,
    session: Session = Depends(get_session),
) -> InterviewDetail:
    try:
        template_ids = [UUID(x) for x in json.loads(template_ids_json or "[]")]
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="template_ids_json must be a JSON array of UUIDs")

    try:
        custom_questions = json.loads(custom_questions_json or "[]")
        if not isinstance(custom_questions, list):
            raise ValueError
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="custom_questions_json must be a JSON array")

    resume_url: str | None = None
    resume_text: str | None = None
    if resume is not None and resume.filename:
        try:
            resume_url, resume_text = await save_resume(resume)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    interview = Interview(
        candidate_email=candidate_email,
        candidate_name=candidate_name,
        role_type=role_type,
        role_variant=role_variant,
        jd_text=jd_text,
        resume_text=resume_text,
        resume_url=resume_url,
        current_round=current_round,
        duration_limit_seconds=duration_limit_seconds,
        question_limit=question_limit,
        custom_instructions=custom_instructions,
        tone=tone,
        language=language,
        experience_level=experience_level,
        years_experience=years_experience,
        candidate_token="pending",
    )
    session.add(interview)
    session.flush()
    interview.candidate_token = issue_candidate_token(interview.id)

    _materialize_questions(session, interview, template_ids, custom_questions)

    session.commit()
    session.refresh(interview)

    questions = list(
        session.scalars(
            select(Question)
            .where(Question.interview_id == interview.id)
            .order_by(Question.order_index)
        ).all()
    )
    return _detail(interview, questions)


@router.get("", response_model=list[InterviewSummary])
def list_interviews(session: Session = Depends(get_session)) -> list[InterviewSummary]:
    rows = session.scalars(select(Interview).order_by(desc(Interview.created_at))).all()
    return [InterviewSummary.model_validate(r) for r in rows]


@router.get("/{interview_id}", response_model=InterviewDetail)
def get_interview(interview_id: UUID, session: Session = Depends(get_session)) -> InterviewDetail:
    interview = session.get(Interview, interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="interview not found")
    questions = list(
        session.scalars(
            select(Question)
            .where(Question.interview_id == interview.id)
            .order_by(Question.order_index)
        ).all()
    )
    return _detail(interview, questions)


@router.get("/{interview_id}/suggested-templates", response_model=list[QuestionTemplateOut])
def suggested_templates(
    interview_id: UUID,
    session: Session = Depends(get_session),
) -> list[QuestionTemplateOut]:
    interview = session.get(Interview, interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="interview not found")
    rows = session.scalars(
        select(QuestionTemplate)
        .where(
            QuestionTemplate.role_type == interview.role_type,
            QuestionTemplate.round == interview.current_round,
        )
        .order_by(desc(QuestionTemplate.is_starter), QuestionTemplate.created_at)
    ).all()
    return [QuestionTemplateOut.model_validate(r) for r in rows]
