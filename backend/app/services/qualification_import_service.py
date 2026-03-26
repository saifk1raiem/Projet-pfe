from __future__ import annotations

from collections.abc import Iterable
from datetime import date, timedelta
from typing import Any

from sqlalchemy import Column, Date, Integer, MetaData, String, Table, and_, func, insert, or_, select, update
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

qualification_table = Table(
    "qualification",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("matricule", String(20), nullable=False),
    Column("formation_id", Integer, nullable=False),
    Column("statut", String(20), nullable=False),
    Column("date_association_systeme", Date),
    Column("date_completion", Date),
    Column("etat_qualification", String(30)),
    Column("formateur_id", Integer),
)

_COLLABORATOR_FILL_FIELDS = (
    "matricule",
    "nom",
    "prenom",
    "fonction",
    "centre_cout",
    "groupe",
    "contre_maitre",
    "segment",
    "gender",
    "num_tel",
    "date_recrutement",
    "anciennete",
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
    if not text or text.casefold() in {"none", "null", "nan"}:
        return None
    return text


def _clean_token(value: Any) -> str | None:
    text = _clean_text(value)
    return text.casefold() if text else None


def _serialize_value(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _as_optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    if isinstance(value, int):
        return value
    text = _clean_text(value)
    if not text:
        return None
    try:
        return int(text)
    except ValueError:
        return None


def _row_identity_tokens(row: dict[str, Any]) -> set[str]:
    tokens: set[str] = set()

    matricule = _clean_token(row.get("matricule"))
    if matricule:
        tokens.add(f"mat:{matricule}")

    nom = _clean_token(row.get("nom"))
    prenom = _clean_token(row.get("prenom"))
    if nom and prenom:
        tokens.add(f"name:{nom}|{prenom}")

    return tokens


def _row_formation_tokens(row: dict[str, Any]) -> set[str]:
    tokens: set[str] = set()

    formation_id = _as_optional_int(row.get("formation_id"))
    if formation_id is not None:
        tokens.add(f"id:{formation_id}")

    formation_label = _clean_token(row.get("formation_label") or row.get("competence"))
    if formation_label:
        tokens.add(f"label:{formation_label}")

    return tokens


def _row_activity_day(row: dict[str, Any]) -> str | None:
    return _clean_text(row.get("date_completion") or row.get("date_association_systeme"))


def _rows_match_for_same_day_merge(existing: dict[str, Any], incoming: dict[str, Any]) -> bool:
    if not (_row_identity_tokens(existing) & _row_identity_tokens(incoming)):
        return False
    if not (_row_formation_tokens(existing) & _row_formation_tokens(incoming)):
        return False

    existing_day = _row_activity_day(existing)
    incoming_day = _row_activity_day(incoming)
    if existing_day and incoming_day and existing_day != incoming_day:
        return False

    return True


def _choose_text_value(current: Any, incoming: Any) -> Any:
    current_text = _clean_text(current)
    incoming_text = _clean_text(incoming)
    if not incoming_text:
        return current
    if not current_text:
        return incoming
    if len(incoming_text) > len(current_text) and current_text.casefold() in incoming_text.casefold():
        return incoming
    return current


def _choose_min_date(current: Any, incoming: Any) -> Any:
    current_date = _as_date(current)
    incoming_date = _as_date(incoming)
    if incoming_date is None:
        return current
    if current_date is None or incoming_date < current_date:
        return incoming_date.isoformat()
    return current


def _choose_max_date(current: Any, incoming: Any) -> Any:
    current_date = _as_date(current)
    incoming_date = _as_date(incoming)
    if incoming_date is None:
        return current
    if current_date is None or incoming_date > current_date:
        return incoming_date.isoformat()
    return current


def _merge_statut(current: Any, incoming: Any, *, has_completion: bool = False) -> str | None:
    current_status = _normalize_import_statut(current, None, None) if _clean_text(current) else None
    incoming_status = _normalize_import_statut(incoming, None, None) if _clean_text(incoming) else None
    if has_completion or current_status == "Completee" or incoming_status == "Completee":
        return "Completee"
    if current_status == "En cours" or incoming_status == "En cours":
        return "En cours"
    return current_status or incoming_status


def merge_same_day_qualification_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged_rows: list[dict[str, Any]] = []

    for raw_row in rows:
        row = dict(raw_row)
        if row.get("formation_label") and not row.get("competence"):
            row["competence"] = row.get("formation_label")
        if row.get("competence") and not row.get("formation_label"):
            row["formation_label"] = row.get("competence")

        target = next(
            (existing for existing in merged_rows if _rows_match_for_same_day_merge(existing, row)),
            None,
        )
        if target is None:
            merged_rows.append(row)
            continue

        for field in (
            "matricule",
            "nom",
            "prenom",
            "fonction",
            "centre_cout",
            "groupe",
            "competence",
            "formation_label",
            "formateur",
            "contre_maitre",
            "segment",
            "gender",
            "num_tel",
            "date_recrutement",
        ):
            target[field] = _choose_text_value(target.get(field), row.get(field))

        if target.get("anciennete") is None and row.get("anciennete") is not None:
            target["anciennete"] = row.get("anciennete")
        if target.get("formation_id") is None and row.get("formation_id") is not None:
            target["formation_id"] = _as_optional_int(row.get("formation_id"))

        target["date_association_systeme"] = _choose_min_date(
            target.get("date_association_systeme"),
            row.get("date_association_systeme"),
        )
        target["date_completion"] = _choose_max_date(
            target.get("date_completion"),
            row.get("date_completion"),
        )
        target["statut"] = _merge_statut(
            target.get("statut"),
            row.get("statut"),
            has_completion=bool(target.get("date_completion") or row.get("date_completion")),
        )
        target["etat"] = _choose_text_value(target.get("etat"), row.get("etat"))
        target["etat_qualification"] = _choose_text_value(
            target.get("etat_qualification"),
            row.get("etat_qualification"),
        )

    return merged_rows


def enrich_qualification_preview_rows(db: Session, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []

    normalized_rows = [dict(row) for row in rows]

    collaborator_matricules = sorted(
        {
            matricule
            for row in normalized_rows
            if (matricule := _clean_text(row.get("matricule")))
        }
    )
    collaborator_name_pairs = {
        (nom, prenom)
        for row in normalized_rows
        if (nom := _clean_token(row.get("nom"))) and (prenom := _clean_token(row.get("prenom")))
    }

    collaborator_by_matricule: dict[str, dict[str, Any]] = {}
    collaborators_by_name: dict[tuple[str, str], list[dict[str, Any]]] = {}
    if collaborator_matricules or collaborator_name_pairs:
        conditions = []
        if collaborator_matricules:
            conditions.append(collaborateurs_table.c.matricule.in_(collaborator_matricules))
        if collaborator_name_pairs:
            conditions.append(
                and_(
                    func.lower(collaborateurs_table.c.nom).in_([item[0] for item in collaborator_name_pairs]),
                    func.lower(collaborateurs_table.c.prenom).in_([item[1] for item in collaborator_name_pairs]),
                )
            )
        collaborator_rows = db.execute(
            select(collaborateurs_table).where(or_(*conditions))
        ).mappings().all()
        for collaborator in collaborator_rows:
            matricule = _clean_text(collaborator.get("matricule"))
            if matricule:
                collaborator_by_matricule[matricule] = collaborator
            name_key = (_clean_token(collaborator.get("nom")), _clean_token(collaborator.get("prenom")))
            if name_key[0] and name_key[1]:
                collaborators_by_name.setdefault(name_key, []).append(collaborator)

    formation_ids = {
        formation_id
        for row in normalized_rows
        if (formation_id := _as_optional_int(row.get("formation_id"))) is not None
    }
    formation_labels = {
        label
        for row in normalized_rows
        if (label := _clean_token(row.get("formation_label") or row.get("competence")))
    }

    formation_by_id: dict[int, dict[str, Any]] = {}
    formations_by_label: dict[str, list[dict[str, Any]]] = {}
    if formation_ids or formation_labels:
        conditions = []
        if formation_ids:
            conditions.append(formations_table.c.id.in_(sorted(formation_ids)))
        if formation_labels:
            conditions.append(func.lower(formations_table.c.nom_formation).in_(sorted(formation_labels)))
            conditions.append(func.lower(formations_table.c.code_formation).in_(sorted(formation_labels)))
        formation_rows = db.execute(
            select(formations_table).where(or_(*conditions))
        ).mappings().all()
        for formation in formation_rows:
            formation_by_id[int(formation["id"])] = formation
            for label_key in {
                _clean_token(formation.get("nom_formation")),
                _clean_token(formation.get("code_formation")),
            }:
                if label_key:
                    formations_by_label.setdefault(label_key, []).append(formation)

    enriched_rows: list[dict[str, Any]] = []
    for row in normalized_rows:
        next_row = dict(row)

        collaborator = None
        row_matricule = _clean_text(next_row.get("matricule"))
        if row_matricule:
            collaborator = collaborator_by_matricule.get(row_matricule)
        if collaborator is None:
            name_key = (_clean_token(next_row.get("nom")), _clean_token(next_row.get("prenom")))
            matches = collaborators_by_name.get(name_key, []) if name_key[0] and name_key[1] else []
            if len(matches) == 1:
                collaborator = matches[0]
                next_row["matricule"] = collaborator.get("matricule")

        if collaborator:
            for field in _COLLABORATOR_FILL_FIELDS:
                if _clean_text(next_row.get(field)) is None and collaborator.get(field) is not None:
                    next_row[field] = _serialize_value(collaborator.get(field))

        formation = None
        formation_id = _as_optional_int(next_row.get("formation_id"))
        if formation_id is not None:
            next_row["formation_id"] = formation_id
            formation = formation_by_id.get(formation_id)
        if formation is None:
            label_key = _clean_token(next_row.get("formation_label") or next_row.get("competence"))
            matches = formations_by_label.get(label_key, []) if label_key else []
            unique_ids = {int(item["id"]) for item in matches}
            if len(unique_ids) == 1:
                formation_id = next(iter(unique_ids))
                formation = formation_by_id.get(formation_id) or matches[0]
                next_row["formation_id"] = formation_id

        if formation:
            formation_name = formation.get("nom_formation")
            if not _clean_text(next_row.get("formation_label")) and formation_name:
                next_row["formation_label"] = formation_name
            if not _clean_text(next_row.get("competence")) and formation_name:
                next_row["competence"] = formation_name

        enriched_rows.append(next_row)

    return enriched_rows


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

        formation_id = _as_optional_int(row.get("formation_id"))
        if formation_id is None:
            missing_fields.append(
                QualificationMissingField(field="formation_id", label=_MISSING_FIELD_LABELS["formation_id"])
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


def prepare_qualification_preview_rows(db: Session, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    enriched_rows = enrich_qualification_preview_rows(db, rows)
    merged_rows = merge_same_day_qualification_rows(enriched_rows)
    return enrich_qualification_preview_rows(db, merged_rows)


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
        "date_completion": _as_date(row.get("date_completion")),
        "etat_qualification": row.get("etat_qualification"),
        "formateur_id": row.get("formateur_id"),
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
    etat_qualification: str | None = None,
    today: date | None = None,
) -> str:
    computed = compute_etat_qualification(
        statut,
        date_association_systeme,
        duree_jours,
        today=today,
    )
    if computed != "Non associee":
        return computed

    if etat_qualification in {"Qualifie", "En cours", "Depassement", "Non associee", "Non associe"}:
        return "Non associee" if etat_qualification == "Non associe" else etat_qualification

    return "Non associee"


def _normalize_import_statut(statut: Any, date_completion: Any, etat_qualification: Any = None) -> str:
    if isinstance(statut, str):
        normalized = statut.strip().lower().replace("-", "_").replace(" ", "_")
    else:
        normalized = ""

    if normalized in {"completee", "complete", "completed", "terminee", "termine", "qualifie", "qualifiee"}:
        return "Completee"
    if normalized in {"en_cours", "encours", "in_progress", "ongoing", "depassement", "overdue"}:
        return "En cours"

    if isinstance(etat_qualification, str):
        normalized_etat = etat_qualification.strip().lower().replace("-", "_").replace(" ", "_")
        if normalized_etat in {"qualifie", "qualifiee"}:
            return "Completee"
        if normalized_etat in {"en_cours", "encours", "depassement", "overdue"}:
            return "En cours"

    if date_completion not in (None, ""):
        return "Completee"
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


def _dedupe_rows(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key: dict[tuple[str, int], dict[str, Any]] = {}
    for row in rows:
        matricule = row.get("matricule")
        formation_id = row.get("formation_id")
        if not matricule or formation_id is None:
            continue
        by_key[(matricule, int(formation_id))] = row
    return list(by_key.values())


def import_qualification_rows(db: Session, rows: list[dict[str, Any]]) -> dict[str, int]:
    collaborator_inserted = 0
    collaborator_updated = 0
    qualification_inserted = 0
    qualification_updated = 0
    skipped = 0
    formateurs_created = 0
    linked_with_formateur = 0

    try:
        for row in _dedupe_rows(rows):
            matricule = row.get("matricule")
            formation_id = row.get("formation_id")
            if not matricule or formation_id is None:
                skipped += 1
                continue

            row_payload = dict(row)
            row_payload["statut"] = _normalize_import_statut(
                row.get("statut"),
                row.get("date_completion"),
                row.get("etat_qualification"),
            )

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

            _ensure_formation(db, int(formation_id), row_payload.get("formation_label"))
            formation = _get_formation(db, int(formation_id))
            formateur_id, formateur_was_created = _ensure_formateur(db, row_payload.get("formateur"))
            if formateur_was_created:
                formateurs_created += 1
            if formateur_id is not None:
                linked_with_formateur += 1

            qualification_values = _build_qualification_values(row_payload)
            qualification_values["formateur_id"] = formateur_id
            qualification_values["etat_qualification"] = compute_etat_qualification(
                qualification_values.get("statut"),
                qualification_values.get("date_association_systeme"),
                formation.get("duree_jours") if formation else None,
            )
            existing_qualification = db.execute(
                select(qualification_table)
                .where(qualification_table.c.matricule == matricule)
                .where(qualification_table.c.formation_id == formation_id)
                .order_by(qualification_table.c.id.desc())
            ).mappings().first()

            if existing_qualification:
                qualification_changes = _changed_fields(existing_qualification, qualification_values)
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
    rows = db.execute(
        select(
            qualification_table.c.id,
            qualification_table.c.statut,
            qualification_table.c.date_association_systeme,
            qualification_table.c.etat_qualification,
            formations_table.c.duree_jours,
        )
        .select_from(
            qualification_table.outerjoin(
                formations_table,
                formations_table.c.id == qualification_table.c.formation_id,
            )
        )
    ).mappings().all()

    updated_rows = 0
    for row in rows:
        next_status = resolve_qualification_status(
            row["statut"],
            row["date_association_systeme"],
            row["duree_jours"],
            etat_qualification=row["etat_qualification"],
        )
        if row["etat_qualification"] != next_status:
            db.execute(
                update(qualification_table)
                .where(qualification_table.c.id == row["id"])
                .values(etat_qualification=next_status)
            )
            updated_rows += 1

    db.commit()
    return {
        "total_rows": len(rows),
        "updated_rows": updated_rows,
    }
