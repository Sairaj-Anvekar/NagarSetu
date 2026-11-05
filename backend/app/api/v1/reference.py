from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.schemas.common import Page, RefOut
from app.services import worker_service

router = APIRouter(tags=["reference"], dependencies=[Depends(get_current_admin)])


@router.get("/departments", response_model=Page[RefOut])
def get_departments(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[RefOut]:
    items, total = worker_service.list_departments(
        db, page=page, page_size=page_size
    )
    return Page[RefOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/zones", response_model=Page[RefOut])
def get_zones(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[RefOut]:
    items, total = worker_service.list_zones(
        db, page=page, page_size=page_size
    )
    return Page[RefOut](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )

