from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import insert, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.schemas.qualification import QualificationImportRequest, QualificationUpdateRequest
from app.services.collaborateur_import_service import detect_collaborateur_conflicts
from app.services.excel_synonyms import get_excel_synonyms
from app.services.qualification_import_service import (
    collaborateurs_table,
    detect_missing_qualification_requirements,
    formateur_formations_table,
    formateurs_table,
    formations_table,
    import_qualification_rows,
    merge_qualification_rows,
    qualification_table,
    recalculate_qualification_rows,
    resolve_qualification_status,
)
from app.utils.qualification_preview import SUPPORTED_UPLOAD_EXTENSIONS, parse_excel_to_rows
from app.utils.reporting_period import REPORTING_MONTHS, get_reporting_period_bounds


router = APIRouter(prefix="/qualification", tags=["qualification"])
SUPPLEMENTAL_QUALIFICATION_FIELDS = (
    "matricule",
    "nom",
    "prenom",
    "fonction",
    "centre_cout",
    "groupe",
    "motif",
    "contre_maitre",
    "segment",
    "num_tel",
    "date_recrutement",
    "anciennete",
)
SUPPLEMENTAL_CONFLICT_FIELDS = (
    "num_tel",
    "centre_cout",
    "groupe",
    "contre_maitre",
    "segment",
    "fonction",
    "date_recrutement",
    "anciennete",
)


def resolve_phase(date_association_systeme) -> str:
    if not date_association_systeme:
        return "qualification"
    days_since_association = (date.today() - date_association_systeme).days
    return "indection" if days_since_association <= 5 else "qualification"


def serialize_date(value) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _clean_optional_text(value) -> str | None:
    if value is None:
        return None
    text = " ".join(str(value).split()).strip()
    return text or None


def _parse_optional_iso_date(value, field_name: str) -> date | None:
    cleaned_value = _clean_optional_text(value)
    if cleaned_value is None:
        return None

    try:
        return date.fromisoformat(cleaned_value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must use YYYY-MM-DD format",
        ) from exc


def _normalize_editable_qualification_status(value) -> str | None:
    cleaned_value = _clean_optional_text(value)
    if cleaned_value is None:
        return None

    normalized = cleaned_value.lower().replace("-", "_").replace(" ", "_")
    if normalized in {"completee", "complete", "completed", "qualifie", "qualifiee"}:
        return "Completee"
    if normalized in {"en_cours", "encours", "in_progress", "ongoing"}:
        return "En cours"
    if normalized in {"non_associe", "non_associee", "not_associated"}:
        return None

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid qualification status",
    )


def _ensure_formateur_formation_link(db: Session, formateur_id: int | None, formation_id: int | None) -> None:
    if formateur_id is None or formation_id is None:
        return

    existing_link = db.execute(
        select(formateur_formations_table.c.formateur_id)
        .where(formateur_formations_table.c.formateur_id == formateur_id)
        .where(formateur_formations_table.c.formation_id == formation_id)
    ).first()
    if existing_link:
        return

    db.execute(
        insert(formateur_formations_table).values(
            formateur_id=formateur_id,
            formation_id=formation_id,
        )
    )


def _serialize_qualification_listing_item(item: dict) -> dict:
    qualification_status = resolve_qualification_status(
        item["qualification_statut"],
        item["date_association_systeme"],
        item["duree_jours"],
    )
    return {
        "id": item["qualification_row_id"] if item["qualification_row_id"] is not None else item["matricule"],
        "qualification_row_id": item["qualification_row_id"],
        "phase": resolve_phase(item["date_association_systeme"]),
        "matricule": item["matricule"],
        "nom": item["nom"],
        "prenom": item["prenom"],
        "fonction": item["fonction"],
        "centre_cout": item["centre_cout"],
        "groupe": item["groupe"],
        "competence": item["nom_formation"],
        "formateur": item["nom_formateur"],
        "formateur_id": item["formateur_id"],
        "motif": item["motif"],
        "contre_maitre": item["contre_maitre"],
        "segment": item["segment"],
        "gender": item["gender"],
        "num_tel": item["num_tel"],
        "date_recrutement": serialize_date(item["date_recrutement"]),
        "anciennete": item["anciennete"],
        "date_association_systeme": serialize_date(item["date_association_systeme"]),
        "statut": qualification_status,
        "qualification_statut": item["qualification_statut"],
        "etat": qualification_status,
        "formation_id": item["formation_id"],
        "formations": 1 if item["formation_id"] is not None else 0,
        "derniereFormation": serialize_date(item["date_association_systeme"]),
    }


