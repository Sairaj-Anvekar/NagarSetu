from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Citizen, Complaint


def _clean_str(val: str | None) -> str | None:
    if val is None:
        return None
    trimmed = val.strip()[:100]
    return trimmed if trimmed else None


def normalize_tracking_code(raw: str) -> str:
    return "".join(raw.split()).upper()


def get_or_create_citizen(
    db: Session,
    chat_id: int,
    username: str | None,
    full_name: str | None,
) -> Citizen:
    clean_username = _clean_str(username)
    clean_full_name = _clean_str(full_name)

    stmt = select(Citizen).where(Citizen.telegram_chat_id == chat_id)
    citizen = db.execute(stmt).scalar_one_or_none()

    if citizen is not None:
        changed = False
        if citizen.telegram_username != clean_username:
            citizen.telegram_username = clean_username
            changed = True
        if citizen.full_name != clean_full_name:
            citizen.full_name = clean_full_name
            changed = True
        if changed:
            db.flush()
        return citizen

    try:
        with db.begin_nested():
            citizen = Citizen(
                telegram_chat_id=chat_id,
                telegram_username=clean_username,
                full_name=clean_full_name,
            )
            db.add(citizen)
            db.flush()
        return citizen
    except IntegrityError:
        citizen = db.execute(stmt).scalar_one()
        changed = False
        if citizen.telegram_username != clean_username:
            citizen.telegram_username = clean_username
            changed = True
        if citizen.full_name != clean_full_name:
            citizen.full_name = clean_full_name
            changed = True
        if changed:
            db.flush()
        return citizen


def find_citizen_complaint(
    db: Session,
    citizen_id: UUID | Any,
    tracking_code: str,
) -> Complaint | None:
    norm_code = normalize_tracking_code(tracking_code)
    stmt = select(Complaint).where(
        Complaint.citizen_id == citizen_id,
        Complaint.tracking_code == norm_code,
    )
    return db.execute(stmt).scalar_one_or_none()


def list_recent_complaints(
    db: Session,
    citizen_id: UUID | Any,
    limit: int = 5,
) -> list[Complaint]:
    stmt = (
        select(Complaint)
        .where(Complaint.citizen_id == citizen_id)
        .order_by(Complaint.created_at.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())

