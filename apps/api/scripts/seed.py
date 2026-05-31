"""Idempotent seed for question_templates.

Inserts every entry in STARTER_QUESTIONS that doesn't already exist (matched by
exact question_text). Safe to re-run after editing the starter list.

Run:
    cd apps/api && python scripts/seed.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from app.db.models import QuestionTemplate  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.seed.starter_questions import STARTER_QUESTIONS  # noqa: E402


def main() -> int:
    session = SessionLocal()
    try:
        existing_texts = set(
            session.scalars(select(QuestionTemplate.question_text)).all()
        )
        new_rows = [q for q in STARTER_QUESTIONS if q["question_text"] not in existing_texts]
        if not new_rows:
            print(f"[seed] {len(STARTER_QUESTIONS)} starters already present; nothing to do.")
            return 0

        for q in new_rows:
            session.add(QuestionTemplate(**q, is_starter=True))
        session.commit()
        print(f"[seed] inserted {len(new_rows)} new starter questions "
              f"({len(STARTER_QUESTIONS) - len(new_rows)} were already present).")
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main())
