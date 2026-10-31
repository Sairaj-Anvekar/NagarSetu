import uuid
from datetime import datetime

from geoalchemy2 import Geometry, WKBElement
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.citizen import Citizen
from app.models.constants import (
    ClassificationSource,
    ComplaintStatus,
    Priority,
    check_in_values,
)
from app.models.department import Department
from app.models.mixins import TimestampMixin
from app.models.zone import Zone


class Complaint(TimestampMixin, Base):
    __tablename__ = "complaint"
    __table_args__ = (
        CheckConstraint(
            check_in_values("status", ComplaintStatus),
            name="ck_complaint_status",
        ),
        CheckConstraint(
            check_in_values("priority", Priority),
            name="ck_complaint_priority",
        ),
        CheckConstraint(
            "ai_classification_source IS NULL OR "
            + check_in_values("ai_classification_source", ClassificationSource),
            name="ck_complaint_ai_source",
        ),
        CheckConstraint(
            "ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)",
            name="ck_complaint_ai_confidence",
        ),
        CheckConstraint(
            "status <> 'Completed' OR resolved_at IS NOT NULL",
            name="ck_complaint_resolved_at",
        ),
        Index("ix_complaint_status_sla", "status", "sla_deadline"),
        Index("ix_complaint_dept_zone_status", "department_id", "zone_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tracking_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("citizen.id"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(60), nullable=False)
    department_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("department.id"), nullable=False
    )
    zone_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("zone.id"), nullable=True
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_object_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    location: Mapped[WKBElement] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=False
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_classification_source: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default=ComplaintStatus.SUBMITTED.value,
        server_default="Submitted",
        nullable=False,
    )
    priority: Mapped[str] = mapped_column(
        String(10),
        default=Priority.MEDIUM.value,
        server_default="medium",
        nullable=False,
    )
    sla_deadline: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    carry_forward_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    citizen: Mapped[Citizen] = relationship("Citizen")
    department: Mapped[Department] = relationship("Department")
    zone: Mapped[Zone | None] = relationship("Zone")
