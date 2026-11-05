from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import AdminLoginRequest, TokenResponse, WorkerLoginRequest
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/admin/login", response_model=TokenResponse)
def login_admin(
    payload: AdminLoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    """Authenticate an administrator and return a JWT access token."""
    try:
        admin = auth_service.authenticate_admin(
            db, username=payload.username, password=payload.password
        )
    except auth_service.InvalidCredentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        ) from None
    except auth_service.AccountDisabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is deactivated. Contact an administrator.",
        ) from None

    return auth_service.build_token_response(admin, role="admin")


@router.post("/worker/login", response_model=TokenResponse)
def login_worker(
    payload: WorkerLoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    """Authenticate a field worker and return a JWT access token."""
    try:
        worker = auth_service.authenticate_worker(
            db, phone=payload.phone, pin=payload.pin
        )
    except auth_service.InvalidCredentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone or PIN",
        ) from None
    except auth_service.AccountDisabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is deactivated. Contact an administrator.",
        ) from None

    return auth_service.build_token_response(worker, role="worker")
