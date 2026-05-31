from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db.models import QuestionTemplate, RoleType, Round
from app.db.session import get_session
from app.schemas.question_template import (
    QuestionTemplateCreate,
    QuestionTemplateOut,
    QuestionTemplateUpdate,
)

router = APIRouter(prefix="/question-templates", tags=["question-templates"])


@router.get("", response_model=list[QuestionTemplateOut])
def list_templates(
    role_type: Annotated[RoleType | None, Query()] = None,
    round: Annotated[Round | None, Query()] = None,
    experience_level: Annotated[str | None, Query()] = None,
    session: Session = Depends(get_session),
) -> list[QuestionTemplateOut]:
    stmt = select(QuestionTemplate)
    if role_type is not None:
        stmt = stmt.where(QuestionTemplate.role_type == role_type)
    if round is not None:
        stmt = stmt.where(QuestionTemplate.round == round)
    if experience_level:
        # Match if the question has no experience filter (empty list = any level)
        # OR the level appears in its experience_levels JSONB array.
        from sqlalchemy import or_, func, cast
        from sqlalchemy.dialects.postgresql import JSONB
        stmt = stmt.where(
            or_(
                func.jsonb_array_length(QuestionTemplate.experience_levels) == 0,
                QuestionTemplate.experience_levels.op("@>")(cast([experience_level], JSONB)),
            )
        )
    stmt = stmt.order_by(QuestionTemplate.role_type, QuestionTemplate.round, desc(QuestionTemplate.is_starter), QuestionTemplate.created_at)
    rows = session.scalars(stmt).all()
    return [QuestionTemplateOut.model_validate(r) for r in rows]


@router.post("", response_model=QuestionTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: QuestionTemplateCreate,
    session: Session = Depends(get_session),
) -> QuestionTemplateOut:
    qt = QuestionTemplate(**payload.model_dump(exclude_none=True), is_starter=False)
    session.add(qt)
    session.commit()
    session.refresh(qt)
    return QuestionTemplateOut.model_validate(qt)


@router.patch("/{template_id}", response_model=QuestionTemplateOut)
def update_template(
    template_id: UUID,
    payload: QuestionTemplateUpdate,
    session: Session = Depends(get_session),
) -> QuestionTemplateOut:
    qt = session.get(QuestionTemplate, template_id)
    if qt is None:
        raise HTTPException(status_code=404, detail="template not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(qt, field, value)
    session.commit()
    session.refresh(qt)
    return QuestionTemplateOut.model_validate(qt)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: UUID, session: Session = Depends(get_session)) -> None:
    qt = session.get(QuestionTemplate, template_id)
    if qt is None:
        raise HTTPException(status_code=404, detail="template not found")
    session.delete(qt)
    session.commit()
