from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.services.dashboard_service import get_dashboard_snapshot, parse_dashboard_date


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def read_dashboard_snapshot(
    date_value: str | None = Query(default=None, alias="date"),
    search: str = Query(default=""),
    group_value: str | None = Query(default=None, alias="group"),
    segment: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    try:
        target_date = parse_dashboard_date(date_value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD.",
        ) from exc

    normalized_group = None if group_value in (None, "", "all") else group_value
    normalized_segment = None if segment in (None, "", "all") else segment
    return get_dashboard_snapshot(
        db,
        target_date=target_date,
        search=search,
        groupe=normalized_group,
        segment=normalized_segment,
    )
