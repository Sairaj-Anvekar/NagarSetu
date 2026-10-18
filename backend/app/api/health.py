from typing import Any
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.services import health_service

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
def ready() -> Any:
    checks = health_service.run_checks()
    all_ok = all(check.get("ok", False) for check in checks.values())
    if all_ok:
        return {"status": "ready", "checks": checks}
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "not_ready", "checks": checks},
    )
