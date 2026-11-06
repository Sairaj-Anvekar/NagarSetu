import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.phone import normalize_phone
from app.schemas.common import RefOut


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=100)

    @field_validator("username", "password", mode="before")
    @classmethod
    def strip_whitespace(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.strip()
        return v


class WorkerLoginRequest(BaseModel):
    phone: str
    pin: str = Field(pattern=r"^\d{4}$")

    @field_validator("pin", mode="before")
    @classmethod
    def validate_pin(cls, v: Any) -> Any:
        if not isinstance(v, str) or not re.match(r"^\d{4}$", v):
            raise ValueError("PIN must be 4 digits")
        return v

    @field_validator("phone", mode="after")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone(v)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role: str
    department: RefOut | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

