from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.reference import router as reference_router
from app.api.v1.workers import router as workers_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(workers_router)
api_router.include_router(reference_router)

