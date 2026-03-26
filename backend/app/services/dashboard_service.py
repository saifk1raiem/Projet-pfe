from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.services.qualification_import_service import (
    collaborateurs_table,
    formateurs_table,
    qualification_table,
)


EXIT_REASON = "mise en demeure"

def parse_dashboard_date(value: str | None) -> date | None:
    if value in (None, ""):
        return None
    return date.fromisoformat(value)


def _normalize_text(value: Any) -> str:
    return str(value or "").strip().lower()


def _serialize_date(value: date | None) -> str | None:
    return value.isoformat() if isinstance(value, date) else None


def _clean_string(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


def _motif_values(value: Any) -> list[str]:
    if isinstance(value, (list, tuple, set)):
        return [item.strip() for item in map(str, value) if item and str(item).strip()]
    cleaned_value = _clean_string(value)
    return [cleaned_value] if cleaned_value else []


def _is_exit_reason(motif: Any) -> bool:
    return any(_normalize_text(item) == EXIT_REASON for item in _motif_values(motif))


def _matches_filters(
    *,
    values: list[Any],
    search: str,
    groupe: str | None,
    segment: str | None,
    row_group: Any,
    row_segment: Any,
) -> bool:
    normalized_search = _normalize_text(search)
    if groupe and _clean_string(row_group) != groupe:
        return False
    if segment and _clean_string(row_segment) != segment:
        return False
    if not normalized_search:
        return True
    return any(normalized_search in _normalize_text(value) for value in values if value not in (None, ""))


def _distinct_non_empty(values: list[Any]) -> list[str]:
    return sorted({cleaned for value in values if (cleaned := _clean_string(value))}, key=str.lower)


def _build_entries(
    db: Session,
    *,
    selected_date: date | None,
    search: str,
    groupe: str | None,
    segment: str | None,
) -> list[dict[str, Any]]:
    if not selected_date:
        return []

    rows = db.execute(
        select(
            qualification_table.c.id,
            collaborateurs_table.c.matricule,
            collaborateurs_table.c.nom,
            collaborateurs_table.c.prenom,
            collaborateurs_table.c.groupe,
            collaborateurs_table.c.segment,
            collaborateurs_table.c.fonction,
            collaborateurs_table.c.centre_cout,
            qualification_table.c.date_association_systeme,
        )
        .select_from(
            qualification_table.join(
                collaborateurs_table,
                collaborateurs_table.c.matricule == qualification_table.c.matricule,
            )
        )
        .where(qualification_table.c.date_association_systeme == selected_date)
        .order_by(
            qualification_table.c.date_association_systeme.desc(),
            qualification_table.c.id.desc(),
            collaborateurs_table.c.nom.asc(),
            collaborateurs_table.c.prenom.asc(),
            collaborateurs_table.c.matricule.asc(),
        )
    ).mappings().all()

    seen_matricules: set[str] = set()
    entries: list[dict[str, Any]] = []
    for row in rows:
        if row["matricule"] in seen_matricules:
            continue

        if not _matches_filters(
            values=[
                row["matricule"],
                row["nom"],
                row["prenom"],
                row["groupe"],
                row["segment"],
                row["fonction"],
                row["centre_cout"],
            ],
            search=search,
            groupe=groupe,
            segment=segment,
            row_group=row["groupe"],
            row_segment=row["segment"],
        ):
            continue

        seen_matricules.add(row["matricule"])
        entries.append(
            {
                "matricule": row["matricule"],
                "nom": row["nom"],
                "prenom": row["prenom"],
                "groupe": row["groupe"],
                "segment": row["segment"],
                "fonction": row["fonction"],
                "centre_cout": row["centre_cout"],
                "movement_date": _serialize_date(row["date_association_systeme"]),
            }
        )

    return entries


def _build_exits(
    db: Session,
    *,
    selected_date: date | None,
    search: str,
    groupe: str | None,
    segment: str | None,
) -> list[dict[str, Any]]:
    if not selected_date:
        return []

    rows = db.execute(
        select(
            qualification_table.c.id,
            qualification_table.c.matricule,
            qualification_table.c.date_association_systeme,
            qualification_table.c.date_completion,
            qualification_table.c.motif,
            collaborateurs_table.c.nom,
            collaborateurs_table.c.prenom,
            collaborateurs_table.c.groupe,
            collaborateurs_table.c.segment,
            collaborateurs_table.c.fonction,
            collaborateurs_table.c.centre_cout,
        )
        .select_from(
            qualification_table.join(
                collaborateurs_table,
                collaborateurs_table.c.matricule == qualification_table.c.matricule,
            )
        )
        .where(qualification_table.c.motif.is_not(None))
        .where(
            or_(
                qualification_table.c.date_completion == selected_date,
                and_(
                    qualification_table.c.date_completion.is_(None),
                    qualification_table.c.date_association_systeme == selected_date,
                ),
            )
        )
        .order_by(
            qualification_table.c.date_completion.desc(),
            qualification_table.c.date_association_systeme.desc(),
            qualification_table.c.id.desc(),
        )
    ).mappings().all()

    seen_matricules: set[str] = set()
    exits: list[dict[str, Any]] = []
    for row in rows:
        if row["matricule"] in seen_matricules or not _is_exit_reason(row["motif"]):
            continue

        motifs = _motif_values(row["motif"])
        if not _matches_filters(
            values=[
                row["matricule"],
                row["nom"],
                row["prenom"],
                row["groupe"],
                row["segment"],
                row["fonction"],
                row["centre_cout"],
                *motifs,
            ],
            search=search,
            groupe=groupe,
            segment=segment,
            row_group=row["groupe"],
            row_segment=row["segment"],
        ):
            continue

        seen_matricules.add(row["matricule"])
        movement_date = row["date_completion"] or row["date_association_systeme"]
        exits.append(
            {
                "matricule": row["matricule"],
                "nom": row["nom"],
                "prenom": row["prenom"],
                "groupe": row["groupe"],
                "segment": row["segment"],
                "fonction": row["fonction"],
                "centre_cout": row["centre_cout"],
                "movement_date": _serialize_date(movement_date),
                "motifs": motifs,
            }
        )

    return exits


def _count_total_exits(db: Session) -> int:
    rows = db.execute(
        select(qualification_table.c.matricule, qualification_table.c.motif)
        .where(qualification_table.c.motif.is_not(None))
        .order_by(qualification_table.c.id.desc())
    ).mappings().all()

    exit_matricules = {
        row["matricule"]
        for row in rows
        if row["matricule"] and _is_exit_reason(row["motif"])
    }
    return len(exit_matricules)


def get_dashboard_snapshot(
    db: Session,
    *,
    target_date: date | None,
    search: str = "",
    groupe: str | None = None,
    segment: str | None = None,
) -> dict[str, Any]:
    collaborator_filter_values = db.execute(
        select(collaborateurs_table.c.groupe, collaborateurs_table.c.segment)
    ).mappings().all()
    available_groups = _distinct_non_empty([row["groupe"] for row in collaborator_filter_values])
    available_segments = _distinct_non_empty([row["segment"] for row in collaborator_filter_values])

    total_collaborators = db.execute(select(func.count()).select_from(collaborateurs_table)).scalar_one()
    latest_recruitment_date = db.execute(select(func.max(collaborateurs_table.c.date_recrutement))).scalar()
    latest_recruitment_count = 0
    if latest_recruitment_date:
        latest_recruitment_count = db.execute(
            select(func.count())
            .select_from(collaborateurs_table)
            .where(collaborateurs_table.c.date_recrutement == latest_recruitment_date)
        ).scalar_one()

    latest_association_date = db.execute(select(func.max(qualification_table.c.date_association_systeme))).scalar()
    latest_association_count = 0
    if latest_association_date:
        latest_association_count = db.execute(
            select(func.count(func.distinct(qualification_table.c.matricule)))
            .select_from(qualification_table)
            .where(qualification_table.c.date_association_systeme == latest_association_date)
        ).scalar_one()

    available_trainers = db.execute(select(func.count()).select_from(formateurs_table)).scalar_one()
    selected_date = target_date or latest_association_date or latest_recruitment_date
    entries = _build_entries(
        db,
        selected_date=selected_date,
        search=search,
        groupe=groupe,
        segment=segment,
    )
    exits = _build_exits(
        db,
        selected_date=selected_date,
        search=search,
        groupe=groupe,
        segment=segment,
    )

    return {
        "overview": {
            "total_collaborators": total_collaborators,
            "latest_recruitment_date": _serialize_date(latest_recruitment_date),
            "latest_recruitment_count": latest_recruitment_count,
            "latest_association_date": _serialize_date(latest_association_date),
            "latest_association_count": latest_association_count,
            "total_exits": _count_total_exits(db),
            "available_trainers": available_trainers,
        },
        "filters": {
            "available_groups": available_groups,
            "available_segments": available_segments,
        },
        "movements": {
            "selected_date": _serialize_date(selected_date),
            "entries_count": len(entries),
            "exits_count": len(exits),
            "entries": entries,
            "exits": exits,
        },
    }
