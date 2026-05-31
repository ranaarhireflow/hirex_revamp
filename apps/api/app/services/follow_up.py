"""On-demand follow-up generator.

Given a question and what the candidate has said so far (recruiter notes
+ which checklist points are already covered), generate ONE probing
follow-up. Used when the recruiter clicks "Ask AI for another follow-up"
during a live interview.
"""
from __future__ import annotations

import json

from app.db.models import RoleType
from app.services.llm.openrouter import complete_async
from app.services.question_generator import ROLE_LABEL

SYSTEM_PROMPT = """You are an interview-evaluation copilot. Generate ONE probing follow-up question for the recruiter to ask the candidate.

Hard rules:
- The follow-up must target something SPECIFIC the candidate said (paraphrase, don't ask them to repeat themselves).
- If the recruiter's notes suggest the candidate dodged or stayed vague, force a concrete drill: ask for numbers, names of systems, or a specific moment.
- If some checklist points have NOT been covered, your follow-up should naturally probe one of those gaps.
- Do not ask multiple questions in one prompt — one focused question only.
- Do not repeat the original question.

Return ONLY a JSON object: { "follow_up": "..." }
"""


async def generate_follow_up(
    *,
    role_type: RoleType,
    original_question: str,
    expected_answer: str | None,
    checklist: list[str],
    points_covered: list[str],
    recruiter_notes: str | None,
) -> str:
    not_covered = [c for c in checklist if c not in (points_covered or [])]

    user_parts = [
        f"Role: {ROLE_LABEL.get(role_type, role_type.value)}",
        f"\nOriginal question:\n{original_question}",
    ]
    if expected_answer:
        user_parts.append(f"\nWhat a great answer covers:\n{expected_answer}")
    if not_covered:
        user_parts.append(f"\nChecklist points NOT yet covered:\n- " + "\n- ".join(not_covered))
    if recruiter_notes and recruiter_notes.strip():
        user_parts.append(f"\nRecruiter's notes on the candidate's answer so far:\n{recruiter_notes.strip()}")
    user_parts.append("\nReturn ONLY the JSON object.")

    raw = await complete_async(
        system=SYSTEM_PROMPT,
        user="\n".join(user_parts),
        temperature=0.5,
        json_mode=True,
    )
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end <= start:
            raise ValueError(f"Follow-up generator returned unparseable JSON: {raw[:200]!r}")
        payload = json.loads(raw[start : end + 1])

    follow_up = str(payload.get("follow_up", "")).strip()
    if not follow_up:
        raise ValueError("Empty follow-up returned")
    return follow_up
