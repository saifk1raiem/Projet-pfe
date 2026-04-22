from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.models.enums import PlanningClassroom, PlanningPeriod


class PlanningAllocationBase(BaseModel):
    classroom: PlanningClassroom
    assigned_count: int = Field(gt=0)


class PlanningAllocationCreate(PlanningAllocationBase):
    pass


class PlanningAllocationRead(PlanningAllocationBase):
    id: int
    capacity: int

    model_config = {"from_attributes": True}


class PlanningClassroomAvailability(BaseModel):
    classroom: PlanningClassroom
    capacity: int
    is_available: bool


class PlanningSuggestionSummary(BaseModel):
    rooms_used: int
    total_capacity: int
    unused_seats: int


class PlanningSuggestionRequest(BaseModel):
    reservation_date: date
    period: PlanningPeriod
    effectif: int = Field(gt=0)


class PlanningSuggestionRead(BaseModel):
    reservation_date: date
    period: PlanningPeriod
    effectif: int
    practical_days: float = 2.5
    theoretical_days: float = 2.5
    classrooms: list[PlanningClassroomAvailability]
    suggested_allocations: list[PlanningAllocationBase]
    summary: PlanningSuggestionSummary


class PlanningReservationCreate(BaseModel):
    reservation_date: date
    period: PlanningPeriod
    effectif: int = Field(gt=0)
    allocations: list[PlanningAllocationCreate]

    @model_validator(mode="after")
    def validate_allocations(self):
        if not self.allocations:
            raise ValueError("At least one classroom allocation is required")

        classrooms = [allocation.classroom for allocation in self.allocations]
        if len(classrooms) != len(set(classrooms)):
            raise ValueError("Each classroom can only appear once in a reservation")

        if sum(allocation.assigned_count for allocation in self.allocations) != self.effectif:
            raise ValueError("The sum of assigned_count values must equal effectif")

        return self


class PlanningReservationPeriodUpdate(BaseModel):
    period: PlanningPeriod


class PlanningReservationRead(BaseModel):
    id: int
    reference: str
    reservation_date: date
    period: PlanningPeriod
    effectif: int
    practical_days: float
    theoretical_days: float
    rooms_used: int
    total_capacity: int
    unused_seats: int
    created_by_name: str
    created_at: datetime
    allocations: list[PlanningAllocationRead]

    model_config = {"from_attributes": True}
