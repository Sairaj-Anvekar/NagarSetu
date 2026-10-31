from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.department import Department
from app.models.mixins import TimestampMixin
from app.models.zone import Zone


class Worker(TimestampMixin, Base):
    __tablename__ = "worker"
    __table_args__ = (
        Index("ix_worker_dept_zone_active", "department_id", "zone_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    department_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("department.id"), nullable=False
    )
    zone_id: Mapped[int] = mapped_column(Integer, ForeignKey("zone.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true(), nullable=False
    )
    last_assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    department: Mapped[Department] = relationship("Department")
    zone: Mapped[Zone] = relationship("Zone")
