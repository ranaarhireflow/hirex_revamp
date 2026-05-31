"""Recruiter-copilot conduct flow.

- `POST /interviews/{id}/conduct/start` — kicks off conducting; if not already
  done, enriches every question with expected_answer + checklist + default
  follow-ups (parallel LLM calls).
- `GET /interviews/{id}/conduct` — fetch current state (questions + responses).
- `PATCH /questions/{id}/response` — recruiter updates score/notes/coverage.
- `POST /questions/{id}/follow-up` — generate a single on-demand follow-up.
- `POST /interviews/{id}/conduct/finalize` — synthesise the final report.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    GeneratedBy,
    Interview,
    InterviewStatus,
    Question,
    QuestionType,
    Recommendation,
    Report,
    Response as ResponseModel,
)
from app.db.session import SessionLocal, get_session
from app.schemas.conduct import (
    ConductState,
    FinalizeResponse,
    FollowUpRequest,
    FollowUpResponse,
    GenerateMoreRequest,
    QuestionConduct,
    ResponseUpsert,
)
from app.services.follow_up import generate_follow_up
from app.services.question_enricher import enrich_many
from app.services.question_generator import generate_questions
from app.services.report_synthesizer import synthesise_report

router = APIRouter(tags=["conduct"])


# ---------- helpers ----------------------------------------------------------


def _question_to_conduct(q: Question, response: ResponseModel | None) -> QuestionConduct:
    coverage: list[str] = []
    follow_up_history: list[dict[str, Any]] = []
    if response and response.rubric_match and isinstance(response.rubric_match, dict):
        coverage = list(response.rubric_match.get("coverage") or [])
    if response and response.follow_ups and isinstance(response.follow_ups, list):
        follow_up_history = list(response.follow_ups)

    return QuestionConduct(
        id=q.id,
        order_index=q.order_index,
        question_text=q.question_text,
        question_type=q.question_type.value,
        round=q.round,
        generated_by=q.generated_by.value,
        time_minutes=q.time_minutes,
        expected_answer=q.expected_answer,
        evaluation_checklist=list(q.evaluation_checklist or []),
        default_follow_ups=list(q.default_follow_ups or []),
        conduct_status=q.conduct_status,
        score=response.score if response else None,
        notes=response.transcript if response else None,
        coverage=coverage,
        follow_up_history=follow_up_history,
    )


def _load_conduct_state(session: Session, interview_id: UUID) -> ConductState:
    interview = session.get(Interview, interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="interview not found")
    questions = list(
        session.scalars(
            select(Question).where(Question.interview_id == interview.id).order_by(Question.order_index)
        ).all()
    )
    qids = [q.id for q in questions]
    responses = {
        r.question_id: r
        for r in session.scalars(
            select(ResponseModel).where(ResponseModel.question_id.in_(qids))
        ).all()
    } if qids else {}

    return ConductState(
        interview_id=interview.id,
        candidate_name=interview.candidate_name,
        candidate_email=interview.candidate_email,
        role_type=interview.role_type,
        current_round=interview.current_round,
        experience_level=interview.experience_level,
        custom_instructions=interview.custom_instructions,
        tone=interview.tone,
        language=interview.language,
        duration_limit_seconds=interview.duration_limit_seconds,
        question_limit=interview.question_limit,
        questions=[_question_to_conduct(q, responses.get(q.id)) for q in questions],
        status=interview.status.value,
    )


# ---------- routes -----------------------------------------------------------


@router.get("/interviews/{interview_id}/conduct", response_model=ConductState)
def get_conduct_state(
    interview_id: UUID,
    session: Session = Depends(get_session),
) -> ConductState:
    return _load_conduct_state(session, interview_id)


@router.post("/interviews/{interview_id}/conduct/start", response_model=ConductState)
async def start_conducting(interview_id: UUID) -> ConductState:
    """Enrich every un-enriched question with expected_answer + checklist +
    default follow-ups (one parallel LLM batch), then mark the interview as
    in_progress. Idempotent — re-running only enriches the still-empty ones."""
    # Use a fresh session — we run async LLM calls between DB reads/writes.
    session = SessionLocal()
    try:
        interview = session.get(Interview, interview_id)
        if interview is None:
            raise HTTPException(status_code=404, detail="interview not found")

        all_questions = list(
            session.scalars(
                select(Question)
                .where(Question.interview_id == interview.id)
                .order_by(Question.order_index)
            ).all()
        )
        # Only enrich questions missing expected_answer (idempotent re-run).
        to_enrich = [q for q in all_questions if not q.expected_answer]

        if to_enrich:
            payloads = [
                {"question_text": q.question_text, "question_type": q.question_type}
                for q in to_enrich
            ]
            enriched = await enrich_many(
                payloads,
                role_type=interview.role_type,
                round=interview.current_round,
                experience_level=interview.experience_level,
                jd_text=interview.jd_text,
                custom_instructions=interview.custom_instructions,
            )
            for q, payload in zip(to_enrich, enriched):
                q.expected_answer = payload["expected_answer"]
                q.evaluation_checklist = payload["evaluation_checklist"]
                q.default_follow_ups = payload["default_follow_ups"]

        if interview.status == InterviewStatus.created:
            interview.status = InterviewStatus.in_progress

        session.commit()
        return _load_conduct_state(session, interview_id)
    finally:
        session.close()


@router.patch("/questions/{question_id}/response", response_model=QuestionConduct)
def upsert_response(
    question_id: UUID,
    payload: ResponseUpsert,
    session: Session = Depends(get_session),
) -> QuestionConduct:
    question = session.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="question not found")

    response = session.scalar(
        select(ResponseModel).where(ResponseModel.question_id == question_id)
    )
    if response is None:
        response = ResponseModel(
            question_id=question_id,
            transcript=payload.notes or "",
            score=payload.score,
            rubric_match={"coverage": payload.coverage},
            follow_ups=payload.follow_up_history,
        )
        session.add(response)
    else:
        if payload.notes is not None:
            response.transcript = payload.notes
        if payload.score is not None:
            response.score = payload.score
        response.rubric_match = {"coverage": payload.coverage}
        response.follow_ups = payload.follow_up_history

    if payload.conduct_status:
        question.conduct_status = payload.conduct_status

    session.commit()
    session.refresh(question)
    session.refresh(response)
    return _question_to_conduct(question, response)


@router.post("/questions/{question_id}/follow-up", response_model=FollowUpResponse)
async def follow_up_question(
    question_id: UUID,
    payload: FollowUpRequest,
) -> FollowUpResponse:
    session = SessionLocal()
    try:
        question = session.get(Question, question_id)
        if question is None:
            raise HTTPException(status_code=404, detail="question not found")
        interview = session.get(Interview, question.interview_id)
        if interview is None:
            raise HTTPException(status_code=404, detail="parent interview not found")

        try:
            text = await generate_follow_up(
                role_type=interview.role_type,
                original_question=question.question_text,
                expected_answer=question.expected_answer,
                checklist=list(question.evaluation_checklist or []),
                points_covered=payload.coverage,
                recruiter_notes=payload.notes,
            )
        except ValueError as e:
            raise HTTPException(status_code=502, detail=f"LLM error: {e}")
        return FollowUpResponse(follow_up=text)
    finally:
        session.close()


@router.post("/interviews/{interview_id}/conduct/generate-more", response_model=ConductState)
async def generate_more_questions(
    interview_id: UUID,
    payload: GenerateMoreRequest,
) -> ConductState:
    """Generate N more questions mid-interview, enrich them, append to the queue.

    Uses the interview's JD + custom_instructions + the recruiter's per-batch
    `focus` prompt. Tells the LLM the existing question texts so it doesn't
    repeat them.
    """
    session = SessionLocal()
    try:
        interview = session.get(Interview, interview_id)
        if interview is None:
            raise HTTPException(status_code=404, detail="interview not found")

        existing = list(
            session.scalars(
                select(Question)
                .where(Question.interview_id == interview.id)
                .order_by(Question.order_index)
            ).all()
        )
        existing_texts = [q.question_text for q in existing]
        max_order = max((q.order_index for q in existing), default=-1)

        # 1. Generate N new questions tailored to the JD + focus, avoiding repeats.
        try:
            new_qs = await generate_questions(
                role_type=interview.role_type,
                round=interview.current_round,
                experience_level=interview.experience_level,
                years_experience=interview.years_experience,
                jd_text=interview.jd_text,
                resume_text=interview.resume_text,
                custom_instructions=interview.custom_instructions,
                count=payload.count,
                existing_questions=existing_texts,
                focus=payload.focus,
            )
        except ValueError as e:
            raise HTTPException(status_code=502, detail=f"LLM generator error: {e}")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM generator failed: {type(e).__name__}: {e}")

        if not new_qs:
            raise HTTPException(status_code=502, detail="LLM returned no usable questions")

        # 2. Enrich them in parallel (expected_answer + checklist + follow-ups).
        try:
            enriched = await enrich_many(
                [
                    {"question_text": q["question_text"], "question_type": QuestionType(q["question_type"])}
                    for q in new_qs
                ],
                role_type=interview.role_type,
                round=interview.current_round,
                experience_level=interview.experience_level,
                jd_text=interview.jd_text,
                custom_instructions=interview.custom_instructions,
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"LLM enricher failed: {type(e).__name__}: {e}")

        # 3. Insert with continued order_index.
        for i, (gen, enr) in enumerate(zip(new_qs, enriched)):
            try:
                qtype = QuestionType(gen["question_type"])
            except ValueError:
                qtype = QuestionType.behavioural
            session.add(
                Question(
                    interview_id=interview.id,
                    round=interview.current_round,
                    order_index=max_order + 1 + i,
                    question_text=gen["question_text"],
                    question_type=qtype,
                    generated_by=GeneratedBy.llm,
                    expected_answer=enr["expected_answer"],
                    evaluation_checklist=enr["evaluation_checklist"],
                    default_follow_ups=enr["default_follow_ups"],
                    conduct_status="pending",
                    time_minutes=int(gen.get("time_minutes") or 5),
                )
            )
        session.commit()

        return _load_conduct_state(session, interview_id)
    finally:
        session.close()


@router.post("/interviews/{interview_id}/conduct/finalize", response_model=FinalizeResponse)
async def finalize_interview(interview_id: UUID) -> FinalizeResponse:
    session = SessionLocal()
    try:
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
        qids = [q.id for q in questions]
        responses = {
            r.question_id: r
            for r in session.scalars(
                select(ResponseModel).where(ResponseModel.question_id.in_(qids))
            ).all()
        } if qids else {}

        payload_questions: list[dict[str, Any]] = []
        for q in questions:
            r = responses.get(q.id)
            coverage = []
            if r and r.rubric_match and isinstance(r.rubric_match, dict):
                coverage = list(r.rubric_match.get("coverage") or [])
            payload_questions.append({
                "order_index": q.order_index,
                "question_text": q.question_text,
                "question_type": q.question_type.value,
                "checklist": list(q.evaluation_checklist or []),
                "coverage": coverage,
                "score": r.score if r else None,
                "notes": r.transcript if r else None,
                "status": q.conduct_status,
            })

        try:
            report_payload = await synthesise_report(
                role_type=interview.role_type,
                round=interview.current_round,
                experience_level=interview.experience_level,
                custom_instructions=interview.custom_instructions,
                questions=payload_questions,
            )
        except ValueError as e:
            raise HTTPException(status_code=502, detail=f"LLM error: {e}")

        try:
            rec_enum = Recommendation(report_payload["recommendation"])
        except ValueError:
            rec_enum = Recommendation.no_hire

        # Upsert the Report row
        existing = session.scalar(
            select(Report).where(Report.interview_id == interview.id)
        )
        if existing is None:
            existing = Report(
                interview_id=interview.id,
                overall_score=report_payload["overall_score"],
                recommendation=rec_enum,
                strengths=report_payload["strengths"],
                concerns=report_payload["concerns"],
                per_question_summary={
                    "items": report_payload["per_question_summary"],
                    "advance_to_next_round": report_payload["advance_to_next_round"],
                    "advance_reasoning": report_payload["advance_reasoning"],
                },
            )
            session.add(existing)
        else:
            existing.overall_score = report_payload["overall_score"]
            existing.recommendation = rec_enum
            existing.strengths = report_payload["strengths"]
            existing.concerns = report_payload["concerns"]
            existing.per_question_summary = {
                "items": report_payload["per_question_summary"],
                "advance_to_next_round": report_payload["advance_to_next_round"],
                "advance_reasoning": report_payload["advance_reasoning"],
            }

        interview.status = InterviewStatus.completed
        session.commit()

        return FinalizeResponse(
            interview_id=interview.id,
            overall_score=report_payload["overall_score"],
            recommendation=report_payload["recommendation"],
            advance_to_next_round=report_payload["advance_to_next_round"],
            advance_reasoning=report_payload["advance_reasoning"],
            strengths=report_payload["strengths"],
            concerns=report_payload["concerns"],
            per_question_summary=report_payload["per_question_summary"],
        )
    finally:
        session.close()
