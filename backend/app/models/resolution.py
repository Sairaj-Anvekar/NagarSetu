import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.complaint import Complaint
from app.models.mixins import TimestampMixin
from app.models.worker import Worker


class Resolution(TimestampMixin, Base):
    __tablename__ = "resolution"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("complaint.id"), unique=True, nullable=False
    )
    worker_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("worker.id"), nullable=False, index=True
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)
    photo_object_key: Mapped[str] = mapped_column(String(255), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    complaint: Mapped[Complaint] = relationship("Complaint")
    worker: Mapped[Worker] = relationship("Worker")
