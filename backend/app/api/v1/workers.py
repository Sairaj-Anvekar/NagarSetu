from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import Admin
from app.schemas.common import Page
from app.schemas.workers import WorkerCreate, WorkerOut, WorkerUpdate
from app.services import worker_service

router = APIRouter(
    prefix="/workers",
    tags=["workers"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("", response_model=Page[WorkerOut])
def get_workers(
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[Admin, Depends(get_current_admin)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[WorkerOut]:
    items, total = worker_service.list_workers(
        db, page=page, page_size=page_size, department_id=admin.department_id
    )
    counts = worker_service.active_task_counts(db, [w.id for w in items])
    worker_outs: list[WorkerOut] = []
    for w in items:
        out = WorkerOut.model_validate(w)
        out.active_tasks = counts.get(w.id, 0)
        worker_outs.append(out)

    return Page[WorkerOut](
        items=worker_outs,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=WorkerOut, status_code=status.HTTP_201_CREATED)
def create_worker(
    payload: WorkerCreate,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[Admin, Depends(get_current_admin)],
) -> WorkerOut:
    try:
        worker = worker_service.create_worker(
            db, payload, department_id=admin.department_id
        )
    except worker_service.DuplicatePhone:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A worker with this phone number already exists",
        ) from None

    counts = worker_service.active_task_counts(db, [worker.id])
    out = WorkerOut.model_validate(worker)
    out.active_tasks = counts.get(worker.id, 0)
    return out


@router.patch("/{worker_id}", response_model=WorkerOut)
def update_worker(
    worker_id: int,
    payload: WorkerUpdate,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[Admin, Depends(get_current_admin)],
) -> WorkerOut:
    worker = worker_service.set_worker_active(
        db,
        worker_id=worker_id,
        is_active=payload.is_active,
        department_id=admin.department_id,
    )
    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found",
        )
    counts = worker_service.active_task_counts(db, [worker.id])
    out = WorkerOut.model_validate(worker)
    out.active_tasks = counts.get(worker.id, 0)
    return out
