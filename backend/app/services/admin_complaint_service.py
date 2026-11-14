import csv
import io
import logging
from datetime import UTC, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models import (
    Complaint,
    ComplaintAssignment,
    ComplaintLog,
    Resolution,
    Worker,
    Zone,
)
from app.schemas.admin import (
    AdminComplaintDetail,
    AdminComplaintItem,
    ComplaintFilters,
    LogEntry,
    ResolutionOut,
)
from app.schemas.common import RefOut
from app.services import complaint_service, storage_service

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))


class ComplaintNotFound(Exception):
    pass


def _signed(key: str | None) -> str | None:
    if not key:
        return None
    try:
        return storage_service.get_storage().presigned_url(key)
    except Exception as exc:
        logger.warning("Storage signing failed: %s", exc.__class__.__name__)
        return None


def _format_ist(dt: datetime | None) -> str:
    if dt is None:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(IST).strftime("%Y-%m-%d %H:%M")


def _escape_like(val: str) -> str:
    return val.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _apply_filters(stmt: Any, filters: ComplaintFilters, now: datetime) -> Any:
    if filters.status is not None:
        stmt = stmt.where(Complaint.status == filters.status)
    if filters.category is not None:
        stmt = stmt.where(Complaint.category == filters.category)
    if filters.zone_id is not None:
        stmt = stmt.where(Complaint.zone_id == filters.zone_id)
    if filters.overdue is not None:
        if filters.overdue:
            stmt = stmt.where(
                and_(
                    Complaint.status != "Completed",
                    Complaint.sla_deadline < now,
                )
            )
        else:
            stmt = stmt.where(
                or_(
                    Complaint.status == "Completed",
                    Complaint.sla_deadline >= now,
                )
            )
    if filters.unassigned is True:
        active_assignment_exists = (
            select(ComplaintAssignment.id)
            .where(
                ComplaintAssignment.complaint_id == Complaint.id,
                ComplaintAssignment.is_active.is_(True),
            )
            .correlate(Complaint)
            .exists()
        )
        stmt = stmt.where(
            Complaint.status != "Completed",
            ~active_assignment_exists,
        )
    if filters.q:
        pattern = f"%{_escape_like(filters.q)}%"
        stmt = stmt.where(
            or_(
                Complaint.tracking_code.ilike(pattern, escape="\\"),
                Complaint.description.ilike(pattern, escape="\\"),
            )
        )
    return stmt


def list_complaints(
    db: Session,
    department_id: int,
    filters: ComplaintFilters,
    page: int = 1,
    page_size: int = 20,
    now: datetime | None = None,
) -> tuple[list[AdminComplaintItem], int]:
    if now is None:
        now = datetime.now(UTC)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=UTC)

    count_stmt = select(func.count(Complaint.id)).where(
        Complaint.department_id == department_id
    )
    count_stmt = _apply_filters(count_stmt, filters, now)
    total = db.scalar(count_stmt) or 0

    base_stmt = (
        select(Complaint, Zone, Worker)
        .outerjoin(Zone, Complaint.zone_id == Zone.id)
        .outerjoin(
            ComplaintAssignment,
            and_(
                ComplaintAssignment.complaint_id == Complaint.id,
                ComplaintAssignment.is_active.is_(True),
            ),
        )
        .outerjoin(Worker, ComplaintAssignment.worker_id == Worker.id)
        .where(Complaint.department_id == department_id)
    )
    stmt = _apply_filters(base_stmt, filters, now)
    stmt = (
        stmt.order_by(*complaint_service.queue_order_by(now))
        .offset(max(0, (page - 1) * page_size))
        .limit(page_size)
    )

    rows = db.execute(stmt).all()
    items = [
        AdminComplaintItem(
            id=str(complaint.id),
            tracking_code=complaint.tracking_code,
            category=complaint.category,
            status=complaint.status,
            priority=complaint.priority,
            zone=RefOut(id=str(zone.id), name=zone.name) if zone else None,
            assigned_worker=(
                RefOut(id=str(worker.id), name=worker.name) if worker else None
            ),
            description=complaint.description,
            sla_deadline=complaint.sla_deadline,
            is_overdue=complaint_service.is_overdue(
                complaint.sla_deadline, complaint.status, now
            ),
            created_at=complaint.created_at,
            resolved_at=complaint.resolved_at,
        )
        for complaint, zone, worker in rows
    ]
    return items, total


