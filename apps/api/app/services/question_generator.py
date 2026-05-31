"""AI question generation via OpenRouter (DeepSeek V3.1).

Given role, round, experience level, JD, optional resume + custom instructions,
returns a list of tailored interview questions. JSON-mode prompt; defensive
parsing so a malformed model reply doesn't crash the request.
"""
from __future__ import annotations

import json
from typing import Any

from app.db.models import QuestionType, RoleType, Round
from app.services.llm.openrouter import complete_async

ROLE_LABEL = {
    RoleType.backend: "Backend Engineer",
    RoleType.frontend: "Frontend Engineer",
    RoleType.fullstack: "Full-Stack Engineer",
    RoleType.data: "Data Engineer / Analyst",
    RoleType.ml: "ML / AI Engineer",
    RoleType.devops: "DevOps / SRE",
    RoleType.product: "Product Manager",
    RoleType.hr: "HR / Behavioural",
}

ROUND_LABEL = {
    Round.R1: "R1 — Screening (intro, motivation, light technical)",
    Round.R2: "R2 — Deep technical (system design + applied skills + coding if relevant)",
    Round.R3: "R3 — Behavioural / leadership / system design",
}

EXPERIENCE_GUIDANCE = {
    "fresher": "0 yrs. Focus on fundamentals, college projects, ability to reason, and willingness to learn. NO production-scale system design.",
    "junior": "1-3 yrs. Focus on hands-on practical skills, small system components, debugging, and a single end-to-end project.",
    "mid": "3-6 yrs. Production engineering, ownership of features, system-design tradeoffs at one-service scale, mentoring juniors.",
    "senior": "6-10 yrs. Multi-service system design, cross-team ownership, technical leadership without title, performance under ambiguity.",
    "lead": "8-12 yrs leading a team. People management, technical strategy, prioritization, hard tradeoffs, postmortems.",
    "staff": "10+ yrs. Org-level technical scope, architectural decisions affecting multiple teams, influence without authority.",
}

SYSTEM_PROMPT = """You are a senior interview-question designer at a top-tier hiring firm in India.

Given a role, round, candidate experience level, job description, optional resume, and optional recruiter instructions, generate a list of high-quality interview questions.

Hard rules:
- Calibrate to experience level. A fresher gets fundamentals + projects. A senior gets system design + war stories. A lead/staff gets people + strategy + architectural tradeoffs.
- Mix question types appropriately for the round.
- Each question must be PROBEABLE — specific enough that an AI interviewer can ask deep follow-ups.
- Avoid generic LinkedIn fluff (no "tell me your biggest weakness" unless explicitly an HR round).
- Draw from the JD: name technologies, scenarios, and skills it mentions.
- If a resume is provided, ground at least one or two questions in the candidate's actual projects.
- Match the round: R1 is light/screening, R2 is deep technical (include coding/system_design where relevant), R3 is behavioural/leadership.
- Output Indian-English; use Indian-context examples where natural (UPI, IRCTC scale, GCC patterns) but don't force it.

Output format — STRICT:
Return ONLY a single JSON object, no prose, no markdown fences:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "behavioural" | "technical" | "coding" | "system_design",
      "difficulty": "easy" | "medium" | "hard",
      "experience_levels": ["fresher" | "junior" | "mid" | "senior" | "lead" | "staff", ...],
      "time_minutes": 3-15
    }
  ]
}

Sizing the `time_minutes` budget (per question, including expected follow-ups):
- behavioural: 3-5 min (short story-based answers)
- technical: 5-8 min (concept explanation + probing)
- coding: 10-15 min (real coding + walk-through)
- system_design: 10-15 min (sketch + tradeoffs)
Tune within the band by difficulty (easy lower, hard higher).
"""


