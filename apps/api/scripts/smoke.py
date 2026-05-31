"""Stage 1 smoke: DB reachable + pgvector available + OpenRouter call returns.

Run:
    cd apps/api && python scripts/smoke.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text  # noqa: E402

from app.db.session import engine  # noqa: E402
from app.services.llm.openrouter import complete  # noqa: E402


def main() -> int:
    print("[smoke] testing DB connection...")
    with engine.connect() as conn:
        ok = conn.execute(text("SELECT 1 AS ok")).scalar()
        print(f"[smoke] DB ok: {ok}")

        print("[smoke] testing pgvector extension presence...")
        ext = conn.execute(
            text("SELECT extname FROM pg_extension WHERE extname='vector'")
        ).scalar()
        print(f"[smoke] pgvector present: {ext is not None}")

    print("[smoke] testing OpenRouter call...")
    reply = complete(
        system="You are a terse assistant. Reply with the exact words requested, nothing else.",
        user='Reply with exactly: smoke pass',
        temperature=0,
    )
    print(f"[smoke] OpenRouter reply: {reply!r}")

    print("[smoke] all checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
