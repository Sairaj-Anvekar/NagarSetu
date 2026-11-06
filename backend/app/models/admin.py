from sqlalchemy import Boolean, ForeignKey, Integer, String, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.department import Department
from app.models.mixins import TimestampMixin


class Admin(TimestampMixin, Base):
    __tablename__ = "admin"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("department.id"), nullable=False
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true(), nullable=False
    )

    department: Mapped[Department] = relationship("Department")
