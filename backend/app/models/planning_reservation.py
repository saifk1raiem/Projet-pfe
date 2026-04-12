from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PlanningClassroom, PlanningPeriod


CLASSROOM_CAPACITIES = {
    PlanningClassroom.class_1: 30,
    PlanningClassroom.class_2: 33,
    PlanningClassroom.intermediate: 45,
}


class PlanningReservation(Base):
    __tablename__ = "planning_reservations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    reservation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period: Mapped[PlanningPeriod] = mapped_column(
        Enum(PlanningPeriod, name="planning_period", native_enum=False), nullable=False, index=True
    )
    effectif: Mapped[int] = mapped_column(Integer, nullable=False)
    practical_days: Mapped[float] = mapped_column(Float, nullable=False, default=2.5, server_default="2.5")
    theoretical_days: Mapped[float] = mapped_column(Float, nullable=False, default=2.5, server_default="2.5")
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    created_by: Mapped["User"] = relationship(back_populates="planning_reservations")
    allocations: Mapped[list["PlanningReservationAllocation"]] = relationship(
        back_populates="reservation",
        cascade="all, delete-orphan",
        order_by="PlanningReservationAllocation.classroom.asc()",
    )

    @property
    def reference(self) -> str:
        return f"PLN-{self.id:04d}"

    @property
    def rooms_used(self) -> int:
        return len(self.allocations)

    @property
    def total_capacity(self) -> int:
        return sum(CLASSROOM_CAPACITIES[allocation.classroom] for allocation in self.allocations)

    @property
    def unused_seats(self) -> int:
        return self.total_capacity - self.effectif

    @property
    def created_by_name(self) -> str:
        if not self.created_by:
            return "-"
        full_name = f"{self.created_by.first_name} {self.created_by.last_name}".strip()
        return self.created_by.username or full_name or self.created_by.email


class PlanningReservationAllocation(Base):
    __tablename__ = "planning_reservation_allocations"
    __table_args__ = (
        UniqueConstraint(
            "reservation_date",
            "period",
            "classroom",
            name="uq_planning_reservation_allocation_slot",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        ForeignKey("planning_reservations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reservation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period: Mapped[PlanningPeriod] = mapped_column(
        Enum(PlanningPeriod, name="planning_period", native_enum=False), nullable=False, index=True
    )
    classroom: Mapped[PlanningClassroom] = mapped_column(
        Enum(PlanningClassroom, name="planning_classroom", native_enum=False), nullable=False
    )
    assigned_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    reservation: Mapped["PlanningReservation"] = relationship(back_populates="allocations")

    @property
    def capacity(self) -> int:
        return CLASSROOM_CAPACITIES[self.classroom]
