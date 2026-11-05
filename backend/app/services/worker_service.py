from fastapi.exceptions import RequestValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_secret
from app.models import Department, Worker, Zone
from app.schemas.workers import WorkerCreate


class DuplicatePhone(Exception):
    pass


def list_workers(
    db: Session, page: int, page_size: int
) -> tuple[list[Worker], int]:
    total = db.scalar(select(func.count()).select_from(Worker)) or 0
    offset = (page - 1) * page_size
    stmt = (
        select(Worker)
        .options(joinedload(Worker.department), joinedload(Worker.zone))
        .order_by(Worker.id)
        .offset(offset)
        .limit(page_size)
    )
    workers = list(db.scalars(stmt).unique().all())
    return workers, total


def create_worker(db: Session, data: WorkerCreate) -> Worker:
    department = db.get(Department, data.department_id)
    if not department:
        raise RequestValidationError(
            [
                {
                    "loc": ("body", "department_id"),
                    "msg": "Department not found",
                    "type": "value_error",
                }
            ]
        )

    zone = db.get(Zone, data.zone_id)
    if not zone:
        raise RequestValidationError(
            [
                {
                    "loc": ("body", "zone_id"),
                    "msg": "Zone not found",
                    "type": "value_error",
                }
            ]
        )

    existing_phone = db.scalar(select(Worker).where(Worker.phone == data.phone))
    if existing_phone:
        raise DuplicatePhone()

    worker = Worker(
        name=data.name,
        phone=data.phone,
        pin_hash=hash_secret(data.pin),
        department_id=data.department_id,
        zone_id=data.zone_id,
        is_active=True,
    )
    db.add(worker)
    try:
        db.commit()
        db.refresh(worker)
    except IntegrityError:
        db.rollback()
        raise DuplicatePhone() from None

    return worker


def set_worker_active(
    db: Session, worker_id: int, is_active: bool
) -> Worker | None:
    worker = db.get(
        Worker,
        worker_id,
        options=[joinedload(Worker.department), joinedload(Worker.zone)],
    )
    if not worker:
        return None

    worker.is_active = is_active
    db.commit()
    db.refresh(worker)
    return worker


def list_departments(
    db: Session, page: int, page_size: int
) -> tuple[list[Department], int]:
    total = db.scalar(select(func.count()).select_from(Department)) or 0
    offset = (page - 1) * page_size
    stmt = (
        select(Department)
        .order_by(Department.id)
        .offset(offset)
        .limit(page_size)
    )
    departments = list(db.scalars(stmt).all())
    return departments, total


def list_zones(
    db: Session, page: int, page_size: int
) -> tuple[list[Zone], int]:
    total = db.scalar(select(func.count()).select_from(Zone)) or 0
    offset = (page - 1) * page_size
    stmt = (
        select(Zone)
        .order_by(Zone.id)
        .offset(offset)
        .limit(page_size)
    )
    zones = list(db.scalars(stmt).all())
    return zones, total

