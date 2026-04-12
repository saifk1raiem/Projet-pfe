from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import PlanningClassroom, PlanningPeriod, UserRole
from app.models.planning_reservation import (
    CLASSROOM_CAPACITIES,
    PlanningReservation,
    PlanningReservationAllocation,
)
from app.models.user import User
from app.schemas.planning import (
    PlanningAllocationBase,
    PlanningAllocationCreate,
    PlanningClassroomAvailability,
    PlanningReservationCreate,
    PlanningReservationPeriodUpdate,
    PlanningReservationRead,
    PlanningSuggestionRead,
    PlanningSuggestionRequest,
    PlanningSuggestionSummary,
)


router = APIRouter(prefix="/planning", tags=["planning"])

CLASSROOM_ORDER = [
    PlanningClassroom.class_1,
    PlanningClassroom.class_2,
    PlanningClassroom.intermediate,
]
PERIOD_ORDER = {
    PlanningPeriod.morning: 0,
    PlanningPeriod.evening: 1,
}


def get_available_classrooms(db: Session, reservation_date: date, period: PlanningPeriod) -> list[PlanningClassroom]:
    reserved_classrooms = set(
        db.scalars(
            select(PlanningReservationAllocation.classroom).where(
                PlanningReservationAllocation.reservation_date == reservation_date,
                PlanningReservationAllocation.period == period,
            )
        ).all()
    )
    return [classroom for classroom in CLASSROOM_ORDER if classroom not in reserved_classrooms]


def get_available_classrooms_for_update(
    db: Session,
    reservation_date: date,
    period: PlanningPeriod,
    reservation_id: int,
) -> list[PlanningClassroom]:
    reserved_classrooms = set(
        db.scalars(
            select(PlanningReservationAllocation.classroom)
            .join(
                PlanningReservation,
                PlanningReservation.id == PlanningReservationAllocation.reservation_id,
            )
            .where(
                PlanningReservationAllocation.reservation_date == reservation_date,
                PlanningReservationAllocation.period == period,
                PlanningReservation.id != reservation_id,
            )
        ).all()
    )
    return [classroom for classroom in CLASSROOM_ORDER if classroom not in reserved_classrooms]


def build_best_plan(
    effectif: int, available_classrooms: list[PlanningClassroom]
) -> tuple[list[PlanningAllocationBase], PlanningSuggestionSummary]:
    candidates: list[tuple[list[PlanningClassroom], int, int, int]] = []

    for mask in range(1, 1 << len(available_classrooms)):
        selected = [
            available_classrooms[index]
            for index in range(len(available_classrooms))
            if mask & (1 << index)
        ]
        total_capacity = sum(CLASSROOM_CAPACITIES[classroom] for classroom in selected)
        if total_capacity < effectif:
            continue

        candidates.append(
            (
                selected,
                len(selected),
                total_capacity - effectif,
                total_capacity,
            )
        )

    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No available classroom combination can absorb this effectif for the selected date and period.",
        )

    selected_classrooms, _, unused_seats, total_capacity = min(
        candidates,
        key=lambda candidate: (candidate[1], candidate[2], candidate[3]),
    )

    remaining = effectif
    ordered_for_fill = sorted(
        selected_classrooms,
        key=lambda classroom: (-CLASSROOM_CAPACITIES[classroom], CLASSROOM_ORDER.index(classroom)),
    )
    allocations: list[PlanningAllocationBase] = []
    for classroom in ordered_for_fill:
        assigned_count = min(remaining, CLASSROOM_CAPACITIES[classroom])
        if assigned_count > 0:
            allocations.append(
                PlanningAllocationBase(classroom=classroom, assigned_count=assigned_count)
            )
            remaining -= assigned_count

    allocations.sort(key=lambda allocation: CLASSROOM_ORDER.index(allocation.classroom))
    return allocations, PlanningSuggestionSummary(
        rooms_used=len(allocations),
        total_capacity=total_capacity,
        unused_seats=unused_seats,
    )


def get_classroom_availability(
    available_classrooms: list[PlanningClassroom],
) -> list[PlanningClassroomAvailability]:
    available_set = set(available_classrooms)
    return [
        PlanningClassroomAvailability(
            classroom=classroom,
            capacity=CLASSROOM_CAPACITIES[classroom],
            is_available=classroom in available_set,
        )
        for classroom in CLASSROOM_ORDER
    ]


def validate_manual_allocations(allocations: list[PlanningAllocationCreate], available_classrooms: list[PlanningClassroom]) -> None:
    available_set = set(available_classrooms)
    for allocation in allocations:
        capacity = CLASSROOM_CAPACITIES[allocation.classroom]
        if allocation.classroom not in available_set:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{allocation.classroom.value} is already reserved for the selected date and period.",
            )
        if allocation.assigned_count > capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{allocation.classroom.value} cannot exceed its capacity of {capacity}.",
            )


def load_reservation(db: Session, reservation_id: int) -> PlanningReservation | None:
    stmt = (
        select(PlanningReservation)
        .options(
            selectinload(PlanningReservation.allocations),
            selectinload(PlanningReservation.created_by),
        )
        .where(PlanningReservation.id == reservation_id)
    )
    return db.scalar(stmt)


@router.post("/suggestions", response_model=PlanningSuggestionRead)
def suggest_planning(
    payload: PlanningSuggestionRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    available_classrooms = get_available_classrooms(db, payload.reservation_date, payload.period)
    if not available_classrooms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All classrooms are already reserved for the selected date and period.",
        )

    total_available_capacity = sum(CLASSROOM_CAPACITIES[classroom] for classroom in available_classrooms)
    if total_available_capacity < payload.effectif:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Only {total_available_capacity} seat(s) remain available for the selected date and period."
            ),
        )

    suggested_allocations, summary = build_best_plan(payload.effectif, available_classrooms)
    return PlanningSuggestionRead(
        reservation_date=payload.reservation_date,
        period=payload.period,
        effectif=payload.effectif,
        classrooms=get_classroom_availability(available_classrooms),
        suggested_allocations=suggested_allocations,
        summary=summary,
    )


@router.get("/reservations", response_model=list[PlanningReservationRead])
def list_planning_reservations(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    stmt = select(PlanningReservation).options(
        selectinload(PlanningReservation.allocations),
        selectinload(PlanningReservation.created_by),
    )
    if start_date:
        stmt = stmt.where(PlanningReservation.reservation_date >= start_date)
    if end_date:
        stmt = stmt.where(PlanningReservation.reservation_date <= end_date)

    reservations = list(db.scalars(stmt).all())
    reservations.sort(
        key=lambda reservation: (
            reservation.reservation_date,
            PERIOD_ORDER.get(reservation.period, 99),
            reservation.id,
        )
    )
    return reservations


@router.post("/reservations", response_model=PlanningReservationRead, status_code=status.HTTP_201_CREATED)
def create_planning_reservation(
    payload: PlanningReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    available_classrooms = get_available_classrooms(db, payload.reservation_date, payload.period)
    total_available_capacity = sum(CLASSROOM_CAPACITIES[classroom] for classroom in available_classrooms)
    if total_available_capacity < payload.effectif:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Only {total_available_capacity} seat(s) remain available for the selected date and period."
            ),
        )

    validate_manual_allocations(payload.allocations, available_classrooms)

    reservation = PlanningReservation(
        reservation_date=payload.reservation_date,
        period=payload.period,
        effectif=payload.effectif,
        created_by_id=current_user.id,
    )
    reservation.allocations = [
        PlanningReservationAllocation(
            reservation_date=payload.reservation_date,
            period=payload.period,
            classroom=allocation.classroom,
            assigned_count=allocation.assigned_count,
        )
        for allocation in payload.allocations
    ]

    db.add(reservation)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more classrooms were reserved a moment ago. Refresh the plan and try again.",
        ) from exc

    persisted = load_reservation(db, reservation.id)
    if not persisted:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load reservation")
    return persisted


@router.patch("/reservations/{reservation_id}/period", response_model=PlanningReservationRead)
def update_planning_reservation_period(
    reservation_id: int,
    payload: PlanningReservationPeriodUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    reservation = load_reservation(db, reservation_id)
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    if payload.period == reservation.period:
        return reservation

    available_classrooms = set(
        get_available_classrooms_for_update(
            db,
            reservation.reservation_date,
            payload.period,
            reservation.id,
        )
    )
    blocked_classrooms = [
        allocation.classroom.value
        for allocation in reservation.allocations
        if allocation.classroom not in available_classrooms
    ]
    if blocked_classrooms:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot move this reservation to the selected period because "
                f"{', '.join(blocked_classrooms)} is already reserved."
            ),
        )

    reservation.period = payload.period
    for allocation in reservation.allocations:
        allocation.period = payload.period

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more classrooms were reserved a moment ago. Refresh and try again.",
        ) from exc

    persisted = load_reservation(db, reservation.id)
    if not persisted:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load reservation")
    return persisted
