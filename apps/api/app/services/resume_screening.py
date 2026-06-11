"""Resume screening — score uploaded resumes against a JD.

Two halves:
  1. `iter_resume_files` — turn the recruiter's uploads (individual files and/or
     ZIPs) into a flat list of (filename, bytes), filtered to supported types.
  2. `score_resume` / `process_screen` — LLM-score each resume against the JD and
     persist a match %, strengths, and opportunities. `process_screen` runs as a
     FastAPI BackgroundTask so the create request returns immediately and the UI
     polls for progress.

Mirrors the JSON-mode + defensive-parse + `_normalise` shape of
`question_generator.py` and `report_synthesizer.py`.
"""
from __future__ import annotations

import asyncio
import json
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import UploadFile

from app.db.models import CandidateStatus, ResumeScreen, ScreenCandidate, ScreenStatus
from app.db.session import SessionLocal
from app.services.llm.openrouter import complete_async
from app.services.upload import MAX_BYTES, extract_text_from_bytes

SUPPORTED_SUFFIXES = {".pdf", ".docx", ".txt", ".md"}
MAX_CANDIDATES = 50
# How many resumes to score against the LLM at once.
SCORE_CONCURRENCY = 5


def _is_supported(name: str) -> bool:
    p = Path(name)
    if not p.name or p.name.startswith("."):
        return False
    if "__MACOSX" in p.parts:
        return False
    return p.suffix.lower() in SUPPORTED_SUFFIXES


async def iter_resume_files(uploads: list[UploadFile]) -> list[tuple[str, bytes]]:
    """Flatten uploads into (display_name, bytes). ZIPs are unpacked in-memory.

    Skips directories, hidden files, __MACOSX junk, oversized entries, and
    anything that isn't a supported resume type. Caps the total at
    MAX_CANDIDATES so a huge ZIP can't blow up a batch.
    """
    out: list[tuple[str, bytes]] = []

    for up in uploads:
        raw = await up.read(MAX_BYTES + 1)
        fname = up.filename or "resume"
        if len(raw) > MAX_BYTES:
            # Skip oversized single files rather than fail the whole batch.
            continue

        if Path(fname).suffix.lower() == ".zip":
            try:
                with zipfile.ZipFile(BytesIO(raw)) as zf:
                    for info in zf.infolist():
                        if info.is_dir() or not _is_supported(info.filename):
                            continue
                        if info.file_size > MAX_BYTES:
                            continue
                        with zf.open(info) as f:
                            data = f.read()
                        out.append((Path(info.filename).name, data))
                        if len(out) >= MAX_CANDIDATES:
                            return out
            except zipfile.BadZipFile:
                continue
        elif _is_supported(fname):
            out.append((Path(fname).name, raw))

        if len(out) >= MAX_CANDIDATES:
            break

    return out


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an expert technical recruiter screening candidate resumes against a job description for the Indian hiring market (IT services, GCCs, mid-market SaaS).

Given a job description and ONE candidate's resume text, judge how well the candidate fits the role and return a structured assessment.

Hard rules:
- `match_score` is an integer 0-100 reflecting fit against THIS JD specifically — required skills, years of experience, domain, seniority. Be calibrated, not generous: a strong-but-not-perfect fit is ~70-85, a clear mismatch is below 40.
- `candidate_name`: extract the candidate's name from the resume. If you genuinely can't find it, use "".
- `strengths`: 3-6 SPECIFIC bullets on why this candidate fits — name the actual skills, companies, projects, or numbers from the resume that match the JD. No generic praise.
- `opportunities`: 3-6 SPECIFIC bullets on gaps, missing requirements, or areas to probe in an interview — what the JD asks for that the resume does NOT clearly show. No filler.
- `summary`: one crisp sentence — the hire-signal in a line.
- If the resume text is empty or unreadable, return match_score 0, empty strengths, and an opportunities note that the resume could not be parsed.
- Ground everything in the resume + JD. Do not invent experience the resume doesn't state.

