import secrets
from datetime import UTC, datetime

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_tracking_code(now: datetime | None = None) -> str:
    if now is None:
        year = datetime.now(UTC).year
    elif now.tzinfo is not None:
        year = now.astimezone(UTC).year
    else:
        year = now.year

    suffix = "".join(secrets.choice(ALPHABET) for _ in range(4))
    return f"GRV-{year:04d}-{suffix}"
