from fastapi import APIRouter

from app.api.v1 import (
    admin_import,
    auth,
    enrollments,
    evaluations,
    formations,
    qualification_preview,
    reports,
    settings,
    sessions,
    users,
)


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(formations.router)
api_router.include_router(sessions.router)
api_router.include_router(enrollments.router)
api_router.include_router(evaluations.router)
api_router.include_router(reports.router)
api_router.include_router(admin_import.router)
api_router.include_router(qualification_preview.router)
api_router.include_router(settings.router)