Return ONLY a JSON object, no prose, no markdown fences:
{
  "candidate_name": "string",
  "match_score": 0-100 integer,
  "summary": "one sentence",
  "strengths": ["...", "..."],
  "opportunities": ["...", "..."]
}
"""


def _verdict(score: int) -> str:
    if score >= 75:
        return "strong_match"
    if score >= 50:
        return "possible"
    return "weak"


def _truncate(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[:limit] + "\n…[truncated]"


def _normalise(payload: dict[str, Any]) -> dict[str, Any]:
    score = payload.get("match_score", 0)
    try:
        score = max(0, min(100, int(round(float(score)))))
    except (ValueError, TypeError):
        score = 0

    def _list_of_str(key: str, limit: int) -> list[str]:
        items = payload.get(key) or []
        if not isinstance(items, list):
            return []
        return [str(x).strip() for x in items if isinstance(x, (str, int, float)) and str(x).strip()][:limit]

    name = str(payload.get("candidate_name", "") or "").strip()

    return {
        "candidate_name": name or None,
        "match_score": score,
        "verdict": _verdict(score),
        "summary": str(payload.get("summary", "") or "").strip(),
        "strengths": _list_of_str("strengths", 6),
        "opportunities": _list_of_str("opportunities", 6),
    }


async def score_resume(jd_text: str, resume_text: str | None) -> dict[str, Any]:
    user = "\n".join(
        [
            "=== Job description ===",
            _truncate(jd_text, 4000),
            "",
            "=== Candidate resume ===",
            _truncate((resume_text or "").strip() or "[no resume text could be extracted]", 6000),
            "",
            "Return ONLY the JSON object specified by the system.",
        ]
    )
    raw = await complete_async(
        system=SYSTEM_PROMPT,
        user=user,
        temperature=0.2,
        json_mode=True,
    )
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end <= start:
            raise ValueError(f"Screener returned unparseable JSON: {raw[:200]!r}")
        payload = json.loads(raw[start : end + 1])

    return _normalise(payload)


async def _score_one(
    sem: asyncio.Semaphore, candidate_id: UUID, jd_text: str, resume_text: str
) -> None:
    """Score a single candidate from in-memory resume text and persist only the
    derived result (no resume content is stored). Its own DB session + commit so
    the polling UI sees results land one at a time. Failures are recorded, never raised."""
    async with sem:
        try:
            result = await score_resume(jd_text, resume_text)
            patch: dict[str, Any] = {
                "match_score": result["match_score"],
                "verdict": result["verdict"],
                "summary": result["summary"],
                "strengths": result["strengths"],
                "opportunities": result["opportunities"],
                "status": CandidateStatus.scored,
            }
            if result["candidate_name"]:
                patch["candidate_name"] = result["candidate_name"]
        except Exception as e:  # noqa: BLE001 — one bad resume shouldn't sink the batch
            patch = {"status": CandidateStatus.failed, "error": f"{type(e).__name__}: {e}"[:500]}

        session = SessionLocal()
        try:
            cand = session.get(ScreenCandidate, candidate_id)
            if cand is None:
                return
            for k, v in patch.items():
                setattr(cand, k, v)
            session.commit()
        finally:
            session.close()


async def process_screen(screen_id: UUID, resume_texts: dict[UUID, str]) -> None:
    """Background entrypoint: score each candidate from in-memory `resume_texts`
    (keyed by candidate id), then mark the batch. The resume text is never
    persisted — it exists only for the lifetime of this task."""
    session = SessionLocal()
    try:
        screen = session.get(ResumeScreen, screen_id)
        if screen is None:
            return
        jd_text = screen.jd_text
    finally:
        session.close()

    if resume_texts:
        sem = asyncio.Semaphore(SCORE_CONCURRENCY)
        await asyncio.gather(
            *(_score_one(sem, cid, jd_text, text) for cid, text in resume_texts.items())
        )

    # Finalise batch status based on outcomes.
    session = SessionLocal()
    try:
        screen = session.get(ResumeScreen, screen_id)
        if screen is None:
            return
        statuses = [c.status for c in screen.candidates]
        if statuses and all(s == CandidateStatus.failed for s in statuses):
            screen.status = ScreenStatus.failed
        else:
            screen.status = ScreenStatus.completed
        session.commit()
    finally:
        session.close()
