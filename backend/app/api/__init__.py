from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.logs import router as logs_router
from app.api.alerts import router as alerts_router
from app.api.reports import router as reports_router
from app.api.monitoring import router as monitoring_router

# Master router — mounted with prefix="/api/v1" in main.py
api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(logs_router)
api_router.include_router(alerts_router)
api_router.include_router(reports_router)
api_router.include_router(monitoring_router)

__all__ = ["api_router"]
