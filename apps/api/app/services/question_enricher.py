"""Pre-generate copilot artefacts for each question.

For a given question, returns:
- `expected_answer`: a short paragraph on what a great answer covers.
- `evaluation_checklist`: 4-6 atomic points the recruiter can tick off as
  the candidate addresses them. Each phrased as a positive statement of
  what *should* be heard.
- `default_follow_ups`: 3 probing follow-ups the recruiter can ask if the
  answer is shallow or evasive.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any

from app.db.models import QuestionType, RoleType, Round
from app.services.llm.openrouter import complete_async
from app.services.question_generator import EXPERIENCE_GUIDANCE, ROLE_LABEL, ROUND_LABEL

SYSTEM_PROMPT = """You are an interview-evaluation copilot helping a senior recruiter run an interview.

Given an interview question (plus the role, round, experience level, and the JD), produce:
1. `expected_answer` — a concise paragraph (3-5 sentences) describing what a great answer to this question covers. Do not write a model answer; describe what a strong candidate would touch on.
2. `evaluation_checklist` — 4 to 6 atomic, positive points the recruiter can tick off as they hear them. Each point must be a discrete signal, phrased as the thing-to-hear, not as a question. Examples: "Names a specific production system they worked on", "Discusses idempotency key construction", "Mentions failure modes encountered in production".
3. `default_follow_ups` — exactly 3 probing follow-ups for when an answer is shallow, vague, or evasive. Each should target a *specific* claim or omission. Avoid generic prompts like "tell me more".

Calibrate the depth to the candidate's experience level.

Return ONLY a JSON object, no prose, no markdown fences:
{
  "expected_answer": "...",
  "evaluation_checklist": ["...", "..."],
  "default_follow_ups": ["...", "...", "..."]
}
"""


def _build_user_prompt(
    *,
    question_text: str,
    question_type: QuestionType,
    role_type: RoleType,
    round: Round,
    experience_level: str,
    jd_text: str | None,
    custom_instructions: str | None,
) -> str:
    parts = [
        f"Role: {ROLE_LABEL.get(role_type, role_type.value)}",
        f"Round: {ROUND_LABEL.get(round, round.value)}",
        f"Experience level: {experience_level} — {EXPERIENCE_GUIDANCE.get(experience_level, '')}",
        f"Question type: {question_type.value}",
        "",
        f"Question:\n{question_text}",
    ]
    if jd_text:
        parts.append(f"\nJob description (for context):\n{jd_text[:1500]}")
    if custom_instructions:
        parts.append(f"\nRecruiter instructions:\n{custom_instructions}")
    parts.append(
        "\nReturn ONLY the JSON object specified by the system."
    )
    return "\n".join(parts)


def _coerce(payload: dict[str, Any]) -> dict[str, Any]:
    expected = str(payload.get("expected_answer", "")).strip()
    checklist = payload.get("evaluation_checklist") or []
    follow_ups = payload.get("default_follow_ups") or []

    if not isinstance(checklist, list):
        checklist = []
    if not isinstance(follow_ups, list):
        follow_ups = []

    checklist = [str(x).strip() for x in checklist if isinstance(x, (str, int, float))]
    checklist = [c for c in checklist if c][:8]

    follow_ups = [str(x).strip() for x in follow_ups if isinstance(x, (str, int, float))]
    follow_ups = [f for f in follow_ups if f][:5]

    return {
        "expected_answer": expected,
        "evaluation_checklist": checklist,
        "default_follow_ups": follow_ups,
    }


async def enrich_one(
    *,
    question_text: str,
    question_type: QuestionType,
    role_type: RoleType,
    round: Round,
    experience_level: str,
    jd_text: str | None,
    custom_instructions: str | None,
) -> dict[str, Any]:
    user_prompt = _build_user_prompt(
        question_text=question_text,
        question_type=question_type,
        role_type=role_type,
        round=round,
        experience_level=experience_level,
        jd_text=jd_text,
        custom_instructions=custom_instructions,
    )
    raw = await complete_async(
        system=SYSTEM_PROMPT,
        user=user_prompt,
        temperature=0.3,
        json_mode=True,
    )
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end <= start:
            raise ValueError(f"Enricher returned unparseable JSON: {raw[:200]!r}")
        payload = json.loads(raw[start : end + 1])
    return _coerce(payload)


async def enrich_many(
    questions: list[dict[str, Any]],
    *,
    role_type: RoleType,
    round: Round,
    experience_level: str,
    jd_text: str | None,
    custom_instructions: str | None,
) -> list[dict[str, Any]]:
    """Enrich multiple questions in parallel. One LLM call per question.

    `questions` items must have `question_text` and `question_type`.
    Returns a list aligned with input order, each with the enricher payload.
    """
    tasks = [
        enrich_one(
            question_text=q["question_text"],
            question_type=q["question_type"],
            role_type=role_type,
            round=round,
            experience_level=experience_level,
            jd_text=jd_text,
            custom_instructions=custom_instructions,
        )
        for q in questions
    ]
    return await asyncio.gather(*tasks, return_exceptions=False)
