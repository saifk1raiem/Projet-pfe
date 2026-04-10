from __future__ import annotations

from collections.abc import Iterable
from datetime import date, timedelta
from typing import Any

from sqlalchemy import Column, Date, Integer, MetaData, String, Table, Text, func, insert, select, update
from sqlalchemy.orm import Session

from app.schemas.qualification import QualificationMissingField, QualificationMissingRequirement


metadata = MetaData()

collaborateurs_table = Table(
    "collaborateurs",
    metadata,
    Column("matricule", String(20), primary_key=True),
    Column("nom", String(150), nullable=False),
    Column("prenom", String(150), nullable=False),
    Column("fonction", String(100)),
    Column("centre_cout", String(50)),
    Column("groupe", String(50)),
    Column("contre_maitre", String(100)),
    Column("segment", String(50)),
    Column("gender", String(10)),
    Column("num_tel", String(20)),
    Column("date_recrutement", Date),
    Column("anciennete", Integer),
)

formations_table = Table(
    "formations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("code_formation", String(50), nullable=False),
    Column("nom_formation", String(150), nullable=False),
    Column("duree_jours", Integer),
    Column("domaine", String(100)),
)

formateurs_table = Table(
    "formateurs",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("nom_formateur", String(150), nullable=False),
    Column("telephone", String(20)),
    Column("email", String(150)),
    Column("specialite", String(100)),
)

formateur_formations_table = Table(
    "formateur_formations",
    metadata,
    Column("formateur_id", Integer, primary_key=True),
    Column("formation_id", Integer, primary_key=True),
)

qualification_table = Table(
    "qualification",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("matricule", String(20), nullable=False),
    Column("formation_id", Integer, nullable=True),
    Column("statut", String(20), nullable=True),
    Column("date_association_systeme", Date),
    Column("formateur_id", Integer),
    Column("motif", Text),
)

_MISSING_FIELD_LABELS = {
    "matricule": "Matricule",
    "nom": "Nom",
    "prenom": "Prenom",
    "formation_id": "ID formation",
}


def _as_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _clean_text(value: Any) -> str | None:
    if value in (None, ""):
        return None
    text = " ".join(str(value).split()).strip()
    return text or None


def _build_collaborateur_values(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "matricule": row.get("matricule"),
        "nom": row.get("nom"),
        "prenom": row.get("prenom"),
        "fonction": row.get("fonction"),
        "centre_cout": row.get("centre_cout"),
        "groupe": row.get("groupe"),
        "contre_maitre": row.get("contre_maitre"),
        "segment": row.get("segment"),
        "num_tel": row.get("num_tel"),
        "date_recrutement": _as_date(row.get("date_recrutement")),
        "anciennete": row.get("anciennete"),
    }


def _build_qualification_values(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "matricule": row.get("matricule"),
        "formation_id": row.get("formation_id"),
        "statut": row.get("statut"),
        "date_association_systeme": _as_date(row.get("date_association_systeme")),
        "formateur_id": row.get("formateur_id"),
        "motif": row.get("motif"),
    }


def compute_etat_qualification(
    statut: str | None,
    date_association_systeme: date | None,
    duree_jours: int | None,
    *,
    today: date | None = None,
) -> str:
    current_day = today or date.today()

    if statut == "Completee":
        return "Qualifie"

    if statut == "En cours":
        if date_association_systeme and duree_jours is not None:
            deadline = date_association_systeme + timedelta(days=int(duree_jours))
            if current_day > deadline:
                return "Depassement"
        return "En cours"

    return "Non associee"


def resolve_qualification_status(
    statut: str | None,
    date_association_systeme: date | None,
    duree_jours: int | None,
    *,
    today: date | None = None,
) -> str:
    return compute_etat_qualification(
        statut,
        date_association_systeme,
        duree_jours,
        today=today,
    )


