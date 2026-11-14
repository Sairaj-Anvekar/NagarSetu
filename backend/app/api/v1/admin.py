import uuid
from datetime import UTC, datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.core.categories import category_names
from app.models import Admin
from app.schemas.admin import (
    AdminComplaintDetail,
    AdminComplaintItem,
    ComplaintFilters,
    HotspotCell,
    StatsOut,
    TrendPoint,
    TriageItemOut,
    TriageReviewOut,
    TriageReviewRequest,
)
from app.schemas.common import Page
from app.services import (
    admin_complaint_service,
    admin_stats_service,
    admin_triage_service,
)

router = APIRouter(prefix="/admin", tags=["admin"])
IST = timezone(timedelta(hours=5, minutes=30))


@router.get("/stats", response_model=StatsOut)
def get_stats(
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> StatsOut:
    return admin_stats_service.get_stats(db, admin.department_id)


@router.get("/trends", response_model=list[TrendPoint])
def get_trends(
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    days: int = Query(14, ge=1, le=90),
) -> list[TrendPoint]:
    return admin_stats_service.get_trends(db, admin.department_id, days)


@router.get("/hotspots", response_model=list[HotspotCell])
def get_hotspots(
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    days: int = Query(30, ge=1, le=365),
    category: str | None = None,
) -> list[HotspotCell]:
    if category is not None and category not in category_names():
        raise RequestValidationError(
            [
                {
                    "type": "value_error",
                    "loc": ("query", "category"),
                    "msg": "Unknown category",
                }
            ]
        )
    return admin_stats_service.get_hotspots(
        db, admin.department_id, days=days, category=category
    )


@router.get("/complaints", response_model=Page[AdminComplaintItem])
def list_complaints(
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    status: Literal["Submitted", "In-Progress", "Completed"] | None = None,
    category: str | None = None,
    zone_id: int | None = None,
    overdue: bool | None = None,
    unassigned: bool | None = None,
    q: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[AdminComplaintItem]:
    if category is not None and category not in category_names():
        raise RequestValidationError(
            [
                {
                    "type": "value_error",
                    "loc": ("query", "category"),
                    "msg": "Unknown category",
                }
            ]
        )
    filters = ComplaintFilters(
        status=status,
        category=category,
        zone_id=zone_id,
        overdue=overdue,
        unassigned=unassigned,
        q=q,
    )
    items, total = admin_complaint_service.list_complaints(
        db, admin.department_id, filters, page=page, page_size=page_size
    )
    return Page[AdminComplaintItem](
        items=items, total=total, page=page, page_size=page_size
    )


@router.get("/complaints/export")
def export_complaints(
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    status: Literal["Submitted", "In-Progress", "Completed"] | None = None,
    category: str | None = None,
    zone_id: int | None = None,
    overdue: bool | None = None,
    unassigned: bool | None = None,
    q: str | None = Query(None, max_length=100),
) -> Response:
    if category is not None and category not in category_names():
        raise RequestValidationError(
            [
                {
                    "type": "value_error",
                    "loc": ("query", "category"),
                    "msg": "Unknown category",
                }
            ]
        )
    filters = ComplaintFilters(
        status=status,
        category=category,
        zone_id=zone_id,
        overdue=overdue,
        unassigned=unassigned,
        q=q,
    )
    rows = admin_complaint_service.export_rows(db, admin.department_id, filters)
    csv_bytes = admin_complaint_service.build_csv(rows)
    now_ist = datetime.now(UTC).astimezone(IST)
    filename = f"complaints-{now_ist.strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/complaints/{complaint_id}", response_model=AdminComplaintDetail)
def get_complaint_detail(
    complaint_id: uuid.UUID,
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> AdminComplaintDetail:
    try:
        return admin_complaint_service.get_complaint_detail(
            db, admin.department_id, complaint_id
        )
    except admin_complaint_service.ComplaintNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found",
        ) from exc


@router.get("/triage", response_model=Page[TriageItemOut])
def list_triage(
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
    status: Literal["pending", "reviewed"] = "pending",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[TriageItemOut]:
    items, total = admin_triage_service.list_triage(
        db, admin.department_id, status=status, page=page, page_size=page_size
    )
    return Page[TriageItemOut](
        items=items, total=total, page=page, page_size=page_size
    )


@router.patch("/triage/{triage_id}", response_model=TriageReviewOut)
def review_triage(
    triage_id: int,
    body: TriageReviewRequest,
    admin: Annotated[Admin, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> TriageReviewOut:
    if body.category not in category_names():
        raise RequestValidationError(
            [
                {
                    "type": "value_error",
                    "loc": ("body", "category"),
                    "msg": "Unknown category",
                }
            ]
        )
    try:
        result = admin_triage_service.review_triage(
            db, admin, triage_id, body.category
        )
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        return result
    except admin_triage_service.TriageNotFound as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Triage case not found",
        ) from exc
    except admin_triage_service.TriageConflict as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