def build_preview_rows_with_live_status(db: Session, rows: list[dict]) -> list[dict]:
    formation_ids = {
        int(row["formation_id"])
        for row in rows
        if row.get("formation_id") not in (None, "")
    }
    durations_by_formation_id: dict[int, int | None] = {}
    if formation_ids:
        formation_rows = db.execute(
            select(formations_table.c.id, formations_table.c.duree_jours).where(formations_table.c.id.in_(formation_ids))
        ).mappings().all()
        durations_by_formation_id = {
            item["id"]: item["duree_jours"]
            for item in formation_rows
        }

    enriched_rows = []
    for row in rows:
        if row.get("formation_id") in (None, ""):
            enriched_rows.append(
                {
                    **row,
                    "statut": "Non associee",
                    "etat": "Non associee",
                }
            )
            continue

        normalized_status = row.get("statut")
        if normalized_status not in {"Completee", "En cours"}:
            normalized_status = "En cours"

        association_date = None
        if row.get("date_association_systeme"):
            association_date = date.fromisoformat(str(row["date_association_systeme"]))

        qualification_status = resolve_qualification_status(
            normalized_status,
            association_date,
            durations_by_formation_id.get(int(row["formation_id"])) if row.get("formation_id") not in (None, "") else None,
        )

        enriched_rows.append(
            {
                **row,
                "statut": normalized_status,
                "etat": qualification_status,
            }
        )

    return enriched_rows


