from datetime import UTC, datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.core.categories import CATEGORIES, get_category
from app.models import Complaint, ComplaintAssignment, Department, TriageQueue, Zone
from app.schemas.admin import (
    CategoryCount,
    HotspotCell,
    StatsOut,
    StatsTotals,
    TrendPoint,
    ZoneCount,
)
from app.schemas.common import RefOut

IST = timezone(timedelta(hours=5, minutes=30))


def get_stats(
    db: Session,
    department_id: int,
    now: datetime | None = None,
) -> StatsOut:
    if now is None:
        now = datetime.now(UTC)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=UTC)

    dept = db.get(Department, department_id)
    if dept is None:
        raise LookupError(f"Department {department_id} not found")

    active_assignment_exists = select(ComplaintAssignment.id).where(
        ComplaintAssignment.complaint_id == Complaint.id,
        ComplaintAssignment.is_active.is_(True),
    ).exists()

    totals_row = db.execute(
        select(
            func.count().label("total"),
            func.count().filter(Complaint.status == "Submitted").label("submitted"),
            func.count().filter(Complaint.status == "In-Progress").label("in_progress"),
            func.count().filter(Complaint.status == "Completed").label("completed"),
            func.count()
            .filter(
                Complaint.status != "Completed",
                Complaint.sla_deadline < now,
            )
            .label("overdue"),
            func.count()
            .filter(
                Complaint.status != "Completed",
                ~active_assignment_exists,
            )
            .label("unassigned"),
        ).where(Complaint.department_id == department_id)
    ).one()

    totals = StatsTotals(
        total=totals_row.total or 0,
        submitted=totals_row.submitted or 0,
        in_progress=totals_row.in_progress or 0,
        completed=totals_row.completed or 0,
        overdue=totals_row.overdue or 0,
        unassigned=totals_row.unassigned or 0,
    )

    cat_counts = dict(
        db.execute(
            select(Complaint.category, func.count())
            .where(Complaint.department_id == department_id)
            .group_by(Complaint.category)
        ).all()
    )
    by_category = [
        CategoryCount(category=cat_name, count=cat_counts.get(cat_name, 0))
        for cat_name, info in CATEGORIES.items()
        if info.department_name == dept.name
    ]

    zone_rows = db.execute(
        select(Zone.name, func.count(Complaint.id))
        .outerjoin(
            Complaint,
            and_(
                Complaint.zone_id == Zone.id,
                Complaint.department_id == department_id,
            ),
        )
        .group_by(Zone.id, Zone.name)
        .order_by(Zone.name.asc())
    ).all()
    by_zone = [ZoneCount(zone=name, count=cnt) for name, cnt in zone_rows]

    pending_triage = (
        db.scalar(
            select(func.count(TriageQueue.id))
            .join(Complaint, TriageQueue.complaint_id == Complaint.id)
            .where(
                TriageQueue.status == "pending",
                Complaint.department_id == department_id,
            )
        )
        or 0
    )

    return StatsOut(
        department=RefOut(id=str(dept.id), name=dept.name),
        totals=totals,
        by_category=by_category,
        by_zone=by_zone,
        pending_triage=pending_triage,
    )


def get_trends(
    db: Session,
    department_id: int,
    days: int,
    now: datetime | None = None,
) -> list[TrendPoint]:
    if days < 1 or days > 90:
        raise ValueError("days must be between 1 and 90")

    if now is None:
        now = datetime.now(UTC)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=UTC)

    today_ist = now.astimezone(IST).date()
    start_date = today_ist - timedelta(days=days - 1)

    created_date_col = func.date(func.timezone("Asia/Kolkata", Complaint.created_at))
    created_rows = db.execute(
        select(created_date_col, func.count())
        .where(
            Complaint.department_id == department_id,
            created_date_col >= start_date,
            created_date_col <= today_ist,
        )
        .group_by(created_date_col)
    ).all()
    created_map = {
        row[0].isoformat() if hasattr(row[0], "isoformat") else str(row[0]): row[1]
        for row in created_rows
    }

    completed_date_col = func.date(func.timezone("Asia/Kolkata", Complaint.resolved_at))
    completed_rows = db.execute(
        select(completed_date_col, func.count())
        .where(
            Complaint.department_id == department_id,
            Complaint.resolved_at.is_not(None),
            completed_date_col >= start_date,
            completed_date_col <= today_ist,
        )
        .group_by(completed_date_col)
    ).all()
    completed_map = {
        row[0].isoformat() if hasattr(row[0], "isoformat") else str(row[0]): row[1]
        for row in completed_rows
    }

    points = []
    for i in range(days - 1, -1, -1):
        d_str = (today_ist - timedelta(days=i)).isoformat()
        points.append(
            TrendPoint(
                date=d_str,
                created=created_map.get(d_str, 0),
                completed=completed_map.get(d_str, 0),
            )
        )
    return points


def get_hotspots(
    db: Session,
    department_id: int,
    days: int = 30,
    category: str | None = None,
    now: datetime | None = None,
) -> list[HotspotCell]:
    if days < 1 or days > 365:
        raise ValueError("days must be between 1 and 365")

    if category is not None:
        get_category(category)

    if now is None:
        now = datetime.now(UTC)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=UTC)

    cutoff = now - timedelta(days=days)

    snapped = func.ST_SnapToGrid(Complaint.location, 0.005)
    lat_expr = func.ST_Y(snapped)
    lon_expr = func.ST_X(snapped)
    count_expr = func.count()

    stmt = (
        select(lat_expr.label("lat"), lon_expr.label("lon"), count_expr.label("cnt"))
        .where(
            Complaint.department_id == department_id,
            Complaint.location.is_not(None),
            Complaint.created_at >= cutoff,
        )
    )

    if category is not None:
        stmt = stmt.where(Complaint.category == category)

    stmt = (
        stmt.group_by(snapped)
        .order_by(count_expr.desc(), lat_expr.asc(), lon_expr.asc())
        .limit(100)
    )

    rows = db.execute(stmt).all()
    return [
        HotspotCell(
            latitude=round(float(row.lat), 6),
            longitude=round(float(row.lon), 6),
            count=int(row.cnt),
        )
        for row in rows
    ]
