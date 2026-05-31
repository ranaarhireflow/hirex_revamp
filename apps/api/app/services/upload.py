"""Resume upload + text extraction.

Stage 2: local-disk fallback. R2 wiring lands when credentials are added.
"""
from __future__ import annotations

import uuid
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from pypdf import PdfReader

from app.config import ROOT

UPLOAD_DIR = ROOT / "uploads" / "resumes"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_BYTES = 8 * 1024 * 1024


async def save_resume(file: UploadFile) -> tuple[str, str]:
    raw = await file.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError(f"resume too large; max {MAX_BYTES // (1024 * 1024)} MB")

    suffix = Path(file.filename or "resume.pdf").suffix or ".pdf"
    name = f"{uuid.uuid4()}{suffix}"
    dest = UPLOAD_DIR / name
    dest.write_bytes(raw)

    text = ""
    if suffix.lower() == ".pdf":
        try:
            reader = PdfReader(BytesIO(raw))
            text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
        except Exception as e:
            text = f"[resume parse failed: {e}]"
    else:
        try:
            text = raw.decode("utf-8", errors="ignore")
        except Exception:
            text = ""

    return f"local:uploads/resumes/{name}", text
