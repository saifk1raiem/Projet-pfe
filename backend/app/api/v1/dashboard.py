from __future__ import annotations

from calendar import monthrange
from dataclasses import dataclass
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.schemas.dashboard import (
    DashboardChartsResponse,
    DashboardMetric,
    DashboardMetricsResponse,
    DashboardMonthlyActivityPoint,
    DashboardMonthlyEntriesExitsPoint,
    DashboardMonthlyHealthPoint,
    DashboardOverviewResponse,
    DashboardPieSlice,
    DashboardWeeklyAvailabilityPoint,
)
from app.services.qualification_import_service import (
    collaborateurs_table,
    formateurs_table,
    formations_table,
    qualification_table,
    resolve_qualification_status,
)


router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MONTH_LABELS_FR = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]
OPEN_STATUSES = {"En cours", "Depassement"}


@dataclass(frozen=True)
class CollaboratorRecord:
    matricule: str
    recruitment_date: date | None
    centre_cout: str | None
    segment: str | None
    groupe: str | None


@dataclass(frozen=True)
class QualificationRecord:
    qualification_id: int
    matricule: str
    formation_id: int | None
    formateur_id: int | None
    statut: str | None
    etat_qualification: str | None
    association_date: date | None
    duration_days: int | None


@dataclass(frozen=True)
class DashboardContext:
    collaborators: list[CollaboratorRecord]
    qualifications: list[QualificationRecord]
    trainer_ids: list[int]
    qualifications_by_collaborateur: dict[str, list[QualificationRecord]]
    effective_entry_dates: list[date | None]


def _same_day_previous_month(day: date) -> date:
    if day.month == 1:
        year = day.year - 1
        month = 12
    else:
        year = day.year
        month = day.month - 1

    return date(year, month, min(day.day, monthrange(year, month)[1]))


def _percentage_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0 if current == 0 else 100.0
    return round(((current - previous) / previous) * 100, 1)


def _next_month_start(day: date) -> date:
    if day.month == 12:
        return date(day.year + 1, 1, 1)
    return date(day.year, day.month + 1, 1)


def _month_starts_including(reference_day: date, count: int) -> list[date]:
    current = reference_day.replace(day=1)
    starts: list[date] = []
    for _ in range(count):
        starts.append(current)
        current = _same_day_previous_month(current).replace(day=1)
    starts.reverse()
    return starts


def _week_starts_including(reference_day: date, count: int) -> list[date]:
    current_week_start = reference_day - timedelta(days=reference_day.weekday())
    return [current_week_start - timedelta(weeks=offset) for offset in range(count - 1, -1, -1)]


def _month_label(day: date) -> str:
    return MONTH_LABELS_FR[day.month - 1]


def _week_label(day: date) -> str:
    return f"S{day.isocalendar().week}"


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _collaborator_group_label(row: CollaboratorRecord) -> str:
    return (
        _clean_text(row.centre_cout)
        or _clean_text(row.segment)
        or _clean_text(row.groupe)
        or "Non renseigne"
    )


def _status_as_of(record: QualificationRecord, as_of: date) -> str | None:
    if record.association_date is not None and record.association_date > as_of:
        return None

    resolved = resolve_qualification_status(
        record.statut,
        record.association_date,
        record.duration_days,
        etat_qualification=record.etat_qualification,
        today=as_of,
    )

    if resolved != "Non associee":
        return resolved

    return None


def _effective_completion_date(record: QualificationRecord, as_of: date) -> date | None:
    if _status_as_of(record, as_of) == "Qualifie":
        return record.association_date
    return None


def _count_new_entries(entry_dates: list[date | None], period_start: date, period_end: date) -> int:
    return sum(1 for item in entry_dates if item is not None and period_start <= item <= period_end)


