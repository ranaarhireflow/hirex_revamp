"""Resume upload + text extraction.

Stage 2: local-disk fallback. R2 wiring lands when credentials are added.

Text extraction is exposed as `extract_text_from_bytes` so both the single-file
interview flow and the multi-file resume-screening flow share one code path.
Supports PDF (pypdf), DOCX (python-docx), and plain text (.txt/.md).
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


def _extract_pdf(raw: bytes) -> str:
    reader = PdfReader(BytesIO(raw))
    return "\n".join((page.extract_text() or "") for page in reader.pages).strip()


def _extract_docx(raw: bytes) -> str:
    # Imported lazily so the dependency is only loaded when a .docx shows up.
    from docx import Document

    doc = Document(BytesIO(raw))
    return "\n".join(p.text for p in doc.paragraphs).strip()


def extract_text_from_bytes(raw: bytes, filename: str) -> str:
    """Best-effort text extraction. Never raises — a parse failure returns a
    short marker string so the caller can decide what to do (the LLM scorer
    treats an empty/marker resume as a low-signal candidate rather than crashing).
    """
    suffix = Path(filename or "resume.pdf").suffix.lower()
    try:
        if suffix == ".pdf":
            return _extract_pdf(raw)
        if suffix == ".docx":
            return _extract_docx(raw)
        # .txt / .md / unknown → decode as text.
        return raw.decode("utf-8", errors="ignore").strip()
    except Exception as e:  # noqa: BLE001 — extraction is best-effort by design
        return f"[resume parse failed: {e}]"


def save_resume_bytes(raw: bytes, filename: str) -> tuple[str, str]:
    """Persist resume bytes to local disk and return (url, extracted_text)."""
    suffix = Path(filename or "resume.pdf").suffix or ".pdf"
    name = f"{uuid.uuid4()}{suffix}"
    dest = UPLOAD_DIR / name
    dest.write_bytes(raw)
    text = extract_text_from_bytes(raw, filename)
    return f"local:uploads/resumes/{name}", text


async def save_resume(file: UploadFile) -> tuple[str, str]:
    raw = await file.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError(f"resume too large; max {MAX_BYTES // (1024 * 1024)} MB")
    return save_resume_bytes(raw, file.filename or "resume.pdf")
