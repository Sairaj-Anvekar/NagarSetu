import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.complaint import Complaint
from app.models.constants import AssignmentEndReason, check_in_values
from app.models.mixins import TimestampMixin
from app.models.worker import Worker


class ComplaintAssignment(TimestampMixin, Base):
    __tablename__ = "complaint_assignment"
    __table_args__ = (
        CheckConstraint(
            "is_active OR ended_at IS NOT NULL",
            name="ck_assignment_ended_at",
        ),
        CheckConstraint(
            "end_reason IS NULL OR "
            + check_in_values("end_reason", AssignmentEndReason),
            name="ck_assignment_end_reason",
        ),
        Index(
            "uq_assignment_one_active_per_complaint",
            "complaint_id",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_assignment_worker_active", "worker_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("complaint.id"), nullable=False, index=True
    )
    worker_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("worker.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true(), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    end_reason: Mapped[str | None] = mapped_column(String(30), nullable=True)

    complaint: Mapped[Complaint] = relationship("Complaint")
    worker: Mapped[Worker] = relationship("Worker")
