"""Schema bootstrap — idempotent.

- Enables the pgvector extension.
- Runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for columns added after the
  initial schema (Stage 2.5: custom_instructions, tone, language on interviews).
- Calls SQLAlchemy `create_all` to add any missing tables.

Phase 1 prototype uses this in place of Alembic; Alembic is introduced once the
schema starts diverging across environments.

Run:
    cd apps/api && python scripts/init_db.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text  # noqa: E402

from app.db import models  # noqa: F401, E402  — register tables on Base
from app.db.session import Base, engine  # noqa: E402


# Postgres-level enum value additions. Must run in autocommit because
# `ALTER TYPE ... ADD VALUE` can't be inside a transaction block.
ENUM_ADDITIONS: list[tuple[str, str]] = [
    ("role_type", "fullstack"),
]

# Idempotent column additions. SQLAlchemy `create_all` only creates tables, not
# columns on existing ones, so any post-launch column lands here.
ALTERS: list[str] = [
    "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS custom_instructions text",
    "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS tone text NOT NULL DEFAULT 'professional'",
    "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'english'",
    "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS experience_level text NOT NULL DEFAULT 'mid'",
    "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS years_experience integer",
    "ALTER TABLE question_templates ADD COLUMN IF NOT EXISTS experience_levels jsonb NOT NULL DEFAULT '[]'::jsonb",
    # Copilot conduct flow
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS expected_answer text",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS evaluation_checklist jsonb NOT NULL DEFAULT '[]'::jsonb",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS default_follow_ups jsonb NOT NULL DEFAULT '[]'::jsonb",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS conduct_status text NOT NULL DEFAULT 'pending'",
    # Per-question time budget — drives the auto-derived question count.
    "ALTER TABLE question_templates ADD COLUMN IF NOT EXISTS time_minutes integer NOT NULL DEFAULT 5",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS time_minutes integer NOT NULL DEFAULT 5",
    # Backfill sensible defaults by question_type for any existing rows that
    # were created before this column existed. Uses CASE so re-running is
    # safe (every row gets its type's standard estimate).
    """
    UPDATE question_templates SET time_minutes = CASE question_type::text
      WHEN 'behavioural'   THEN 4
      WHEN 'technical'     THEN 6
      WHEN 'coding'        THEN 12
      WHEN 'system_design' THEN 12
      ELSE 5 END
    WHERE time_minutes = 5 OR time_minutes IS NULL
    """,
    """
    UPDATE questions SET time_minutes = CASE question_type::text
      WHEN 'behavioural'   THEN 4
      WHEN 'technical'     THEN 6
      WHEN 'coding'        THEN 12
      WHEN 'system_design' THEN 12
      ELSE 5 END
    WHERE time_minutes = 5 OR time_minutes IS NULL
    """,
]


def main() -> int:
    print("[init_db] enabling pgvector extension...")
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
            print("[init_db] pgvector ok")
        except Exception as e:
            print(f"[init_db] pgvector FAILED (continuing without): {e}")

    print("[init_db] applying enum additions (autocommit)...")
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        for type_name, value in ENUM_ADDITIONS:
            try:
                conn.execute(text(f"ALTER TYPE {type_name} ADD VALUE IF NOT EXISTS '{value}'"))
                print(f"[init_db]   {type_name} += {value!r}")
            except Exception as e:
                # Either the type doesn't exist yet (first run) or the value's already there.
                print(f"[init_db]   skipped ({type_name} += {value!r}): {e}")

    print("[init_db] applying idempotent ALTERs...")
    with engine.connect() as conn:
        for stmt in ALTERS:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                print(f"[init_db]   skipped ({stmt!r}): {e}")
                conn.rollback()

    print("[init_db] creating tables...")
    Base.metadata.create_all(engine)
    print("[init_db] done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
