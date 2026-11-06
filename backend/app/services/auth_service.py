from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_secret, verify_secret
from app.models import Admin, Worker
from app.schemas.auth import TokenResponse, UserOut
from app.schemas.common import RefOut


class InvalidCredentials(Exception):
    """Raised when authentication credentials (password or PIN) are invalid."""


class AccountDisabled(Exception):
    """Raised when authentication succeeds but the account is deactivated."""


_DUMMY_HASH: str | None = None


def _get_dummy_hash() -> str:
    """Return a lazily computed, cached hash to prevent user-enumeration timing attacks."""
    global _DUMMY_HASH
    if _DUMMY_HASH is None:
        _DUMMY_HASH = hash_secret("dummy-secret-for-timing-mitigation")
    return _DUMMY_HASH


def authenticate_admin(db: Session, username: str, password: str) -> Admin:
    """Authenticate an administrator against the database."""
    stmt = select(Admin).where(Admin.username == username)
    admin = db.scalars(stmt).first()

    if admin is None:
        verify_secret(password, _get_dummy_hash())
        raise InvalidCredentials()

    if not verify_secret(password, admin.password_hash):
        raise InvalidCredentials()

    if not admin.is_active:
        raise AccountDisabled()

    return admin


def authenticate_worker(db: Session, phone: str, pin: str) -> Worker:
    """Authenticate a field worker against the database."""
    stmt = select(Worker).where(Worker.phone == phone)
    worker = db.scalars(stmt).first()

    if worker is None:
        verify_secret(pin, _get_dummy_hash())
        raise InvalidCredentials()

    if not verify_secret(pin, worker.pin_hash):
        raise InvalidCredentials()

    if not worker.is_active:
        raise AccountDisabled()

    return worker


def build_token_response(user: Any, role: str) -> TokenResponse:
    """Generate a JWT and structure the standard TokenResponse."""
    department_out: RefOut | None = None
    if role == "admin":
        name = getattr(user, "full_name", None) or getattr(user, "username", "")
        dept = getattr(user, "department", None)
        if dept is not None:
            department_out = RefOut(id=str(dept.id), name=dept.name)
    else:
        name = getattr(user, "name", "")

    user_id_str = str(user.id)
    token = create_access_token(subject=user_id_str, role=role, name=name)
    user_out = UserOut(id=user_id_str, name=name, role=role, department=department_out)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_out,
    )

