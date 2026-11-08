from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from geoalchemy2 import Geography
from sqlalchemy import case, cast, func, literal, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Complaint, ComplaintAssignment, Worker
from app.models.constants import (
    ActorType,
    AssignmentEndReason,
    ComplaintStatus,
    LogEvent,
)
from app.services import complaint_log_service, complaint_service


@dataclass(frozen=True)
class Candidate:
    worker_id: int
    workload: int
    distance_m: float | None
    last_assigned_at: datetime | None


def candidate_sort_key(c: Candidate) -> tuple:
    ts = c.last_assigned_at
    if ts is not None and ts.tzinfo is None:
        ts = ts.replace(tzinfo=UTC)
    return (
        c.workload,
        c.distance_m is None,
        c.distance_m or 0.0,
        c.last_assigned_at is not None,
        ts or datetime.min.replace(tzinfo=UTC),
        c.worker_id,
    )


def pick_best(candidates: list[Candidate]) -> Candidate | None:
    if not candidates:
        return None
    return min(candidates, key=candidate_sort_key)


def get_candidates(db: Session, complaint: Complaint) -> list[Candidate]:
    if complaint.zone_id is None:
        return []

    workload_subq = (
        select(
            ComplaintAssignment.worker_id.label("worker_id"),
            func.count(ComplaintAssignment.id).label("workload"),
        )
        .join(Complaint, Complaint.id == ComplaintAssignment.complaint_id)
        .where(
            ComplaintAssignment.is_active.is_(True),
            Complaint.status != ComplaintStatus.COMPLETED.value,
        )
        .group_by(ComplaintAssignment.worker_id)
        .subquery()
    )

    if complaint.longitude is not None and complaint.latitude is not None:
        complaint_point = cast(
            func.ST_SetSRID(
                func.ST_MakePoint(complaint.longitude, complaint.latitude), 4326
            ),
            Geography,
        )
        distance_expr = case(
            (Worker.base_location.is_(None), None),
            else_=func.ST_Distance(
                cast(Worker.base_location, Geography), complaint_point
            ),
        ).label("distance_m")
    else:
        distance_expr = literal(None).label("distance_m")

    stmt = (
        select(
            Worker.id.label("worker_id"),
            func.coalesce(workload_subq.c.workload, 0).label("workload"),
            distance_expr,
            Worker.last_assigned_at,
        )
        .outerjoin(workload_subq, Worker.id == workload_subq.c.worker_id)
        .where(
            Worker.department_id == complaint.department_id,
            Worker.zone_id == complaint.zone_id,
            Worker.is_active.is_(True),
        )
    )

    rows = db.execute(stmt).all()
    return [
        Candidate(
            worker_id=row.worker_id,
            workload=row.workload,
            distance_m=float(row.distance_m) if row.distance_m is not None else None,
            last_assigned_at=row.last_assigned_at,
        )
        for row in rows
    ]


def get_active_assignment(
    db: Session, complaint_id: UUID | int | str
) -> ComplaintAssignment | None:
    stmt = select(ComplaintAssignment).where(
        ComplaintAssignment.complaint_id == complaint_id,
        ComplaintAssignment.is_active.is_(True),
    )
    return db.scalars(stmt).first()