def _count_pipeline_exits(
    qualifications_by_collaborateur: dict[str, list[QualificationRecord]],
    period_start: date,
    period_end: date,
    snapshot_day: date,
) -> int:
    exits = 0

    for rows in qualifications_by_collaborateur.values():
        if any(_status_as_of(row, snapshot_day) in OPEN_STATUSES for row in rows):
            continue

        latest_completion = max(
            (
                completion_date
                for row in rows
                if (completion_date := _effective_completion_date(row, snapshot_day)) is not None
                and completion_date <= snapshot_day
            ),
            default=None,
        )
        if latest_completion is not None and period_start <= latest_completion <= period_end:
            exits += 1

    return exits


def _count_available_trainers(trainer_ids: list[int], qualifications: list[QualificationRecord], as_of: date) -> int:
    busy_ids = {
        row.formateur_id
        for row in qualifications
        if row.formateur_id is not None and _status_as_of(row, as_of) in OPEN_STATUSES
    }
    return sum(1 for trainer_id in trainer_ids if trainer_id not in busy_ids)


def _count_ongoing_formations(qualifications: list[QualificationRecord], as_of: date) -> int:
    return len(
        {
            row.formation_id
            for row in qualifications
            if row.formation_id is not None and _status_as_of(row, as_of) in OPEN_STATUSES
        }
    )


def _compute_on_track_rate(qualifications: list[QualificationRecord], as_of: date) -> float:
    started = 0
    on_track = 0

    for row in qualifications:
        status = _status_as_of(row, as_of)
        if status is None:
            continue

        started += 1
        if status != "Depassement":
            on_track += 1

    if started == 0:
        return 0.0

    return round((on_track / started) * 100, 1)


def _build_metric(current_value: float | int, previous_value: float | int) -> DashboardMetric:
    return DashboardMetric(value=current_value, trend=_percentage_change(float(current_value), float(previous_value)))


def _load_dashboard_context(db: Session) -> DashboardContext:
    collaborator_rows = [
        CollaboratorRecord(
            matricule=row["matricule"],
            recruitment_date=row["date_recrutement"],
            centre_cout=row["centre_cout"],
            segment=row["segment"],
            groupe=row["groupe"],
        )
        for row in db.execute(
            select(
                collaborateurs_table.c.matricule,
                collaborateurs_table.c.date_recrutement,
                collaborateurs_table.c.centre_cout,
                collaborateurs_table.c.segment,
                collaborateurs_table.c.groupe,
            )
        ).mappings().all()
    ]

    qualification_rows = [
        QualificationRecord(
            qualification_id=row["id"],
            matricule=row["matricule"],
            formation_id=row["formation_id"],
            formateur_id=row["formateur_id"],
            statut=row["statut"],
            etat_qualification=row["etat_qualification"],
            association_date=row["date_association_systeme"],
            duration_days=row["duree_jours"],
        )
        for row in db.execute(
            select(
                qualification_table.c.id,
                qualification_table.c.matricule,
                qualification_table.c.formation_id,
                qualification_table.c.formateur_id,
                qualification_table.c.statut,
                qualification_table.c.etat_qualification,
                qualification_table.c.date_association_systeme,
                formations_table.c.duree_jours,
            ).select_from(
                qualification_table.outerjoin(
                    formations_table,
                    formations_table.c.id == qualification_table.c.formation_id,
                )
            )
        ).mappings().all()
    ]

    trainer_ids = list(db.execute(select(formateurs_table.c.id)).scalars().all())

    first_association_by_matricule: dict[str, date] = {}
    qualifications_by_collaborateur: dict[str, list[QualificationRecord]] = {}
    for row in qualification_rows:
        qualifications_by_collaborateur.setdefault(row.matricule, []).append(row)
        if row.association_date is None:
            continue

        current_first = first_association_by_matricule.get(row.matricule)
        if current_first is None or row.association_date < current_first:
            first_association_by_matricule[row.matricule] = row.association_date

    effective_entry_dates: list[date | None] = []
    for row in collaborator_rows:
        first_association = first_association_by_matricule.get(row.matricule)
        if row.recruitment_date and first_association:
            effective_entry_dates.append(min(row.recruitment_date, first_association))
            continue
        effective_entry_dates.append(row.recruitment_date or first_association)

    return DashboardContext(
        collaborators=collaborator_rows,
        qualifications=qualification_rows,
        trainer_ids=trainer_ids,
        qualifications_by_collaborateur=qualifications_by_collaborateur,
        effective_entry_dates=effective_entry_dates,
    )


