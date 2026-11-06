import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_phone
from app.schemas.common import RefOut


class WorkerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str
    pin: str = Field(pattern=r"^\d{4}$")
    department_id: int | None = None  # Ignored: the logged-in admin's department is always used
    zone_id: int

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("pin", mode="before")
    @classmethod
    def validate_pin(cls, v: Any) -> Any:
        if not isinstance(v, str) or not re.match(r"^\d{4}$", v):
            raise ValueError("PIN must be exactly 4 digits")
        return v


class WorkerUpdate(BaseModel):
    is_active: bool


class WorkerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    phone: str
    department: RefOut
    zone: RefOut
    is_active: bool

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v: Any) -> str:
        return str(v)

