from fastapi.exceptions import RequestValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_secret
from app.models import Department, Worker, Zone
from app.schemas.workers import WorkerCreate
from app.services import assignment_service


class DuplicatePhone(Exception):
    pass


def list_workers(
    db: Session, page: int, page_size: int, department_id: int
) -> tuple[list[Worker], int]:
    count_stmt = (
        select(func.count())
        .select_from(Worker)
        .where(Worker.department_id == department_id)
    )
    total = db.scalar(count_stmt) or 0
    offset = (page - 1) * page_size
    stmt = (
        select(Worker)
        .where(Worker.department_id == department_id)
        .options(joinedload(Worker.department), joinedload(Worker.zone))
        .order_by(Worker.id)
        .offset(offset)
        .limit(page_size)
    )
    workers = list(db.scalars(stmt).unique().all())
    return workers, total


def create_worker(
    db: Session, data: WorkerCreate, department_id: int
) -> Worker:
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
        department_id=department_id,
        zone_id=data.zone_id,
        is_active=True,
    )
    db.add(worker)
    try:
        db.flush()
        if worker.is_active:
            assignment_service.assign_pending(
                db, department_id=worker.department_id, zone_id=worker.zone_id
            )
        db.commit()
        db.refresh(worker)
    except IntegrityError:
        db.rollback()
        raise DuplicatePhone() from None

    return worker


def set_worker_active(
    db: Session, worker_id: int, is_active: bool, department_id: int
) -> Worker | None:
    worker = db.get(
        Worker,
        worker_id,
        options=[joinedload(Worker.department), joinedload(Worker.zone)],
    )
    if not worker or worker.department_id != department_id:
        return None

    was_active = worker.is_active
    worker.is_active = is_active
    db.flush()

    if was_active and not is_active:
        assignment_service.release_worker_tasks(db, worker_id)
    elif not was_active and is_active:
        assignment_service.assign_pending(
            db, department_id=worker.department_id, zone_id=worker.zone_id
        )

    db.commit()
    db.refresh(worker)
    return worker


def list_departments(
    db: Session, page: int, page_size: int, department_id: int
) -> tuple[list[Department], int]:
    count_stmt = (
        select(func.count())
        .select_from(Department)
        .where(Department.id == department_id)
    )
    total = db.scalar(count_stmt) or 0
    offset = (page - 1) * page_size
    stmt = (
        select(Department)
        .where(Department.id == department_id)
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