def _build_dashboard_metrics(context: DashboardContext, *, today: date) -> DashboardMetricsResponse:
    comparison_day = _same_day_previous_month(today)
    current_period_start = today.replace(day=1)
    comparison_period_start = comparison_day.replace(day=1)

    total_collaborateurs_current = len(context.collaborators)
    total_collaborateurs_previous = sum(
        1 for item in context.effective_entry_dates if item is None or item <= comparison_day
    )

    nouvelles_recrues_current = _count_new_entries(
        context.effective_entry_dates,
        current_period_start,
        today,
    )
    nouvelles_recrues_previous = _count_new_entries(
        context.effective_entry_dates,
        comparison_period_start,
        comparison_day,
    )

    sorties_current = _count_pipeline_exits(
        context.qualifications_by_collaborateur,
        current_period_start,
        today,
        today,
    )
    sorties_previous = _count_pipeline_exits(
        context.qualifications_by_collaborateur,
        comparison_period_start,
        comparison_day,
        comparison_day,
    )

    formateurs_disponibles_current = _count_available_trainers(context.trainer_ids, context.qualifications, today)
    formateurs_disponibles_previous = _count_available_trainers(
        context.trainer_ids,
        context.qualifications,
        comparison_day,
    )

    formations_en_cours_current = _count_ongoing_formations(context.qualifications, today)
    formations_en_cours_previous = _count_ongoing_formations(context.qualifications, comparison_day)

    taux_presence_current = _compute_on_track_rate(context.qualifications, today)
    taux_presence_previous = _compute_on_track_rate(context.qualifications, comparison_day)

    return DashboardMetricsResponse(
        generated_at=today,
        comparison_date=comparison_day,
        total_collaborateurs=_build_metric(total_collaborateurs_current, total_collaborateurs_previous),
        nouvelles_recrues=_build_metric(nouvelles_recrues_current, nouvelles_recrues_previous),
        sorties=_build_metric(sorties_current, sorties_previous),
        formateurs_disponibles=_build_metric(formateurs_disponibles_current, formateurs_disponibles_previous),
        formations_en_cours=_build_metric(formations_en_cours_current, formations_en_cours_previous),
        taux_presence=_build_metric(taux_presence_current, taux_presence_previous),
    )


def _build_centre_cout_distribution(context: DashboardContext) -> list[DashboardPieSlice]:
    counts: dict[str, int] = {}
    for row in context.collaborators:
        label = _collaborator_group_label(row)
        counts[label] = counts.get(label, 0) + 1

    items = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    if len(items) <= 6:
        return [DashboardPieSlice(label=label, value=value) for label, value in items]

    top_items = items[:5]
    other_total = sum(value for _, value in items[5:])
    result = [DashboardPieSlice(label=label, value=value) for label, value in top_items]
    if other_total:
        result.append(DashboardPieSlice(label="Autres", value=other_total))
    return result


def _build_qualification_status_distribution(
    context: DashboardContext,
    *,
    today: date,
) -> list[DashboardPieSlice]:
    counts = {
        "Qualifie": 0,
        "En cours": 0,
        "Depassement": 0,
        "Non associee": 0,
    }

    for qualification in context.qualifications:
        status = _status_as_of(qualification, today)
        counts[status or "Non associee"] += 1

    ordered_labels = ["Qualifie", "En cours", "Non associee", "Depassement"]
    return [DashboardPieSlice(label=label, value=counts[label]) for label in ordered_labels]


