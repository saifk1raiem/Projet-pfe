from datetime import date

from pydantic import BaseModel


class DashboardMetric(BaseModel):
    value: float | int
    trend: float | None = None


class DashboardMetricsResponse(BaseModel):
    generated_at: date
    period_start: date
    period_end: date
    comparison_period_start: date
    comparison_period_end: date
    comparison_date: date
    total_collaborateurs: DashboardMetric
    nouvelles_recrues: DashboardMetric
    sorties: DashboardMetric
    formateurs_disponibles: DashboardMetric
    formations_en_cours: DashboardMetric
    taux_presence: DashboardMetric


class DashboardPieSlice(BaseModel):
    label: str
    value: int


class DashboardMonthlyEntriesExitsPoint(BaseModel):
    period_start: date
    label: str
    entries: int
    exits: int


class DashboardWeeklyAvailabilityPoint(BaseModel):
    week_start: date
    label: str
    disponibles: int
    occupes: int


class DashboardMonthlyActivityPoint(BaseModel):
    period_start: date
    label: str
    associations: int
    completions: int


class DashboardMonthlyHealthPoint(BaseModel):
    period_start: date
    label: str
    on_track: int
    overdue: int


class DashboardChartsResponse(BaseModel):
    centre_cout_distribution: list[DashboardPieSlice]
    qualification_status_distribution: list[DashboardPieSlice]
    entries_exits_monthly: list[DashboardMonthlyEntriesExitsPoint]
    trainer_availability_weekly: list[DashboardWeeklyAvailabilityPoint]
    qualification_activity_monthly: list[DashboardMonthlyActivityPoint]
    qualification_health_monthly: list[DashboardMonthlyHealthPoint]


class DashboardOverviewResponse(BaseModel):
    metrics: DashboardMetricsResponse
    charts: DashboardChartsResponse
