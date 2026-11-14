from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.categories import get_category
from app.models import Complaint, ComplaintAssignment, Department, TriageQueue
from app.models.constants import ActorType, LogEvent
from app.schemas.admin import TriageItemOut, TriageReviewOut
from app.services import assignment_service, complaint_log_service
from app.services.admin_complaint_service import _signed


class TriageNotFound(Exception):
    pass


class TriageConflict(Exception):
    pass


def list_triage(
    db: Session,
    department_id: int,
    status: str = "pending",
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[TriageItemOut], int]:
    if status not in ("pending", "reviewed"):
        raise ValueError(f"Invalid status: {status}")

    count_stmt = (
        select(func.count(TriageQueue.id))
        .join(Complaint, TriageQueue.complaint_id == Complaint.id)
        .where(
            Complaint.department_id == department_id,
            TriageQueue.status == status,
        )
    )
    total = db.scalar(count_stmt) or 0

    base_query = (
        select(TriageQueue, Complaint)
        .join(Complaint, TriageQueue.complaint_id == Complaint.id)
        .where(
            Complaint.department_id == department_id,
            TriageQueue.status == status,
        )
    )

    if status == "pending":
        order_clauses = [TriageQueue.created_at.asc(), TriageQueue.id.asc()]
    else:
        order_clauses = [TriageQueue.reviewed_at.desc(), TriageQueue.id.desc()]

    rows = db.execute(
        base_query.order_by(*order_clauses)
        .offset(max(0, (page - 1) * page_size))
        .limit(page_size)
    ).all()

    items = [
        TriageItemOut(
            id=str(triage.id),
            complaint_id=str(complaint.id),
            tracking_code=complaint.tracking_code,
            predicted_category=triage.predicted_category,
            ai_confidence=float(triage.ai_confidence),
            status=triage.status,
            final_category=triage.final_category,
            description=complaint.description,
            image_url=_signed(complaint.image_object_key),
            created_at=triage.created_at,
        )
        for triage, complaint in rows
    ]
    return items, total


def review_triage(
    db: Session,
    admin: Any,
    triage_id: int,
    category: str,
    now: datetime | None = None,
) -> TriageReviewOut:
    if now is None:
        now = datetime.now(UTC)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=UTC)

    row = db.execute(
        select(TriageQueue, Complaint)
        .join(Complaint, TriageQueue.complaint_id == Complaint.id)
        .where(TriageQueue.id == triage_id)
        .with_for_update()
    ).first()

    if row is None:
        raise TriageNotFound("Triage case not found")

    triage, complaint = row
    if complaint.department_id != admin.department_id:
        raise TriageNotFound("Triage case not found")

    info = get_category(category)

    if triage.status == "reviewed":
        raise TriageConflict("This case has already been reviewed")

    if category == complaint.category:
        triage.status = "reviewed"
        triage.final_category = category
        triage.reviewed_by_admin_id = admin.id
        triage.reviewed_at = now
        db.flush()
        return TriageReviewOut(
            id=str(triage.id),
            tracking_code=complaint.tracking_code,
            status="reviewed",
            final_category=category,
            moved_to_department=None,
        )

    if complaint.status != "Submitted":
        raise TriageConflict(
            "Complaint is already being handled; its category can no longer be changed"
        )

    old_category = complaint.category
    complaint.category = category
    complaint.priority = info.priority
    complaint.sla_deadline = complaint.created_at + timedelta(hours=info.sla_hours)
    complaint.ai_classification_source = "manual"

    new_dept = db.execute(
        select(Department).where(Department.name == info.department_name)
    ).scalar_one_or_none()
    if new_dept is None:
        raise LookupError(f"Department '{info.department_name}' not found")

    moved_to_department: str | None = None
    if new_dept.id != complaint.department_id:
        moved_to_department = new_dept.name
        complaint.department_id = new_dept.id

        active_assignments = (
            db.execute(
                select(ComplaintAssignment).where(
                    ComplaintAssignment.complaint_id == complaint.id,
                    ComplaintAssignment.is_active.is_(True),
                )
            )
            .scalars()
            .all()
        )
        for assignment in active_assignments:
            assignment.is_active = False
            assignment.ended_at = now
            assignment.end_reason = "reassigned"

        db.flush()
        assignment_service.assign_complaint(db, complaint.id, now=now)

    triage.status = "reviewed"
    triage.final_category = category
    triage.reviewed_by_admin_id = admin.id
    triage.reviewed_at = now

    complaint_log_service.add_log(
        db,
        complaint.id,
        LogEvent.CLASSIFIED,
        ActorType.ADMIN,
        str(admin.id),
        {"source": "manual", "from": old_category, "to": category},
    )
    db.flush()

    return TriageReviewOut(
        id=str(triage.id),
        tracking_code=complaint.tracking_code,
        status="reviewed",
        final_category=category,
        moved_to_department=moved_to_department,
    )

