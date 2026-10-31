from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.core.config import get_settings

ALLOWED_ROLES = {"admin", "worker"}


def hash_secret(plain: str) -> str:
    """Hash a plain text secret using bcrypt with a random salt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_secret(plain: str, hashed: str) -> bool:
    """Verify a plain text secret against a bcrypt hash in constant time.

    Returns False if the hash is malformed or if verification fails; never raises.
    """
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(
    subject: str,
    role: str,
    name: str | None = None,
    expires_minutes: int | None = None,
) -> str:
    """Create a signed JWT access token for an authenticated user."""
    if role not in ALLOWED_ROLES:
        raise ValueError(f"Invalid role: {role!r}. Allowed roles are 'admin' and 'worker'.")

    settings = get_settings()
    if expires_minutes is None:
        expires_minutes = settings.access_token_expire_minutes

    now = datetime.now(UTC)
    expire = now + timedelta(minutes=expires_minutes)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "name": name,
        "iat": now,
        "exp": expire,
    }

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Verifies signature and expiry, requiring sub, role, and exp claims.
    Pins the algorithm to settings.jwt_algorithm.
    Lets jwt exceptions (jwt.ExpiredSignatureError, jwt.InvalidTokenError) propagate.
    """
    settings = get_settings()
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "role", "exp"]},
    )
