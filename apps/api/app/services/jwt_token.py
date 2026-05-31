from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt

from app.config import settings

TOKEN_TTL = timedelta(days=7)


def issue_candidate_token(interview_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "iid": str(interview_id),
        "scope": "candidate",
        "iat": int(now.timestamp()),
        "exp": int((now + TOKEN_TTL).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_signing_secret, algorithm="HS256")


def verify_candidate_token(token: str) -> UUID:
    payload = jwt.decode(token, settings.jwt_signing_secret, algorithms=["HS256"])
    if payload.get("scope") != "candidate":
        raise jwt.InvalidTokenError("wrong scope")
    return UUID(payload["iid"])