def _truncate(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[:limit] + "\n…[truncated]"


def _build_user_prompt(
    role_type: RoleType,
    round: Round,
    experience_level: str,
    years_experience: int | None,
    jd_text: str,
    resume_text: str | None,
    custom_instructions: str | None,
    count: int,
    existing_questions: list[str] | None = None,
    focus: str | None = None,
) -> str:
    parts: list[str] = [
        f"Role: {ROLE_LABEL.get(role_type, role_type.value)}",
        f"Round: {ROUND_LABEL.get(round, round.value)}",
        f"Experience level: {experience_level} — {EXPERIENCE_GUIDANCE.get(experience_level, '')}",
    ]
    if years_experience is not None:
        parts.append(f"Specifically: {years_experience} years of experience.")

    parts.append("\n=== Job description ===\n" + _truncate(jd_text, 4000))

    if resume_text and resume_text.strip():
        parts.append("\n=== Candidate resume ===\n" + _truncate(resume_text, 4000))

    if custom_instructions and custom_instructions.strip():
        parts.append("\n=== Recruiter instructions for this interview ===\n" + custom_instructions.strip())

    if focus and focus.strip():
        parts.append("\n=== Focus for THIS batch ===\n" + focus.strip())

    if existing_questions:
        parts.append(
            "\n=== Questions already in this interview — DO NOT REPEAT, DO NOT REPHRASE ===\n"
            + "\n".join(f"- {q}" for q in existing_questions[:20])
        )

    parts.append(
        f"\nGenerate exactly {count} {'NEW ' if existing_questions else ''}questions matching all the above. "
        f"Return ONLY the JSON object specified by the system."
    )
    return "\n".join(parts)


DEFAULT_MINUTES_BY_TYPE = {
    QuestionType.behavioural: 4,
    QuestionType.technical: 6,
    QuestionType.coding: 12,
    QuestionType.system_design: 12,
}


def _coerce_question(raw: dict[str, Any], experience_level: str) -> dict[str, Any] | None:
    qtype_raw = str(raw.get("question_type", "behavioural")).lower().strip()
    try:
        qtype = QuestionType(qtype_raw)
    except ValueError:
        qtype = QuestionType.behavioural

    text = str(raw.get("question_text", "")).strip()
    if len(text) < 10:
        return None

    difficulty = str(raw.get("difficulty", "medium")).lower().strip()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    exp_levels = raw.get("experience_levels") or [experience_level]
    if not isinstance(exp_levels, list):
        exp_levels = [experience_level]
    exp_levels = [str(x) for x in exp_levels if isinstance(x, str)]
    if not exp_levels:
        exp_levels = [experience_level]

    raw_minutes = raw.get("time_minutes")
    try:
        minutes = int(raw_minutes) if raw_minutes is not None else DEFAULT_MINUTES_BY_TYPE[qtype]
    except (ValueError, TypeError):
        minutes = DEFAULT_MINUTES_BY_TYPE[qtype]
    # Sanity clamp — LLM occasionally outputs outliers like 1 or 30.
    minutes = max(2, min(20, minutes))

    return {
        "question_text": text,
        "question_type": qtype.value,
        "difficulty": difficulty,
        "experience_levels": exp_levels,
        "time_minutes": minutes,
    }


async def generate_questions(
    *,
    role_type: RoleType,
    round: Round,
    experience_level: str,
    years_experience: int | None,
    jd_text: str,
    resume_text: str | None,
    custom_instructions: str | None,
    count: int = 6,
    existing_questions: list[str] | None = None,
    focus: str | None = None,
) -> list[dict[str, Any]]:
    user_prompt = _build_user_prompt(
        role_type=role_type,
        round=round,
        experience_level=experience_level,
        years_experience=years_experience,
        jd_text=jd_text,
        resume_text=resume_text,
        custom_instructions=custom_instructions,
        count=count,
        existing_questions=existing_questions,
        focus=focus,
    )

    raw_reply = await complete_async(
        system=SYSTEM_PROMPT,
        user=user_prompt,
        temperature=0.7,
        json_mode=True,
    )

    try:
        payload = json.loads(raw_reply)
    except json.JSONDecodeError:
        # Last-ditch: try to slice out a JSON object from the reply.
        start = raw_reply.find("{")
        end = raw_reply.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError(f"LLM did not return valid JSON: {raw_reply[:300]!r}")
        payload = json.loads(raw_reply[start : end + 1])

    questions = payload.get("questions") or []
    if not isinstance(questions, list):
        raise ValueError(f"`questions` was not a list: {type(questions).__name__}")

    cleaned = [q for q in (_coerce_question(q, experience_level) for q in questions) if q]
    return cleaned
