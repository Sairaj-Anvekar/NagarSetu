import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Complaint, ComplaintAssignment, Resolution, Worker
from app.models.constants import (
    ActorType,
    AssignmentEndReason,
    ComplaintStatus,
    LogEvent,
)
from app.schemas.tasks import DeferOut, HistoryItemOut, TaskOut
from app.services import (
    assignment_service,
    complaint_log_service,
    complaint_service,
    storage_service,
)
from app.services.image_service import ValidatedImage

logger = logging.getLogger(__name__)


class TaskNotFound(Exception):
    pass


class TaskConflict(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


@dataclass(frozen=True)
class CompleteResult:
    task: TaskOut
    photo_key: str


def _safe_image_url(c: Complaint) -> str | None:
    key = getattr(c, "image_object_key", None)
    if not key:
        return None
    try:
        return storage_service.get_storage().presigned_url(key)
    except Exception as exc:
        logger.warning("Could not generate presigned url for %s: %s", key, exc)
        return None


def to_task(c: Complaint, now: datetime | None = None) -> TaskOut:
    now = now or datetime.now(UTC)
    return TaskOut(
        id=str(c.id),
        tracking_code=c.tracking_code,
        category=c.category,
        description=c.description,
        image_url=_safe_image_url(c),
        latitude=float(c.latitude),
        longitude=float(c.longitude),
        priority=c.priority,
        status=c.status,
        sla_deadline=c.sla_deadline,
        is_overdue=complaint_service.is_overdue(c.sla_deadline, c.status, now),
    )


def to_history_item(
    c: Complaint, now: datetime | None = None
) -> HistoryItemOut:
    now = now or datetime.now(UTC)
    task = to_task(c, now)
    return HistoryItemOut(
        id=task.id,
        tracking_code=task.tracking_code,
        category=task.category,
        description=task.description,
        image_url=task.image_url,
        latitude=task.latitude,
        longitude=task.longitude,
        priority=task.priority,
        status=task.status,
        sla_deadline=task.sla_deadline,
        is_overdue=task.is_overdue,
        resolved_at=c.resolved_at,
    )


def list_active_tasks(
    db: Session,
    worker: Worker,
    page: int,
    page_size: int,
    now: datetime | None = None,
) -> tuple[list[TaskOut], int]:
    now = now or datetime.now(UTC)
    count_stmt = (
        select(func.count(Complaint.id))
        .join(ComplaintAssignment, ComplaintAssignment.complaint_id == Complaint.id)
        .where(
            ComplaintAssignment.is_active.is_(True),
            ComplaintAssignment.worker_id == worker.id,
            Complaint.status != ComplaintStatus.COMPLETED.value,
        )
    )
    total = db.scalar(count_stmt) or 0

    stmt = (
        select(Complaint)
        .join(ComplaintAssignment, ComplaintAssignment.complaint_id == Complaint.id)
        .where(
            ComplaintAssignment.is_active.is_(True),
            ComplaintAssignment.worker_id == worker.id,
            Complaint.status != ComplaintStatus.COMPLETED.value,
        )
        .order_by(*complaint_service.queue_order_by(now))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    complaints = db.scalars(stmt).all()
    items = [to_task(c, now) for c in complaints]
    return items, total


def list_history(
    db: Session,
    worker: Worker,
    page: int,
    page_size: int,
    now: datetime | None = None,
) -> tuple[list[HistoryItemOut], int]:
    now = now or datetime.now(UTC)
    count_stmt = (
        select(func.count(Complaint.id))
        .join(ComplaintAssignment, ComplaintAssignment.complaint_id == Complaint.id)
        .where(
            ComplaintAssignment.worker_id == worker.id,
            ComplaintAssignment.end_reason
            == AssignmentEndReason.COMPLETED.value,
            Complaint.status == ComplaintStatus.COMPLETED.value,
        )
    )
    total = db.scalar(count_stmt) or 0

    stmt = (
        select(Complaint)
        .join(ComplaintAssignment, ComplaintAssignment.complaint_id == Complaint.id)
        .where(
            ComplaintAssignment.worker_id == worker.id,
            ComplaintAssignment.end_reason
            == AssignmentEndReason.COMPLETED.value,
            Complaint.status == ComplaintStatus.COMPLETED.value,
        )
        .order_by(Complaint.resolved_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    complaints = db.scalars(stmt).all()
    items = [to_history_item(c, now) for c in complaints]
    return items, total


def _find_active(
    db: Session, worker: Worker, complaint_id: UUID | str
) -> tuple[Complaint, ComplaintAssignment] | None:
    stmt = (
        select(Complaint, ComplaintAssignment)
        .join(
            ComplaintAssignment,
            (ComplaintAssignment.complaint_id == Complaint.id)
            & (ComplaintAssignment.is_active.is_(True))
            & (ComplaintAssignment.worker_id == worker.id),
        )
        .where(Complaint.id == complaint_id)
        .with_for_update(of=Complaint)
    )
    row = db.execute(stmt).first()
    if row is None:
        return None
    return row[0], row[1]


def get_task(
    db: Session,
    worker: Worker,
    complaint_id: UUID | str,
    now: datetime | None = None,
) -> TaskOut:
    now = now or datetime.now(UTC)
    stmt = (
        select(Complaint)
        .join(
            ComplaintAssignment,
            (ComplaintAssignment.complaint_id == Complaint.id)
            & (ComplaintAssignment.is_active.is_(True))
            & (ComplaintAssignment.worker_id == worker.id),
        )
        .where(
            Complaint.id == complaint_id,
            Complaint.status != ComplaintStatus.COMPLETED.value,
        )
    )
    complaint = db.scalars(stmt).first()
    if complaint is None:
        raise TaskNotFound()
    return to_task(complaint, now)


def start_task(
    db: Session,
    worker: Worker,
    complaint_id: UUID | str,
    now: datetime | None = None,
) -> TaskOut:
    now = now or datetime.now(UTC)
    active_pair = _find_active(db, worker, complaint_id)
    if active_pair is None:
        completed_stmt = select(ComplaintAssignment).where(
            ComplaintAssignment.complaint_id == complaint_id,
            ComplaintAssignment.worker_id == worker.id,
            ComplaintAssignment.end_reason
            == AssignmentEndReason.COMPLETED.value,
        )
        if db.scalars(completed_stmt).first() is not None:
            raise TaskConflict("Task is already completed")
        raise TaskNotFound()

    complaint, assignment = active_pair
    if complaint.status != ComplaintStatus.SUBMITTED.value:
        raise TaskConflict("Task can only be started when it is Submitted")

    complaint.status = ComplaintStatus.IN_PROGRESS.value
    complaint_log_service.add_log(
        db=db,
        complaint_id=complaint.id,
        event=LogEvent.STARTED,
        actor_type=ActorType.WORKER,
        actor_id=str(worker.id),
        details={"worker_id": worker.id},
    )
    db.flush()
    return to_task(complaint, now)


def defer_task(
    db: Session,
    worker: Worker,
    complaint_id: UUID | str,
    reason: str,
    now: datetime | None = None,
) -> DeferOut:
    now = now or datetime.now(UTC)
    active_pair = _find_active(db, worker, complaint_id)
    if active_pair is None:
        completed_stmt = select(ComplaintAssignment).where(
            ComplaintAssignment.complaint_id == complaint_id,
            ComplaintAssignment.worker_id == worker.id,
            ComplaintAssignment.end_reason
            == AssignmentEndReason.COMPLETED.value,
        )
        if db.scalars(completed_stmt).first() is not None:
            raise TaskConflict("Task is already completed")
        raise TaskNotFound()

    complaint, assignment = active_pair

    complaint.carry_forward_count += 1
    assignment.is_active = False
    assignment.ended_at = now
    assignment.end_reason = AssignmentEndReason.DEFERRED.value

    if complaint.status == ComplaintStatus.IN_PROGRESS.value:
        complaint.status = ComplaintStatus.SUBMITTED.value

    complaint_log_service.add_log(
        db=db,
        complaint_id=complaint.id,
        event=LogEvent.DEFERRED,
        actor_type=ActorType.WORKER,
        actor_id=str(worker.id),
        details={
            "reason": reason,
            "worker_id": worker.id,
            "carry_forward_count": complaint.carry_forward_count,
        },
    )
    db.flush()

    assignment_service.assign_complaint(
        db, complaint.id, now=now, exclude_worker_ids={worker.id}
    )

    return DeferOut(
        id=str(complaint.id),
        status=complaint.status,
        carry_forward_count=complaint.carry_forward_count,
    )


def complete_task(
    db: Session,
    worker: Worker,
    complaint_id: UUID | str,
    note: str,
    photo_bytes: bytes,
    image: ValidatedImage,
    now: datetime | None = None,
) -> CompleteResult:
    now = now or datetime.now(UTC)
    active_pair = _find_active(db, worker, complaint_id)
    if active_pair is None:
        completed_stmt = select(ComplaintAssignment).where(
            ComplaintAssignment.complaint_id == complaint_id,
            ComplaintAssignment.worker_id == worker.id,
            ComplaintAssignment.end_reason
            == AssignmentEndReason.COMPLETED.value,
        )
        if db.scalars(completed_stmt).first() is not None:
            raise TaskConflict("Task is already completed")
        raise TaskNotFound()

    complaint, assignment = active_pair
    if complaint.status != ComplaintStatus.IN_PROGRESS.value:
        raise TaskConflict("Task can only be completed when it is In-Progress")

    key = f"resolutions/{complaint.id}/{uuid.uuid4().hex}.{image.extension}"
    storage_service.get_storage().put_object(key, photo_bytes, image.content_type)

    try:
        resolution = Resolution(
            complaint_id=complaint.id,
            worker_id=worker.id,
            note=note,
            photo_object_key=key,
            completed_at=now,
        )
        db.add(resolution)
        complaint.status = ComplaintStatus.COMPLETED.value
        complaint.resolved_at = now
        assignment.is_active = False
        assignment.ended_at = now
        assignment.end_reason = AssignmentEndReason.COMPLETED.value

        complaint_log_service.add_log(
            db=db,
            complaint_id=complaint.id,
            event=LogEvent.COMPLETED,
            actor_type=ActorType.WORKER,
            actor_id=str(worker.id),
            details={"worker_id": worker.id},
        )
        db.flush()
    except Exception:
        try:
            storage_service.get_storage().delete_object(key)
        except Exception:
            pass
        raise

    return CompleteResult(task=to_task(complaint, now), photo_key=key)
