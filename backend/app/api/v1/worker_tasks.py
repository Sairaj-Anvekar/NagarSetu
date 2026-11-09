from typing import Annotated, Any
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_current_worker
from app.core.config import get_settings
from app.db.session import get_db
from app.models import Worker
from app.schemas.common import Page
from app.schemas.tasks import DeferOut, DeferRequest, HistoryItemOut, TaskOut
from app.services import (
    image_service,
    nsfw_check_service,
    storage_service,
    task_service,
)

router = APIRouter(tags=["worker tasks"])


def _max_upload_bytes() -> int:
    return get_settings().max_upload_bytes


@router.get("/workers/me/tasks", response_model=Page[TaskOut])
def get_my_tasks(
    worker: Annotated[Worker, Depends(get_current_worker)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> Page[TaskOut]:
    items, total = task_service.list_active_tasks(
        db=db, worker=worker, page=page, page_size=page_size
    )
    return Page[TaskOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/workers/me/history", response_model=Page[HistoryItemOut])
def get_my_history(
    worker: Annotated[Worker, Depends(get_current_worker)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
) -> Page[HistoryItemOut]:
    items, total = task_service.list_history(
        db=db, worker=worker, page=page, page_size=page_size
    )
    return Page[HistoryItemOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/complaints/{complaint_id}", response_model=TaskOut)
def get_complaint_task(
    complaint_id: UUID,
    worker: Annotated[Worker, Depends(get_current_worker)],
    db: Annotated[Session, Depends(get_db)],
) -> TaskOut:
    try:
        return task_service.get_task(
            db=db, worker=worker, complaint_id=complaint_id
        )
    except task_service.TaskNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        ) from None


@router.patch("/complaints/{complaint_id}/start", response_model=TaskOut)
def start_complaint_task(
    complaint_id: UUID,
    worker: Annotated[Worker, Depends(get_current_worker)],
    db: Annotated[Session, Depends(get_db)],
) -> TaskOut:
    try:
        task = task_service.start_task(
            db=db, worker=worker, complaint_id=complaint_id
        )
        db.commit()
        return task
    except task_service.TaskNotFound:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        ) from None
    except task_service.TaskConflict as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        ) from None


@router.patch("/complaints/{complaint_id}/defer", response_model=DeferOut)
def defer_complaint_task(
    complaint_id: UUID,
    body: DeferRequest,
    worker: Annotated[Worker, Depends(get_current_worker)],
    db: Annotated[Session, Depends(get_db)],
) -> DeferOut:
    try:
        result = task_service.defer_task(
            db=db,
            worker=worker,
            complaint_id=complaint_id,
            reason=body.reason,
        )
        db.commit()
        return result
    except task_service.TaskNotFound:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        ) from None
    except task_service.TaskConflict as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        ) from None


@router.patch("/complaints/{complaint_id}/complete", response_model=TaskOut)
def complete_complaint_task(
    complaint_id: UUID,
    note: Annotated[str, Form()],
    photo: Annotated[UploadFile, File()],
    worker: Annotated[Worker, Depends(get_current_worker)],
    db: Annotated[Session, Depends(get_db)],
) -> TaskOut:
    errors: list[dict[str, Any]] = []

    cleaned_note = note.strip()
    if len(cleaned_note) < 10:
        errors.append(
            {
                "loc": ("body", "note"),
                "msg": "Note must be at least 10 characters",
                "type": "value_error",
            }
        )
    elif len(cleaned_note) > 500:
        errors.append(
            {
                "loc": ("body", "note"),
                "msg": "Note must be at most 500 characters",
                "type": "value_error",
            }
        )

    max_bytes = _max_upload_bytes()
    data = photo.file.read(max_bytes + 1)
    validated_image = None
    try:
        validated_image = image_service.validate_image(data, max_bytes=max_bytes)
    except image_service.ImageRejected as e:
        errors.append(
            {
                "loc": ("body", "photo"),
                "msg": str(e),
                "type": "value_error",
            }
        )

    if validated_image is not None:
        verdict = nsfw_check_service.check_image(data)
        if not verdict.allowed:
            errors.append(
                {
                    "loc": ("body", "photo"),
                    "msg": "This image cannot be accepted",
                    "type": "value_error",
                }
            )

    if errors:
        raise RequestValidationError(errors)

    assert validated_image is not None

    try:
        result = task_service.complete_task(
            db=db,
            worker=worker,
            complaint_id=complaint_id,
            note=cleaned_note,
            photo_bytes=data,
            image=validated_image,
        )
    except task_service.TaskNotFound:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        ) from None
    except task_service.TaskConflict as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=e.message,
        ) from None
    except storage_service.StorageError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Photo storage is unavailable. Please try again.",
        ) from None

    try:
        db.commit()
    except Exception:
        db.rollback()
        try:
            storage_service.get_storage().delete_object(result.photo_key)
        except Exception:
            pass
        raise

    return result.task