def _build_entries_exits_monthly(
    context: DashboardContext,
    *,
    today: date,
) -> list[DashboardMonthlyEntriesExitsPoint]:
    points: list[DashboardMonthlyEntriesExitsPoint] = []
    for month_start in _month_starts_including(today, 12):
        month_end = min(_next_month_start(month_start) - timedelta(days=1), today)
        points.append(
            DashboardMonthlyEntriesExitsPoint(
                period_start=month_start,
                label=_month_label(month_start),
                entries=_count_new_entries(context.effective_entry_dates, month_start, month_end),
                exits=_count_pipeline_exits(
                    context.qualifications_by_collaborateur,
                    month_start,
                    month_end,
                    month_end,
                ),
            )
        )
    return points


def _build_trainer_availability_weekly(
    context: DashboardContext,
    *,
    today: date,
) -> list[DashboardWeeklyAvailabilityPoint]:
    points: list[DashboardWeeklyAvailabilityPoint] = []
    for week_start in _week_starts_including(today, 8):
        week_end = min(week_start + timedelta(days=6), today)
        available = _count_available_trainers(context.trainer_ids, context.qualifications, week_end)
        total_trainers = len(context.trainer_ids)
        points.append(
            DashboardWeeklyAvailabilityPoint(
                week_start=week_start,
                label=_week_label(week_start),
                disponibles=available,
                occupes=max(total_trainers - available, 0),
            )
        )
    return points


def _build_qualification_activity_monthly(
    context: DashboardContext,
    *,
    today: date,
) -> list[DashboardMonthlyActivityPoint]:
    points: list[DashboardMonthlyActivityPoint] = []
    for month_start in _month_starts_including(today, 12):
        next_month_start = min(_next_month_start(month_start), today + timedelta(days=1))
        month_end = min(_next_month_start(month_start) - timedelta(days=1), today)
        associations = sum(
            1
            for row in context.qualifications
            if row.association_date is not None and month_start <= row.association_date < next_month_start
        )
        completions = sum(
            1
            for row in context.qualifications
            if (completion_date := _effective_completion_date(row, month_end)) is not None
            and month_start <= completion_date < next_month_start
        )
        points.append(
            DashboardMonthlyActivityPoint(
                period_start=month_start,
                label=_month_label(month_start),
                associations=associations,
                completions=completions,
            )
        )
    return points


def _build_qualification_health_monthly(
    context: DashboardContext,
    *,
    today: date,
) -> list[DashboardMonthlyHealthPoint]:
    points: list[DashboardMonthlyHealthPoint] = []
    for month_start in _month_starts_including(today, 12):
        snapshot_day = min(_next_month_start(month_start) - timedelta(days=1), today)
        on_track = 0
        overdue = 0
        for row in context.qualifications:
            status = _status_as_of(row, snapshot_day)
            if status in {"Qualifie", "En cours"}:
                on_track += 1
            elif status == "Depassement":
                overdue += 1

        points.append(
            DashboardMonthlyHealthPoint(
                period_start=month_start,
                label=_month_label(month_start),
                on_track=on_track,
                overdue=overdue,
            )
        )
    return points


def _build_dashboard_charts(context: DashboardContext, *, today: date) -> DashboardChartsResponse:
    return DashboardChartsResponse(
        centre_cout_distribution=_build_centre_cout_distribution(context),
        qualification_status_distribution=_build_qualification_status_distribution(context, today=today),
        entries_exits_monthly=_build_entries_exits_monthly(context, today=today),
        trainer_availability_weekly=_build_trainer_availability_weekly(context, today=today),
        qualification_activity_monthly=_build_qualification_activity_monthly(context, today=today),
        qualification_health_monthly=_build_qualification_health_monthly(context, today=today),
    )


@router.get("/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    today = date.today()
    context = _load_dashboard_context(db)
    return _build_dashboard_metrics(context, today=today)


@router.get("/charts", response_model=DashboardChartsResponse)
def get_dashboard_charts(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    today = date.today()
    context = _load_dashboard_context(db)
    return _build_dashboard_charts(context, today=today)


@router.get("/overview", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    today = date.today()
    context = _load_dashboard_context(db)
    return DashboardOverviewResponse(
        metrics=_build_dashboard_metrics(context, today=today),
        charts=_build_dashboard_charts(context, today=today),
    )
