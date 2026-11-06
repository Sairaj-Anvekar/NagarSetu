from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from geoalchemy2.elements import WKTElement
from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.categories import get_category
from app.core.tracking import generate_tracking_code
from app.models.complaint import Complaint
from app.models.constants import ActorType, ClassificationSource, LogEvent
from app.models.department import Department
from app.models.zone import Zone
from app.services.complaint_log_service import add_log


class InvalidLocation(ValueError):
    pass


class DepartmentMissing(LookupError):
    pass


class TrackingCodeExhausted(RuntimeError):
    pass


PRIORITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def find_zone_id(db: Session, latitude: float, longitude: float) -> int | None:
    stmt = (
        select(Zone.id)
        .where(
            func.ST_Within(
                func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
                Zone.boundary,
            )
        )
        .order_by(Zone.id)
    )
    return db.scalars(stmt).first()


def compute_sla_deadline(sla_hours: int, now: datetime) -> datetime:
    return now + timedelta(hours=sla_hours)


def is_overdue(sla_deadline: datetime, status: str, now: datetime) -> bool:
    status_val = status.value if hasattr(status, "value") else status
    if status_val == "Completed":
        return False
    if sla_deadline.tzinfo is not None and now.tzinfo is None:
        now = now.replace(tzinfo=sla_deadline.tzinfo)
    elif sla_deadline.tzinfo is None and now.tzinfo is not None:
        sla_deadline = sla_deadline.replace(tzinfo=now.tzinfo)
    return now > sla_deadline


def queue_sort_key(
    priority: str,
    sla_deadline: datetime,
    carry_forward_count: int,
    created_at: datetime,
    status: str,
    now: datetime,
) -> tuple:
    overdue = is_overdue(sla_deadline, status, now)
    priority_val = priority.value if hasattr(priority, "value") else priority
    return (
        0 if overdue else 1,
        PRIORITY_RANK[priority_val],
        sla_deadline,
        -carry_forward_count,
        created_at,
    )


def queue_order_by(now: datetime) -> list:
    overdue_case = case(
        (Complaint.sla_deadline < now, 0),
        else_=1,
    ).asc()
    priority_case = case(
        (Complaint.priority == "critical", 0),
        (Complaint.priority == "high", 1),
        (Complaint.priority == "medium", 2),
        (Complaint.priority == "low", 3),
        else_=4,
    ).asc()
    return [
        overdue_case,
        priority_case,
        Complaint.sla_deadline.asc(),
        Complaint.carry_forward_count.desc(),
        Complaint.created_at.asc(),
    ]


def create_complaint(
    db: Session,
    *,
    citizen_id: UUID | str,
    category: str,
    description: str | None = None,
    image_object_key: str | None = None,
    latitude: float,
    longitude: float,
    ai_confidence: float | None = None,
    ai_classification_source: Any = None,
    now: datetime | None = None,
) -> Complaint:
    if not (-90.0 <= latitude <= 90.0) or not (-180.0 <= longitude <= 180.0):
        raise InvalidLocation("Location is outside the valid range")

    cat_info = get_category(category)

    source_val: str | None = None
    if ai_classification_source is not None:
        if isinstance(ai_classification_source, ClassificationSource):
            source_val = ai_classification_source.value
        elif isinstance(ai_classification_source, str):
            valid_sources = {s.value for s in ClassificationSource}
            valid_names = {s.name for s in ClassificationSource}
            if ai_classification_source in valid_sources:
                source_val = ai_classification_source
            elif ai_classification_source in valid_names:
                source_val = ClassificationSource[ai_classification_source].value
            else:
                raise ValueError(
                    f"Invalid ai_classification_source: {ai_classification_source}"
                )
        else:
            raise ValueError(
                f"Invalid ai_classification_source: {ai_classification_source}"
            )

    if ai_confidence is not None:
        if (
            isinstance(ai_confidence, bool)
            or not isinstance(ai_confidence, (int, float))
            or not (0.0 <= ai_confidence <= 1.0)
        ):
            raise ValueError("ai_confidence must be between 0 and 1")

    dept = db.scalars(
        select(Department).where(Department.name == cat_info.department_name)
    ).first()
    if dept is None:
        raise DepartmentMissing(f"Department missing: {cat_info.department_name}")

    zone_id = find_zone_id(db, latitude, longitude)

    current_time = now if now is not None else datetime.now(UTC)
    sla_deadline = compute_sla_deadline(cat_info.sla_hours, current_time)
    location = WKTElement(f"POINT({longitude} {latitude})", srid=4326)

    complaint: Complaint | None = None
    for _ in range(5):
        tracking_code = generate_tracking_code(current_time)
        c = Complaint(
            tracking_code=tracking_code,
            citizen_id=citizen_id,
            category=cat_info.name,
            department_id=dept.id,
            zone_id=zone_id,
            description=description,
            image_object_key=image_object_key,
            location=location,
            latitude=latitude,
            longitude=longitude,
            ai_confidence=ai_confidence,
            ai_classification_source=source_val,
            status="Submitted",
            priority=cat_info.priority,
            sla_deadline=sla_deadline,
            carry_forward_count=0,
            **({"created_at": current_time} if now is not None else {}),
        )
        try:
            with db.begin_nested():
                db.add(c)
                db.flush()
            complaint = c
            break
        except IntegrityError:
            exists_stmt = select(
                select(Complaint.id)
                .where(Complaint.tracking_code == tracking_code)
                .exists()
            )
            if db.scalar(exists_stmt):
                continue
            raise

    if complaint is None:
        raise TrackingCodeExhausted(
            "Failed to generate a unique tracking code after 5 attempts"
        )

    add_log(
        db,
        complaint_id=complaint.id,
        event=LogEvent.CREATED,
        actor_type=ActorType.CITIZEN,
        actor_id=str(citizen_id),
        details={
            "category": cat_info.name,
            "zone_id": int(zone_id) if zone_id is not None else None,
            "tracking_code": complaint.tracking_code,
        },
    )
    add_log(
        db,
        complaint_id=complaint.id,
        event=LogEvent.CLASSIFIED,
        actor_type=ActorType.SYSTEM,
        actor_id=None,
        details={
            "confidence": ai_confidence,
            "source": source_val,
        },
    )
    add_log(
        db,
        complaint_id=complaint.id,
        event=LogEvent.CONFIRMED,
        actor_type=ActorType.CITIZEN,
        actor_id=str(citizen_id),
        details={
            "category": cat_info.name,
        },
    )
    db.flush()
    return complaint

