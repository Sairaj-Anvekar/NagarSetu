import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.complaint import Complaint
from app.models.constants import ActorType, LogEvent, check_in_values


class ComplaintLog(Base):
    __tablename__ = "complaint_log"
    __table_args__ = (
        CheckConstraint(
            check_in_values("event_type", LogEvent),
            name="ck_complaint_log_event",
        ),
        CheckConstraint(
            check_in_values("actor_type", ActorType),
            name="ck_complaint_log_actor",
        ),
        Index("ix_complaint_log_complaint_created", "complaint_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("complaint.id"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(20), nullable=False)
    actor_type: Mapped[str] = mapped_column(String(10), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    complaint: Mapped[Complaint] = relationship("Complaint")
