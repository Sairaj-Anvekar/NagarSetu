from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class TaskOut(BaseModel):
    id: str
    tracking_code: str
    category: str
    description: str | None = None
    image_url: str | None = None
    latitude: float
    longitude: float
    priority: str
    status: str
    sla_deadline: datetime
    is_overdue: bool


class HistoryItemOut(TaskOut):
    resolved_at: datetime | None = None


class DeferRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=300)

    @field_validator("reason", mode="before")
    @classmethod
    def strip_reason(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip()
        return v


class DeferOut(BaseModel):
    id: str
    status: str
    carry_forward_count: int

