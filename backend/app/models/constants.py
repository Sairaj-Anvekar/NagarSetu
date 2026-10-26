from enum import Enum, StrEnum


class ComplaintStatus(StrEnum):
    SUBMITTED = "Submitted"
    IN_PROGRESS = "In-Progress"
    COMPLETED = "Completed"


class Priority(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ClassificationSource(StrEnum):
    IMAGE = "image"
    TEXT = "text"
    MANUAL = "manual"


def check_in_values(column_name: str, enum_cls: type[Enum]) -> str:
    values = ",".join(f"'{item.value}'" for item in enum_cls)
    return f"{column_name} IN ({values})"


class LogEvent(StrEnum):
    CREATED = "CREATED"
    CLASSIFIED = "CLASSIFIED"
    CONFIRMED = "CONFIRMED"
    ASSIGNED = "ASSIGNED"
    STARTED = "STARTED"
    DEFERRED = "DEFERRED"
    COMPLETED = "COMPLETED"


class ActorType(StrEnum):
    CITIZEN = "citizen"
    WORKER = "worker"
    ADMIN = "admin"
    SYSTEM = "system"


class AssignmentEndReason(StrEnum):
    COMPLETED = "completed"
    DEFERRED = "deferred"
    WORKER_DEACTIVATED = "worker_deactivated"
    REASSIGNED = "reassigned"


class TriageStatus(StrEnum):
    PENDING = "pending"
    REVIEWED = "reviewed"

