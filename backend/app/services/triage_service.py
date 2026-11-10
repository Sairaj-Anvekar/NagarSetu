from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Complaint, TriageQueue


def create_triage_entry(
    db: Session,
    complaint: Complaint | UUID | Any,
    predicted_category: str,
    ai_confidence: float,
) -> TriageQueue:
    if not (0.0 <= ai_confidence <= 1.0):
        raise ValueError(f"ai_confidence must be between 0.0 and 1.0, got {ai_confidence}")

    complaint_id = complaint.id if hasattr(complaint, "id") else complaint

    stmt = select(TriageQueue).where(TriageQueue.complaint_id == complaint_id)
    existing = db.execute(stmt).scalar_one_or_none()
    if existing is not None:
        return existing

    entry = TriageQueue(
        complaint_id=complaint_id,
        predicted_category=predicted_category,
        ai_confidence=ai_confidence,
        status="pending",
    )
    db.add(entry)
    db.flush()
    return entry

