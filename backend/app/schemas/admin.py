from dataclasses import dataclass
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.common import RefOut


class StatsTotals(BaseModel):
    total: int
    submitted: int
    in_progress: int
    completed: int
    overdue: int
    unassigned: int


class CategoryCount(BaseModel):
    category: str
    count: int


class ZoneCount(BaseModel):
    zone: str
    count: int


class StatsOut(BaseModel):
    department: RefOut
    totals: StatsTotals
    by_category: list[CategoryCount]
    by_zone: list[ZoneCount]
    pending_triage: int


class TrendPoint(BaseModel):
    date: str
    created: int
    completed: int


class HotspotCell(BaseModel):
    latitude: float
    longitude: float
    count: int


class AdminComplaintItem(BaseModel):
    id: str
    tracking_code: str
    category: str
    status: str
    priority: str
    zone: RefOut | None = None
    assigned_worker: RefOut | None = None
    description: str | None = None
    sla_deadline: datetime
    is_overdue: bool
    created_at: datetime
    resolved_at: datetime | None = None


class LogEntry(BaseModel):
    event_type: str
    actor_type: str
    created_at: datetime
    details: dict[str, Any] | None = None


class ResolutionOut(BaseModel):
    note: str
    photo_url: str | None = None
    completed_at: datetime
    worker: RefOut


class AdminComplaintDetail(AdminComplaintItem):
    image_url: str | None = None
    latitude: float
    longitude: float
    carry_forward_count: int
    logs: list[LogEntry]
    resolution: ResolutionOut | None = None


class TriageItemOut(BaseModel):
    id: str
    complaint_id: str
    tracking_code: str
    predicted_category: str
    ai_confidence: float
    status: str
    final_category: str | None = None
    description: str | None = None
    image_url: str | None = None
    created_at: datetime


class TriageReviewRequest(BaseModel):
    category: str


class TriageReviewOut(BaseModel):
    id: str
    tracking_code: str
    status: str
    final_category: str
    moved_to_department: str | None = None


@dataclass(frozen=True)
class ComplaintFilters:
    status: str | None = None
    category: str | None = None
    zone_id: int | None = None
    overdue: bool | None = None
    unassigned: bool | None = None
    q: str | None = None