def assign_complaint(
    db: Session, complaint_id: UUID | int | str, now: datetime | None = None
) -> ComplaintAssignment | None:
    now = now or datetime.now(UTC)
    complaint = db.scalars(
        select(Complaint).where(Complaint.id == complaint_id).with_for_update()
    ).first()
    if not complaint:
        return None

    if complaint.status == ComplaintStatus.COMPLETED.value:
        return None

    existing = get_active_assignment(db, complaint.id)
    if existing is not None:
        return existing

    candidates = get_candidates(db, complaint)
    best = pick_best(candidates)
    if best is None:
        return None

    assignment = ComplaintAssignment(
        complaint_id=complaint.id,
        worker_id=best.worker_id,
        is_active=True,
    )

    try:
        with db.begin_nested():
            db.add(assignment)
            db.flush()
    except IntegrityError:
        return get_active_assignment(db, complaint.id)

    worker = db.scalars(select(Worker).where(Worker.id == best.worker_id)).first()
    if worker is not None:
        worker.last_assigned_at = now

    distance_val = (
        round(best.distance_m, 2) if best.distance_m is not None else None
    )
    complaint_log_service.add_log(
        db=db,
        complaint_id=complaint.id,
        event=LogEvent.ASSIGNED,
        actor_type=ActorType.SYSTEM,
        actor_id=None,
        details={
            "worker_id": best.worker_id,
            "zone_id": complaint.zone_id,
            "workload_before": best.workload,
            "distance_m": distance_val,
        },
    )
    db.flush()
    return assignment


def assign_pending(
    db: Session,
    department_id: int | None = None,
    zone_id: int | None = None,
    now: datetime | None = None,
) -> int:
    now = now or datetime.now(UTC)
    active_assign_exists = (
        select(1)
        .where(
            ComplaintAssignment.complaint_id == Complaint.id,
            ComplaintAssignment.is_active.is_(True),
        )
        .exists()
    )
    stmt = select(Complaint.id).where(
        Complaint.status != ComplaintStatus.COMPLETED.value,
        Complaint.zone_id.is_not(None),
        ~active_assign_exists,
    )
    if department_id is not None:
        stmt = stmt.where(Complaint.department_id == department_id)
    if zone_id is not None:
        stmt = stmt.where(Complaint.zone_id == zone_id)

    stmt = stmt.order_by(*complaint_service.queue_order_by(now))
    complaint_ids = db.scalars(stmt).all()

    assigned_count = 0
    for cid in complaint_ids:
        res = assign_complaint(db, cid, now=now)
        if res is not None:
            assigned_count += 1
    return assigned_count


def list_unassigned(
    db: Session,
    department_id: int | None = None,
    now: datetime | None = None,
) -> list[Complaint]:
    now = now or datetime.now(UTC)
    active_assign_exists = (
        select(1)
        .where(
            ComplaintAssignment.complaint_id == Complaint.id,
            ComplaintAssignment.is_active.is_(True),
        )
        .exists()
    )
    stmt = select(Complaint).where(
        Complaint.status != ComplaintStatus.COMPLETED.value,
        ~active_assign_exists,
    )
    if department_id is not None:
        stmt = stmt.where(Complaint.department_id == department_id)
    stmt = stmt.order_by(*complaint_service.queue_order_by(now))
    return list(db.scalars(stmt).all())


def release_worker_tasks(
    db: Session, worker_id: int, now: datetime | None = None
) -> int:
    now = now or datetime.now(UTC)
    active_assignments = db.scalars(
        select(ComplaintAssignment).where(
            ComplaintAssignment.worker_id == worker_id,
            ComplaintAssignment.is_active.is_(True),
        )
    ).all()

    released_complaint_ids: list[Any] = []
    for assignment in active_assignments:
        assignment.is_active = False
        assignment.ended_at = now
        assignment.end_reason = AssignmentEndReason.WORKER_DEACTIVATED.value

        complaint = db.scalars(
            select(Complaint).where(Complaint.id == assignment.complaint_id)
        ).first()
        if (
            complaint is not None
            and complaint.status == ComplaintStatus.IN_PROGRESS.value
        ):
            complaint.status = ComplaintStatus.SUBMITTED.value

        complaint_log_service.add_log(
            db=db,
            complaint_id=assignment.complaint_id,
            event=LogEvent.DEFERRED,
            actor_type=ActorType.SYSTEM,
            actor_id=None,
            details={"reason": "worker_deactivated", "worker_id": worker_id},
        )
        released_complaint_ids.append(assignment.complaint_id)

    db.flush()

    for cid in released_complaint_ids:
        assign_complaint(db, cid, now=now)

    return len(released_complaint_ids)