def _is_blank_preview_value(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def _normalize_preview_identity(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text.casefold() or None


def _qualification_identity_aliases(row: dict) -> list[tuple[str, ...]]:
    aliases: list[tuple[str, ...]] = []

    matricule = _normalize_preview_identity(row.get("matricule"))
    if matricule:
        return [("matricule", matricule)]

    nom = _normalize_preview_identity(row.get("nom"))
    prenom = _normalize_preview_identity(row.get("prenom"))
    if nom and prenom:
        aliases.append(("name", nom, prenom))

    return aliases


def _preview_date(value) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None


def _preview_value_token(value) -> str | None:
    if _is_blank_preview_value(value):
        return None
    if isinstance(value, str):
        return " ".join(value.split()).strip().casefold() or None
    return str(value)


def _qualification_exact_aliases(row: dict) -> list[tuple[str, ...]]:
    association_date = _preview_date(row.get("date_association_systeme"))
    if association_date is None:
        return []
    return [(*alias, association_date.isoformat()) for alias in _qualification_identity_aliases(row)]


def _build_unmatched_supplemental_row(row: dict, reason: str) -> dict:
    return {
        "row_index": row.get("__source_row_number") or 0,
        "source_file": row.get("__source_file"),
        "source_row_number": row.get("__source_row_number"),
        "reason": reason,
        "row": {
            key: value
            for key, value in row.items()
            if not str(key).startswith("__")
        },
    }


def _distinct_preview_values(rows: list[dict], field: str) -> list:
    distinct_values = []
    seen_tokens: set[str] = set()
    for row in rows:
        token = _preview_value_token(row.get(field))
        if token is None or token in seen_tokens:
            continue
        seen_tokens.add(token)
        distinct_values.append(row.get(field))
    return distinct_values


def _last_non_blank_preview_value(rows: list[dict], field: str):
    for row in reversed(rows):
        value = row.get(field)
        if _preview_value_token(value) is not None:
            return value
    return None


def _merge_supplemental_group(rows: list[dict]) -> tuple[dict | None, list[str]]:
    if not rows:
        return None, []

    merged = dict(rows[0])
    conflict_fields: list[str] = []
    for field in SUPPLEMENTAL_QUALIFICATION_FIELDS:
        distinct_values = _distinct_preview_values(rows, field)
        if not distinct_values:
            merged[field] = None
            continue

        if field == "motif":
            merged[field] = _last_non_blank_preview_value(rows, field)
            continue

        if field in SUPPLEMENTAL_CONFLICT_FIELDS and len(distinct_values) > 1:
            merged[field] = None
            conflict_fields.append(field)
            continue

        merged[field] = distinct_values[0]

    return merged, conflict_fields


def _apply_supplemental_to_qualification(row: dict, supplement: dict) -> dict:
    enriched_row = dict(row)
    for field in SUPPLEMENTAL_QUALIFICATION_FIELDS:
        if _is_blank_preview_value(enriched_row.get(field)) and not _is_blank_preview_value(supplement.get(field)):
            enriched_row[field] = supplement.get(field)
    return enriched_row


def _enrich_qualification_rows(
    qualification_rows: list[dict],
    supplemental_rows: list[dict],
) -> tuple[list[dict], list[dict]]:
    if not qualification_rows or not supplemental_rows:
        return qualification_rows, []

    qualification_indexes_by_alias: dict[tuple[str, ...], list[int]] = {}
    for index, row in enumerate(qualification_rows):
        for alias in _qualification_exact_aliases(row):
            qualification_indexes_by_alias.setdefault(alias, []).append(index)

    matched_supplemental_rows: dict[int, list[dict]] = {}
    unmatched_rows: list[dict] = []

    for row in supplemental_rows:
        aliases = _qualification_exact_aliases(row)
        if not aliases:
            reason = (
                "No exact employee/date key was detected for this line. Add the missing qualification data manually or skip it."
            )
            unmatched_rows.append(_build_unmatched_supplemental_row(row, reason))
            continue

        matched_indexes = sorted(
            {
                matched_index
                for alias in aliases
                for matched_index in qualification_indexes_by_alias.get(alias, [])
            }
        )
        if not matched_indexes:
            reason = (
                "No qualification row matched this employee and association date. Complete the missing qualification fields manually or skip it."
            )
            unmatched_rows.append(_build_unmatched_supplemental_row(row, reason))
            continue

        for matched_index in matched_indexes:
            matched_supplemental_rows.setdefault(matched_index, []).append(row)

    enriched_rows: list[dict] = []
    for index, row in enumerate(qualification_rows):
        grouped_rows = matched_supplemental_rows.get(index, [])
        if not grouped_rows:
            enriched_rows.append(row)
            continue

        merged_supplement, conflict_fields = _merge_supplemental_group(grouped_rows)
        enriched_row = _apply_supplemental_to_qualification(row, merged_supplement) if merged_supplement else row

        if conflict_fields:
            reason = (
                "Multiple uploaded lines matched this qualification row with conflicting values for: "
                + ", ".join(conflict_fields)
                + ". Review them manually or skip them."
            )
            unmatched_rows.extend(_build_unmatched_supplemental_row(item, reason) for item in grouped_rows)
            enriched_rows.append(enriched_row)
            continue

        enriched_rows.append(enriched_row)

    return enriched_rows, unmatched_rows


def _fetch_qualification_listing_rows(db: Session):
    qualification_stmt = (
        select(
            qualification_table.c.id.label("qualification_row_id"),
            collaborateurs_table.c.matricule,
            collaborateurs_table.c.nom,
            collaborateurs_table.c.prenom,
            collaborateurs_table.c.fonction,
            collaborateurs_table.c.centre_cout,
            collaborateurs_table.c.groupe,
            collaborateurs_table.c.contre_maitre,
            collaborateurs_table.c.segment,
            collaborateurs_table.c.gender,
            collaborateurs_table.c.num_tel,
            collaborateurs_table.c.date_recrutement,
            collaborateurs_table.c.anciennete,
            qualification_table.c.formation_id,
            qualification_table.c.statut.label("qualification_statut"),
            qualification_table.c.date_association_systeme,
            qualification_table.c.formateur_id,
            qualification_table.c.motif,
            formations_table.c.nom_formation,
            formations_table.c.duree_jours,
            formateurs_table.c.nom_formateur,
        )
        .select_from(
            qualification_table
            .join(collaborateurs_table, collaborateurs_table.c.matricule == qualification_table.c.matricule)
            .outerjoin(formations_table, formations_table.c.id == qualification_table.c.formation_id)
            .outerjoin(formateurs_table, formateurs_table.c.id == qualification_table.c.formateur_id)
        )
    )
    qualification_rows = db.execute(qualification_stmt).mappings().all()

    collaborator_only_stmt = (
        select(
            collaborateurs_table.c.matricule,
            collaborateurs_table.c.nom,
            collaborateurs_table.c.prenom,
            collaborateurs_table.c.fonction,
            collaborateurs_table.c.centre_cout,
            collaborateurs_table.c.groupe,
            collaborateurs_table.c.contre_maitre,
            collaborateurs_table.c.segment,
            collaborateurs_table.c.gender,
            collaborateurs_table.c.num_tel,
            collaborateurs_table.c.date_recrutement,
            collaborateurs_table.c.anciennete,
        )
        .select_from(
            collaborateurs_table.outerjoin(
                qualification_table,
                qualification_table.c.matricule == collaborateurs_table.c.matricule,
            )
        )
        .where(qualification_table.c.id.is_(None))
    )
    collaborator_only_rows = db.execute(collaborator_only_stmt).mappings().all()

    combined_rows = [dict(row) for row in qualification_rows]
    combined_rows.extend(
        [
            {
                "qualification_row_id": None,
                "matricule": row["matricule"],
                "nom": row["nom"],
                "prenom": row["prenom"],
                "fonction": row["fonction"],
                "centre_cout": row["centre_cout"],
                "groupe": row["groupe"],
                "contre_maitre": row["contre_maitre"],
                "segment": row["segment"],
                "gender": row["gender"],
                "num_tel": row["num_tel"],
                "date_recrutement": row["date_recrutement"],
                "anciennete": row["anciennete"],
                "formation_id": None,
                "qualification_statut": None,
                "date_association_systeme": None,
                "formateur_id": None,
                "motif": None,
                "nom_formation": None,
                "duree_jours": None,
                "nom_formateur": None,
            }
            for row in collaborator_only_rows
        ]
    )

    def _sort_key(item: dict) -> tuple[bool, int, int, str]:
        association_date = item.get("date_association_systeme")
        qualification_row_id = item.get("qualification_row_id")
        return (
            association_date is None,
            -(association_date.toordinal()) if association_date is not None else 0,
            -(qualification_row_id or 0),
            item.get("matricule") or "",
        )

    combined_rows.sort(key=_sort_key)
    return combined_rows


def _fetch_qualification_listing_row_by_id(db: Session, qualification_id: int) -> dict | None:
    rows = _fetch_qualification_listing_rows(db)
    return next(
        (item for item in rows if item.get("qualification_row_id") == qualification_id),
        None,
    )


@router.get("")
def list_qualification_rows(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    raw_rows = _fetch_qualification_listing_rows(db)
    return [_serialize_qualification_listing_item(item) for item in raw_rows]


@router.patch("/{qualification_id}")
def update_qualification_row(
    qualification_id: int,
    payload: QualificationUpdateRequest,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    existing_row = db.execute(
        select(qualification_table).where(qualification_table.c.id == qualification_id)
    ).mappings().first()
    if not existing_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Qualification not found")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        listing_row = _fetch_qualification_listing_row_by_id(db, qualification_id)
        if listing_row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Qualification not found")
        return _serialize_qualification_listing_item(listing_row)

    next_formation_id = existing_row.get("formation_id")
    next_formateur_id = existing_row.get("formateur_id")
    update_values = {}

    if "formation_id" in changes:
        next_formation_id = changes.get("formation_id")
        if next_formation_id is not None:
            formation_exists = db.execute(
                select(formations_table.c.id).where(formations_table.c.id == next_formation_id)
            ).first()
            if not formation_exists:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation not found")

            duplicate_row = db.execute(
                select(qualification_table.c.id)
                .where(qualification_table.c.matricule == existing_row["matricule"])
                .where(qualification_table.c.formation_id == next_formation_id)
                .where(qualification_table.c.id != qualification_id)
            ).first()
            if duplicate_row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A qualification already exists for this collaborator and formation",
                )

        update_values["formation_id"] = next_formation_id

    if "formateur_id" in changes:
        next_formateur_id = changes.get("formateur_id")
        if next_formateur_id is not None:
            formateur_exists = db.execute(
                select(formateurs_table.c.id).where(formateurs_table.c.id == next_formateur_id)
            ).first()
            if not formateur_exists:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formateur not found")
        update_values["formateur_id"] = next_formateur_id

    if next_formateur_id is not None and next_formation_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select a formation before assigning a formateur",
        )

    if "statut" in changes:
        update_values["statut"] = _normalize_editable_qualification_status(changes.get("statut"))

    if "date_association_systeme" in changes:
        update_values["date_association_systeme"] = _parse_optional_iso_date(
            changes.get("date_association_systeme"),
            "date_association_systeme",
        )

    if "motif" in changes:
        update_values["motif"] = _clean_optional_text(changes.get("motif"))

    if not update_values:
        listing_row = _fetch_qualification_listing_row_by_id(db, qualification_id)
        if listing_row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Qualification not found")
        return _serialize_qualification_listing_item(listing_row)

    if next_formateur_id is not None and next_formation_id is not None:
        _ensure_formateur_formation_link(db, next_formateur_id, next_formation_id)

    db.execute(
        update(qualification_table)
        .where(qualification_table.c.id == qualification_id)
        .values(**update_values)
    )
    db.commit()

    listing_row = _fetch_qualification_listing_row_by_id(db, qualification_id)
    if listing_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Qualification not found")
    return _serialize_qualification_listing_item(listing_row)


@router.get("/collaborateurs")
def list_collaborateur_summaries(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    raw_rows = _fetch_qualification_listing_rows(db)
    collaborators_by_matricule: dict[str, dict] = {}

    for item in raw_rows:
        matricule = item["matricule"]
        current = collaborators_by_matricule.get(matricule)
        latest_activity_date = item["date_association_systeme"]
        qualification_status = resolve_qualification_status(
            item["qualification_statut"],
            item["date_association_systeme"],
            item["duree_jours"],
        )

        if current is None:
            current = {
                "id": matricule,
                "phase": "qualification",
                "matricule": matricule,
                "nom": item["nom"],
                "prenom": item["prenom"],
                "fonction": item["fonction"],
                "centre_cout": item["centre_cout"],
                "groupe": item["groupe"],
                "competence": item["nom_formation"],
                "formateur": item["nom_formateur"],
                "motif": item["motif"],
                "contre_maitre": item["contre_maitre"],
                "segment": item["segment"],
                "gender": item["gender"],
                "num_tel": item["num_tel"],
                "date_recrutement": serialize_date(item["date_recrutement"]),
                "anciennete": item["anciennete"],
                "date_association_systeme": serialize_date(item["date_association_systeme"]),
                "statut": qualification_status,
                "etat": qualification_status,
                "formation_id": item["formation_id"],
                "formations": 0,
                "derniereFormation": serialize_date(latest_activity_date),
            }
            collaborators_by_matricule[matricule] = current

        if item["formation_id"] is not None:
            current["formations"] += 1

    return list(collaborators_by_matricule.values())


@router.post("/recalculate")
def recalculate_collaborateur_qualification_statuses(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    return recalculate_qualification_rows(db)


@router.get("/{matricule}/presence-history")
def get_collaborateur_presence_history(
    matricule: str,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    today = date.today()
    period_start, period_end = get_reporting_period_bounds(today)
    stmt = (
        select(
            qualification_table.c.id,
            qualification_table.c.formation_id,
            qualification_table.c.statut,
            qualification_table.c.date_association_systeme,
            qualification_table.c.formateur_id,
            qualification_table.c.motif,
            formations_table.c.code_formation,
            formations_table.c.nom_formation,
            formations_table.c.domaine,
            formations_table.c.duree_jours,
            formateurs_table.c.nom_formateur,
        )
        .select_from(
            qualification_table
            .outerjoin(
                formations_table,
                formations_table.c.id == qualification_table.c.formation_id,
            )
            .outerjoin(
                formateurs_table,
                formateurs_table.c.id == qualification_table.c.formateur_id,
            )
        )
        .where(qualification_table.c.matricule == matricule)
        .where(qualification_table.c.date_association_systeme.is_not(None))
        .where(qualification_table.c.date_association_systeme >= period_start)
        .where(qualification_table.c.date_association_systeme <= period_end)
        .order_by(qualification_table.c.date_association_systeme.desc(), qualification_table.c.id.desc())
    )

    rows = db.execute(stmt).mappings().all()
    history: list[dict] = []
    on_track_count = 0
    overdue_count = 0

    for item in rows:
        qualification_status = resolve_qualification_status(
            item["statut"],
            item["date_association_systeme"],
            item["duree_jours"],
        )
        if qualification_status in {"Qualifie", "En cours"}:
            on_track_count += 1
        elif qualification_status == "Depassement":
            overdue_count += 1

        history.append(
            {
                "id": item["id"],
                "formation_id": item["formation_id"],
                "code": item["code_formation"]
                or (str(item["formation_id"]) if item["formation_id"] is not None else None),
                "titre": item["nom_formation"]
                or (f"Formation {item['formation_id']}" if item["formation_id"] is not None else "Non associee"),
                "type": item["domaine"] or ("Formation" if item["formation_id"] is not None else "Qualification"),
                "date": item["date_association_systeme"].isoformat() if item["date_association_systeme"] else None,
                "duree": item["duree_jours"],
                "statut": item["statut"],
                "etat": qualification_status,
                "formateur_id": item["formateur_id"],
                "formateur": item["nom_formateur"],
                "motif": item["motif"],
            }
        )

    tracked_rows = len(history)
    presence_rate = round((on_track_count / tracked_rows) * 100, 1) if tracked_rows else 0.0

    return {
        "matricule": matricule,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "reporting_months": REPORTING_MONTHS,
        "summary": {
            "tracked_rows": tracked_rows,
            "on_track_count": on_track_count,
            "overdue_count": overdue_count,
            "presence_rate": presence_rate,
            "latest_status": history[0]["etat"] if history else None,
        },
        "history": history,
    }


@router.get("/{matricule}/formations")
def list_collaborateur_formations(
    matricule: str,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    stmt = (
        select(
            qualification_table.c.id,
            qualification_table.c.formation_id,
            qualification_table.c.statut,
            qualification_table.c.date_association_systeme,
            qualification_table.c.formateur_id,
            qualification_table.c.motif,
            formations_table.c.code_formation,
            formations_table.c.nom_formation,
            formations_table.c.domaine,
            formations_table.c.duree_jours,
            formateurs_table.c.nom_formateur,
        )
        .select_from(
            qualification_table
            .outerjoin(
                formations_table,
                formations_table.c.id == qualification_table.c.formation_id,
            )
            .outerjoin(
                formateurs_table,
                formateurs_table.c.id == qualification_table.c.formateur_id,
            )
        )
        .where(qualification_table.c.matricule == matricule)
        .order_by(qualification_table.c.date_association_systeme.desc(), qualification_table.c.id.desc())
    )

    rows = db.execute(stmt).mappings().all()
    return [
        {
            "id": item["id"],
            "formation_id": item["formation_id"],
            "code": item["code_formation"] or (str(item["formation_id"]) if item["formation_id"] is not None else None),
            "titre": item["nom_formation"] or (
                f"Formation {item['formation_id']}" if item["formation_id"] is not None else "Non associee"
            ),
            "type": item["domaine"] or ("Formation" if item["formation_id"] is not None else "Qualification"),
            "date": item["date_association_systeme"].isoformat() if item["date_association_systeme"] else None,
            "duree": item["duree_jours"],
            "resultat": resolve_qualification_status(
                item["statut"],
                item["date_association_systeme"],
                item["duree_jours"],
            ),
            "statut": item["statut"],
            "score": None,
            "formateur_id": item["formateur_id"],
            "formateur": item["nom_formateur"],
            "motif": item["motif"],
        }
        for item in rows
    ]

@router.post("/preview")
async def preview_qualification_file(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded")

    merged_rows = []
    supplemental_rows: list[dict] = []
    merged_columns: list[str] = []
    merged_mapping: dict[str, str] = {}
    file_errors: list[dict[str, str]] = []
    supplemental_only_messages: list[dict[str, str]] = []
    synonyms = get_excel_synonyms()

    for upload in files:
        filename = (upload.filename or "").lower()
        if not any(filename.endswith(extension) for extension in SUPPORTED_UPLOAD_EXTENSIONS):
            file_errors.append(
                {"file": upload.filename or "", "error": "Only .xlsx, .xls, and .csv files are accepted"}
            )
            continue

        content = await upload.read()
        if not content:
            file_errors.append({"file": upload.filename or "", "error": "Uploaded file is empty"})
            continue

        try:
            columns_detected, mapping_used, rows = parse_excel_to_rows(
                content,
                filename,
                synonyms=synonyms,
                require_formation=False,
            )
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Spreadsheet support dependencies are missing (openpyxl/xlrd)",
            ) from exc
        except Exception as exc:
            file_errors.append({"file": upload.filename or "", "error": f"Invalid upload file: {exc}"})
            continue

        rows = [
            {
                **row,
                "__source_file": upload.filename or "",
            }
            for row in rows
        ]

        has_matricule = "matricule" in mapping_used
        has_name_info = "nom" in mapping_used or "prenom" in mapping_used or "nomprenom" in mapping_used
        if not (has_matricule or has_name_info):
            file_errors.append(
                {
                    "file": upload.filename or "",
                    "error": "Missing required columns: need matricule or a name column",
                }
            )
            continue

        for column in columns_detected:
            if column not in merged_columns:
                merged_columns.append(column)
        for field, header in mapping_used.items():
            if field not in merged_mapping:
                merged_mapping[field] = header

        if "competence" not in mapping_used:
            if rows:
                supplemental_rows.extend(rows)
                supplemental_only_messages.append(
                    {
                        "file": upload.filename or "",
                        "error": "This file contains collaborator data but no qualification column. Use the Collaborateurs Excel import instead.",
                    }
                )
                continue

            file_errors.append(
                {
                    "file": upload.filename or "",
                    "error": "This file contains collaborator data but no qualification column. Use the Collaborateurs Excel import instead.",
                }
            )
            continue

        merged_rows.extend(rows)

    if supplemental_only_messages and not merged_rows:
        file_errors.extend(supplemental_only_messages)

    if file_errors and not merged_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "No valid files to preview", "file_errors": file_errors},
        )

    merged_rows = merge_qualification_rows(merged_rows)
    merged_rows, unmatched_rows = _enrich_qualification_rows(merged_rows, supplemental_rows)
    conflicts = detect_collaborateur_conflicts(db, merged_rows)
    missing_requirements = detect_missing_qualification_requirements(db, merged_rows)

    return {
        "columns_detected": merged_columns,
        "mapping_used": merged_mapping,
        "rows": build_preview_rows_with_live_status(db, merged_rows),
        "rows_count": len(merged_rows),
        "file_errors": file_errors,
        "conflicts": [conflict.model_dump() for conflict in conflicts],
        "missing_requirements": [item.model_dump() for item in missing_requirements],
        "unmatched_rows": unmatched_rows,
    }


@router.post("/import")
def import_qualification_preview_rows(
    payload: QualificationImportRequest,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    if not payload.rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No qualification rows provided for import",
        )

    prepared_rows = [row.model_dump() for row in payload.rows]
    missing_requirements = detect_missing_qualification_requirements(db, prepared_rows)
    if missing_requirements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Some qualification rows are still missing required data",
                "missing_requirements": [item.model_dump() for item in missing_requirements],
            },
        )

    summary = import_qualification_rows(db, prepared_rows)
    return {"import_summary": summary}
