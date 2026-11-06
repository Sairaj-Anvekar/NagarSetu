from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.complaint_log import ComplaintLog
from app.models.constants import ActorType, LogEvent


def add_log(
    db: Session,
    complaint_id: UUID | int | str,
    event: LogEvent | str,
    actor_type: ActorType | str,
    actor_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> ComplaintLog:
    event_val = event.value if hasattr(event, "value") else str(event)
    actor_type_val = actor_type.value if hasattr(actor_type, "value") else str(actor_type)

    log_entry = ComplaintLog(
        complaint_id=complaint_id,
        event_type=event_val,
        actor_type=actor_type_val,
        actor_id=str(actor_id) if actor_id is not None else None,
        details=details,
    )
    db.add(log_entry)
    return log_entry

