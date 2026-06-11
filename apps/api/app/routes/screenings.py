from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db.models import CandidateStatus, ResumeScreen, ScreenCandidate, ScreenStatus
from app.db.session import get_session
from app.schemas.screening import ScreenCandidateOut, ScreenDetail, ScreenSummary
from app.services.resume_screening import iter_resume_files, process_screen
from app.services.upload import extract_text_from_bytes

router = APIRouter(prefix="/screenings", tags=["screenings"])


def _scored_count(screen: ResumeScreen) -> int:
    return sum(1 for c in screen.candidates if c.status == CandidateStatus.scored)


def _top_score(screen: ResumeScreen) -> int | None:
    scores = [c.match_score for c in screen.candidates if c.match_score is not None]
    return max(scores) if scores else None


def _summary(screen: ResumeScreen) -> ScreenSummary:
    return ScreenSummary(
        id=screen.id,
        title=screen.title,
        status=screen.status,
        candidate_count=screen.candidate_count,
        scored_count=_scored_count(screen),
        top_score=_top_score(screen),
        created_at=screen.created_at,
    )


def _candidate_sort_key(c: ScreenCandidate) -> tuple[int, int, str]:
    # Scored-with-a-score first (highest match on top), then everything else by name.
    has_score = 0 if c.match_score is not None else 1
    return (has_score, -(c.match_score or 0), (c.file_name or "").lower())


def _detail(screen: ResumeScreen) -> ScreenDetail:
    ordered = sorted(screen.candidates, key=_candidate_sort_key)
    return ScreenDetail(
        id=screen.id,
        title=screen.title,
        jd_text=screen.jd_text,
        status=screen.status,
        candidate_count=screen.candidate_count,
        scored_count=_scored_count(screen),
        top_score=_top_score(screen),
        created_at=screen.created_at,
        updated_at=screen.updated_at,
        candidates=[ScreenCandidateOut.model_validate(c) for c in ordered],
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ScreenDetail)
async def create_screening(
    background: BackgroundTasks,
    jd_text: Annotated[str, Form(min_length=20)],
    files: Annotated[list[UploadFile], File()],
    title: Annotated[str | None, Form()] = None,
    session: Session = Depends(get_session),
) -> ScreenDetail:
    resumes = await iter_resume_files(files)
    if not resumes:
        raise HTTPException(
            status_code=400,
            detail="No supported resumes found. Upload PDF, DOCX, or text files (or a ZIP of them).",
        )

    screen = ResumeScreen(
        title=(title or "").strip() or "Untitled screening",
        jd_text=jd_text,
        status=ScreenStatus.processing,
        candidate_count=len(resumes),
    )
    session.add(screen)
    session.flush()

    # Extract text in memory and hand it to the background scorer. The resume
    # file and its text are NEVER persisted — only the candidate row (filename
    # metadata) and, later, the derived assessment.
    resume_texts: dict[UUID, str] = {}
    for file_name, raw in resumes:
        candidate = ScreenCandidate(
            screen_id=screen.id,
            file_name=file_name,
            status=CandidateStatus.pending,
        )
        session.add(candidate)
        session.flush()
        resume_texts[candidate.id] = extract_text_from_bytes(raw, file_name)

    session.commit()
    session.refresh(screen)

    background.add_task(process_screen, screen.id, resume_texts)
    return _detail(screen)


@router.get("", response_model=list[ScreenSummary])
def list_screenings(session: Session = Depends(get_session)) -> list[ScreenSummary]:
    rows = session.scalars(select(ResumeScreen).order_by(desc(ResumeScreen.created_at))).all()
    return [_summary(s) for s in rows]


@router.get("/{screen_id}", response_model=ScreenDetail)
def get_screening(screen_id: UUID, session: Session = Depends(get_session)) -> ScreenDetail:
    screen = session.get(ResumeScreen, screen_id)
    if screen is None:
        raise HTTPException(status_code=404, detail="screening not found")
    return _detail(screen)


@router.delete("/{screen_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_screening(screen_id: UUID, session: Session = Depends(get_session)) -> None:
    screen = session.get(ResumeScreen, screen_id)
    if screen is None:
        raise HTTPException(status_code=404, detail="screening not found")
    session.delete(screen)
    session.commit()
