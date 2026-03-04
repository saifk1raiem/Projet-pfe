from fastapi import APIRouter

from app.api.v1 import auth, enrollments, evaluations, formations, reports, sessions, users


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(formations.router)
api_router.include_router(sessions.router)
api_router.include_router(enrollments.router)
api_router.include_router(evaluations.router)
api_router.include_router(reports.router)
