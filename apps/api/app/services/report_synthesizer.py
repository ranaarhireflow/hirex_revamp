"""Synthesise the final candidate report from the recruiter's marks.

Reads each question + the recruiter's score + notes + coverage and asks
the LLM to produce:
- overall_score (1-5)
- recommendation (strong_hire | hire | no_hire | strong_no_hire)
- strengths (3-5 bullets)
- concerns (3-5 bullets)
- per_question_summary (one line per question)
- advance_to_next_round (bool — tied to recommendation)
- advance_reasoning (one sentence on why advance / don't)
"""
from __future__ import annotations

import json
from typing import Any

from app.db.models import RoleType, Round
from app.services.llm.openrouter import complete_async
from app.services.question_generator import EXPERIENCE_GUIDANCE, ROLE_LABEL, ROUND_LABEL


SYSTEM_PROMPT = """You are a senior hiring-decision synthesiser. Given a recruiter's per-question marks and notes from a live interview, produce a structured hiring report.

Hard rules:
- Trust the recruiter's scores and notes — they were in the room. Do NOT contradict them.
- The recommendation must follow from the scores. As a rough rubric:
    avg ≥ 4.2 → strong_hire
    avg 3.4–4.2 → hire
    avg 2.4–3.4 → no_hire
    avg < 2.4 → strong_no_hire
- BUT if any single answer was scored 1 on a critical question type (technical/system_design for an engineering role), bias toward no_hire even if average is borderline.
- Coverage matters: if checklist coverage was thin across the board, that's a yellow flag — call it out in concerns.
- `advance_to_next_round` is true when recommendation is strong_hire or hire. The recruiter ultimately decides; you propose.
- Strengths and concerns must reference SPECIFIC questions or notes, not generic platitudes.

Return ONLY a JSON object, no prose, no markdown fences:
{
  "overall_score": 1-5 integer,
  "recommendation": "strong_hire" | "hire" | "no_hire" | "strong_no_hire",
  "advance_to_next_round": true | false,
  "advance_reasoning": "one sentence",
  "strengths": ["...", "..."],
  "concerns": ["...", "..."],
  "per_question_summary": [
    { "order_index": 0, "score": 4, "summary": "one line" }
  ]
}
"""


def _normalise(payload: dict[str, Any]) -> dict[str, Any]:
    valid_recs = {"strong_hire", "hire", "no_hire", "strong_no_hire"}

    overall = payload.get("overall_score", 3)
    try:
        overall = max(1, min(5, int(overall)))
    except (ValueError, TypeError):
        overall = 3

    rec = str(payload.get("recommendation", "no_hire"))
    if rec not in valid_recs:
        rec = "no_hire"

    advance = bool(payload.get("advance_to_next_round", rec in {"strong_hire", "hire"}))

    def _list_of_str(key: str, limit: int) -> list[str]:
        items = payload.get(key) or []
        if not isinstance(items, list):
            return []
        return [str(x).strip() for x in items if isinstance(x, (str, int, float))][:limit]

    per_q_raw = payload.get("per_question_summary") or []
    per_q: list[dict[str, Any]] = []
    if isinstance(per_q_raw, list):
        for item in per_q_raw:
            if not isinstance(item, dict):
                continue
            try:
                per_q.append(
                    {
                        "order_index": int(item.get("order_index", 0)),
                        "score": int(item.get("score", 3)),
                        "summary": str(item.get("summary", "")).strip(),
                    }
                )
            except (ValueError, TypeError):
                continue

    return {
        "overall_score": overall,
        "recommendation": rec,
        "advance_to_next_round": advance,
        "advance_reasoning": str(payload.get("advance_reasoning", "")).strip(),
        "strengths": _list_of_str("strengths", 8),
        "concerns": _list_of_str("concerns", 8),
        "per_question_summary": per_q,
    }


async def synthesise_report(
    *,
    role_type: RoleType,
    round: Round,
    experience_level: str,
    custom_instructions: str | None,
    questions: list[dict[str, Any]],
) -> dict[str, Any]:
    """`questions` items: { order_index, question_text, question_type, score, notes, coverage, checklist, status }"""
    user_parts: list[str] = [
        f"Role: {ROLE_LABEL.get(role_type, role_type.value)}",
        f"Round: {ROUND_LABEL.get(round, round.value)}",
        f"Experience level: {experience_level} — {EXPERIENCE_GUIDANCE.get(experience_level, '')}",
    ]
    if custom_instructions:
        user_parts.append(f"Recruiter instructions: {custom_instructions}")
    user_parts.append("")
    user_parts.append("=== Per-question marks ===")
    for q in questions:
        user_parts.append("")
        user_parts.append(f"Q{q['order_index'] + 1} [{q['question_type']}] (status: {q.get('status', 'asked')}, score: {q.get('score', 'unscored')})")
        user_parts.append(f"  Question: {q['question_text']}")
        coverage = q.get("coverage") or []
        checklist = q.get("checklist") or []
        if checklist:
            missed = [c for c in checklist if c not in coverage]
            user_parts.append(f"  Covered ({len(coverage)}/{len(checklist)}): {coverage or '—'}")
            if missed:
                user_parts.append(f"  Missed: {missed}")
        notes = (q.get("notes") or "").strip()
        if notes:
            user_parts.append(f"  Recruiter notes: {notes}")

    user_parts.append("\nReturn ONLY the JSON object specified by the system.")

    raw = await complete_async(
        system=SYSTEM_PROMPT,
        user="\n".join(user_parts),
        temperature=0.2,
        json_mode=True,
    )
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end <= start:
            raise ValueError(f"Report synthesiser returned unparseable JSON: {raw[:200]!r}")
        payload = json.loads(raw[start : end + 1])

    return _normalise(payload)
