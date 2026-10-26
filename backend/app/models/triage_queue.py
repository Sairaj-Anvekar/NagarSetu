import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.admin import Admin
from app.models.complaint import Complaint
from app.models.constants import TriageStatus, check_in_values
from app.models.mixins import TimestampMixin


class TriageQueue(TimestampMixin, Base):
    __tablename__ = "triage_queue"
    __table_args__ = (
        CheckConstraint(
            check_in_values("status", TriageStatus),
            name="ck_triage_status",
        ),
        CheckConstraint(
            "ai_confidence >= 0 AND ai_confidence <= 1",
            name="ck_triage_confidence",
        ),
        CheckConstraint(
            "status = 'pending' OR (reviewed_at IS NOT NULL AND final_category IS NOT NULL)",
            name="ck_triage_reviewed",
        ),
        Index("ix_triage_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("complaint.id"), unique=True, nullable=False
    )
    predicted_category: Mapped[str] = mapped_column(String(60), nullable=False)
    ai_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(
        String(10),
        default=TriageStatus.PENDING.value,
        server_default="pending",
        nullable=False,
    )
    final_category: Mapped[str | None] = mapped_column(String(60), nullable=True)
    reviewed_by_admin_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("admin.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    complaint: Mapped[Complaint] = relationship("Complaint")
    admin: Mapped[Admin | None] = relationship("Admin")