def _normalize_import_statut(statut: Any, etat: Any = None) -> str | None:
    if isinstance(statut, str):
        normalized = statut.strip().lower().replace("-", "_").replace(" ", "_")
    else:
        normalized = ""

    if normalized in {"completee", "complete", "completed", "terminee", "termine", "qualifie", "qualifiee"}:
        return "Completee"
    if normalized in {"en_cours", "encours", "in_progress", "ongoing", "depassement", "overdue"}:
        return "En cours"
    if normalized in {"non_associe", "non_associee", "not_associated"}:
        return None

    if isinstance(etat, str):
        normalized_etat = etat.strip().lower().replace("-", "_").replace(" ", "_")
        if normalized_etat in {"qualifie", "qualifiee"}:
            return "Completee"
        if normalized_etat in {"en_cours", "encours", "depassement", "overdue"}:
            return "En cours"
        if normalized_etat in {"non_associe", "non_associee", "not_associated"}:
            return None

    return "En cours"


def _changed_fields(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    changed: dict[str, Any] = {}
    for key, value in incoming.items():
        if value is None:
            continue
        if existing.get(key) != value:
            changed[key] = value
    return changed


def _ensure_formation(db: Session, formation_id: int, formation_label: str | None) -> None:
    existing = db.execute(
        select(formations_table).where(formations_table.c.id == formation_id)
    ).mappings().first()
    label = (formation_label or f"Formation {formation_id}").strip()

    if not existing:
        db.execute(
            insert(formations_table).values(
                id=formation_id,
                code_formation=str(formation_id),
                nom_formation=label[:150],
            )
        )
        return

    updates: dict[str, Any] = {}
    if label and existing.get("nom_formation") != label[:150]:
        updates["nom_formation"] = label[:150]
    if not existing.get("code_formation"):
        updates["code_formation"] = str(formation_id)

    if updates:
        db.execute(update(formations_table).where(formations_table.c.id == formation_id).values(**updates))


def _get_formation(db: Session, formation_id: int) -> dict[str, Any] | None:
    return db.execute(
        select(formations_table).where(formations_table.c.id == formation_id)
    ).mappings().first()


def _ensure_formateur(db: Session, nom_formateur: str | None) -> tuple[int | None, bool]:
    if not nom_formateur:
        return None, False

    clean_name = nom_formateur.strip()
    if not clean_name:
        return None, False

    existing = db.execute(
        select(formateurs_table).where(func.lower(formateurs_table.c.nom_formateur) == clean_name.lower())
    ).mappings().first()
    if existing:
        return existing["id"], False

    inserted = db.execute(
        insert(formateurs_table)
        .values(nom_formateur=clean_name[:150])
        .returning(formateurs_table.c.id)
    ).scalar_one()
    return inserted, True


def _ensure_formateur_formation_link(db: Session, formateur_id: int | None, formation_id: int | None) -> None:
    if formateur_id is None or formation_id is None:
        return

    existing = db.execute(
        select(formateur_formations_table.c.formateur_id)
        .where(formateur_formations_table.c.formateur_id == formateur_id)
        .where(formateur_formations_table.c.formation_id == formation_id)
    ).first()
    if existing:
        return

    db.execute(
        insert(formateur_formations_table).values(
            formateur_id=formateur_id,
            formation_id=formation_id,
        )
    )


def _is_blank_merge_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def _normalize_merge_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text.casefold() or None


def _normalize_formation_id(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def detect_missing_qualification_requirements(
    db: Session,
    rows: list[dict[str, Any]],
) -> list[QualificationMissingRequirement]:
    if not rows:
        return []

    existing_matricules = set()
    candidate_matricules = sorted(
        {
            matricule
            for row in rows
            if (matricule := _clean_text(row.get("matricule")))
        }
    )
    if candidate_matricules:
        existing_matricules = {
            item
            for item in db.scalars(
                select(collaborateurs_table.c.matricule).where(collaborateurs_table.c.matricule.in_(candidate_matricules))
            ).all()
            if item
        }

    missing_requirements: list[QualificationMissingRequirement] = []
    for row_index, row in enumerate(rows):
        missing_fields: list[QualificationMissingField] = []

        matricule = _clean_text(row.get("matricule"))
        if not matricule:
            missing_fields.append(
                QualificationMissingField(field="matricule", label=_MISSING_FIELD_LABELS["matricule"])
            )

        if not matricule or matricule not in existing_matricules:
            if not _clean_text(row.get("nom")):
                missing_fields.append(
                    QualificationMissingField(field="nom", label=_MISSING_FIELD_LABELS["nom"])
                )
            if not _clean_text(row.get("prenom")):
                missing_fields.append(
                    QualificationMissingField(field="prenom", label=_MISSING_FIELD_LABELS["prenom"])
                )

        if not missing_fields:
            continue

        missing_requirements.append(
            QualificationMissingRequirement(
                row_index=row_index,
                matricule=matricule,
                nom=_clean_text(row.get("nom")),
                prenom=_clean_text(row.get("prenom")),
                formation_id=formation_id,
                formation_label=_clean_text(row.get("formation_label") or row.get("competence")),
                fields=missing_fields,
            )
        )

    return missing_requirements


def _qualification_row_aliases(row: dict[str, Any]) -> list[tuple[Any, ...]]:
    aliases: list[tuple[Any, ...]] = []
    formation_id = _normalize_formation_id(row.get("formation_id"))
    if formation_id is None:
        return aliases

    matricule = _normalize_merge_text(row.get("matricule"))
    if matricule:
        aliases.append(("matricule", matricule, formation_id))

    nom = _normalize_merge_text(row.get("nom"))
    prenom = _normalize_merge_text(row.get("prenom"))
    if nom and prenom:
        aliases.append(("name", nom, prenom, formation_id))

    return aliases


def _merge_statut(existing_value: Any, incoming_value: Any) -> Any:
    priority = {None: 0, "En cours": 1, "Completee": 2}
    if priority.get(incoming_value, 0) > priority.get(existing_value, 0):
        return incoming_value
    return existing_value


def _merge_etat(existing_value: Any, incoming_value: Any) -> Any:
    priority = {
        None: 0,
        "Non associee": 1,
        "Non associe": 1,
        "En cours": 2,
        "Depassement": 3,
        "Qualifie": 4,
    }
    if priority.get(incoming_value, 0) > priority.get(existing_value, 0):
        return incoming_value
    return existing_value


def _merge_association_date(existing_value: Any, incoming_value: Any) -> Any:
    existing_date = _as_date(existing_value)
    incoming_date = _as_date(incoming_value)
    if existing_date and incoming_date:
        return min(existing_date, incoming_date).isoformat()
    return incoming_value if existing_date is None else existing_value


def _merge_qualification_row(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    merged = dict(existing)

    for field, incoming_value in incoming.items():
        existing_value = merged.get(field)

        if field == "statut":
            merged[field] = _merge_statut(existing_value, incoming_value)
            continue

        if field == "etat":
            merged[field] = _merge_etat(existing_value, incoming_value)
            continue

        if field == "date_association_systeme":
            merged[field] = _merge_association_date(existing_value, incoming_value)
            continue

        if _is_blank_merge_value(existing_value) and not _is_blank_merge_value(incoming_value):
            merged[field] = incoming_value

    return merged


def merge_qualification_rows(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    merged_rows: list[dict[str, Any] | None] = []
    alias_to_index: dict[tuple[Any, ...], int] = {}
    passthrough_rows: list[dict[str, Any]] = []

    for row in rows:
        row_payload = dict(row)
        aliases = _qualification_row_aliases(row_payload)
        if not aliases:
            passthrough_rows.append(row_payload)
            continue

        matched_indexes = sorted({alias_to_index[alias] for alias in aliases if alias in alias_to_index})
        if not matched_indexes:
            target_index = len(merged_rows)
            merged_rows.append(row_payload)
        else:
            target_index = matched_indexes[0]
            combined_row = merged_rows[target_index] or {}

            for other_index in matched_indexes[1:]:
                other_row = merged_rows[other_index]
                if other_row is None:
                    continue
                combined_row = _merge_qualification_row(combined_row, other_row)
                for alias in _qualification_row_aliases(other_row):
                    alias_to_index[alias] = target_index
                merged_rows[other_index] = None

            merged_rows[target_index] = _merge_qualification_row(combined_row, row_payload)

        current_row = merged_rows[target_index]
        if current_row is None:
            continue

        for alias in _qualification_row_aliases(current_row):
            alias_to_index[alias] = target_index

    return [row for row in merged_rows if row is not None] + passthrough_rows


def import_qualification_rows(db: Session, rows: list[dict[str, Any]]) -> dict[str, int]:
    collaborator_inserted = 0
    collaborator_updated = 0
    qualification_inserted = 0
    qualification_updated = 0
    skipped = 0
    formateurs_created = 0
    linked_with_formateur = 0

    try:
        for row in merge_qualification_rows(rows):
            matricule = row.get("matricule")
            formation_id = _normalize_formation_id(row.get("formation_id"))
            if not matricule:
                skipped += 1
                continue

            row_payload = dict(row)
            row_payload["statut"] = _normalize_import_statut(
                row.get("statut"),
                row.get("etat"),
            )
            if formation_id is None:
                row_payload["statut"] = None
                row_payload["formation_id"] = None

            collaborator_values = _build_collaborateur_values(row_payload)
            existing_collaborateur = db.execute(
                select(collaborateurs_table).where(collaborateurs_table.c.matricule == matricule)
            ).mappings().first()

            if existing_collaborateur:
                collaborator_changes = _changed_fields(existing_collaborateur, collaborator_values)
                if collaborator_changes:
                    db.execute(
                        update(collaborateurs_table)
                        .where(collaborateurs_table.c.matricule == matricule)
                        .values(**collaborator_changes)
                    )
                    collaborator_updated += 1
            else:
                if not collaborator_values.get("nom") or not collaborator_values.get("prenom"):
                    skipped += 1
                    continue
                db.execute(insert(collaborateurs_table).values(**collaborator_values))
                collaborator_inserted += 1

            formateur_id = None
            if formation_id is not None:
                _ensure_formation(db, formation_id, row_payload.get("formation_label"))
                formateur_id, formateur_was_created = _ensure_formateur(db, row_payload.get("formateur"))
                if formateur_was_created:
                    formateurs_created += 1
                if formateur_id is not None:
                    linked_with_formateur += 1
                    _ensure_formateur_formation_link(db, formateur_id, formation_id)

            qualification_values = _build_qualification_values(row_payload)
            qualification_values["formateur_id"] = formateur_id
            existing_qualification = db.execute(
                select(qualification_table)
                .where(qualification_table.c.matricule == matricule)
                .where(qualification_table.c.formation_id == formation_id)
                .order_by(qualification_table.c.id.desc())
            ).mappings().first()

            if existing_qualification:
                qualification_changes = _changed_fields(existing_qualification, qualification_values)
                if formation_id is None:
                    if existing_qualification.get("statut") is not None:
                        qualification_changes["statut"] = None
                    if existing_qualification.get("formateur_id") is not None:
                        qualification_changes["formateur_id"] = None
                if qualification_changes:
                    db.execute(
                        update(qualification_table)
                        .where(qualification_table.c.id == existing_qualification["id"])
                        .values(**qualification_changes)
                    )
                    qualification_updated += 1
            else:
                db.execute(insert(qualification_table).values(**qualification_values))
                qualification_inserted += 1

        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "collaborators_inserted": collaborator_inserted,
        "collaborators_updated": collaborator_updated,
        "qualifications_inserted": qualification_inserted,
        "qualifications_updated": qualification_updated,
        "formateurs_created": formateurs_created,
        "qualification_rows_with_formateur": linked_with_formateur,
        "skipped": skipped,
    }


def recalculate_qualification_rows(db: Session) -> dict[str, int]:
    total_rows = db.execute(select(func.count()).select_from(qualification_table)).scalar_one()
    return {
        "total_rows": total_rows,
        "updated_rows": 0,
    }