def get_complaint_detail(
    db: Session,
    department_id: int,
    complaint_id: Any,
    now: datetime | None = None,
) -> AdminComplaintDetail:
    if now is None:
        now = datetime.now(UTC)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=UTC)

    complaint = db.get(Complaint, complaint_id)
    if complaint is None or complaint.department_id != department_id:
        raise ComplaintNotFound("Complaint not found")

    zone = db.get(Zone, complaint.zone_id) if complaint.zone_id else None
    zone_out = RefOut(id=str(zone.id), name=zone.name) if zone else None

    worker = db.execute(
        select(Worker)
        .join(ComplaintAssignment, ComplaintAssignment.worker_id == Worker.id)
        .where(
            ComplaintAssignment.complaint_id == complaint.id,
            ComplaintAssignment.is_active.is_(True),
        )
    ).scalar_one_or_none()
    worker_out = RefOut(id=str(worker.id), name=worker.name) if worker else None

    logs = (
        db.execute(
            select(ComplaintLog)
            .where(ComplaintLog.complaint_id == complaint.id)
            .order_by(ComplaintLog.created_at.asc(), ComplaintLog.id.asc())
        )
        .scalars()
        .all()
    )
    log_entries = [
        LogEntry(
            event_type=log.event_type,
            actor_type=log.actor_type,
            created_at=log.created_at,
            details=log.details,
        )
        for log in logs
    ]

    res_row = db.execute(
        select(Resolution, Worker)
        .outerjoin(Worker, Resolution.worker_id == Worker.id)
        .where(Resolution.complaint_id == complaint.id)
    ).first()
    resolution_out = None
    if res_row:
        res_obj, res_worker = res_row
        worker_ref = (
            RefOut(id=str(res_worker.id), name=res_worker.name)
            if res_worker
            else RefOut(id=str(res_obj.worker_id), name="Unknown")
        )
        resolution_out = ResolutionOut(
            note=res_obj.note,
            photo_url=_signed(res_obj.photo_object_key),
            completed_at=res_obj.completed_at,
            worker=worker_ref,
        )

    return AdminComplaintDetail(
        id=str(complaint.id),
        tracking_code=complaint.tracking_code,
        category=complaint.category,
        status=complaint.status,
        priority=complaint.priority,
        zone=zone_out,
        assigned_worker=worker_out,
        description=complaint.description,
        sla_deadline=complaint.sla_deadline,
        is_overdue=complaint_service.is_overdue(
            complaint.sla_deadline, complaint.status, now
        ),
        created_at=complaint.created_at,
        resolved_at=complaint.resolved_at,
        image_url=_signed(complaint.image_object_key),
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        carry_forward_count=complaint.carry_forward_count or 0,
        logs=log_entries,
        resolution=resolution_out,
    )


def export_rows(
    db: Session,
    department_id: int,
    filters: ComplaintFilters,
    now: datetime | None = None,
    limit: int = 5000,
) -> list[list[str]]:
    if now is None:
        now = datetime.now(UTC)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=UTC)

    stmt = (
        select(Complaint, Zone, Worker)
        .outerjoin(Zone, Complaint.zone_id == Zone.id)
        .outerjoin(
            ComplaintAssignment,
            and_(
                ComplaintAssignment.complaint_id == Complaint.id,
                ComplaintAssignment.is_active.is_(True),
            ),
        )
        .outerjoin(Worker, ComplaintAssignment.worker_id == Worker.id)
        .where(Complaint.department_id == department_id)
    )
    stmt = _apply_filters(stmt, filters, now)
    stmt = stmt.order_by(*complaint_service.queue_order_by(now)).limit(limit)
    rows = db.execute(stmt).all()

    header = [
        "tracking_code",
        "category",
        "zone",
        "status",
        "priority",
        "created_at_ist",
        "sla_deadline_ist",
        "resolved_at_ist",
        "assigned_worker",
        "description",
    ]
    result = [header]
    for complaint, zone, worker in rows:
        result.append(
            [
                complaint.tracking_code or "",
                complaint.category or "",
                zone.name if zone else "",
                complaint.status or "",
                complaint.priority or "",
                _format_ist(complaint.created_at),
                _format_ist(complaint.sla_deadline),
                _format_ist(complaint.resolved_at),
                worker.name if worker else "",
                complaint.description or "",
            ]
        )
    return result


def csv_safe(value: Any) -> str:
    if value is None:
        return ""
    s = str(value)
    if s.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + s
    return s


def build_csv(rows: list[list[Any]]) -> bytes:
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    for row in rows:
        writer.writerow([csv_safe(cell) for cell in row])
    return output.getvalue().encode("utf-8-sig")
