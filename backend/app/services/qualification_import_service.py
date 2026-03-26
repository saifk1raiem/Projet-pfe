from __future__ import annotations

from collections.abc import Iterable
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import Column, Date, Integer, MetaData, Numeric, String, Table, Text, func, insert, select, update
from sqlalchemy.orm import Session


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
    Column("score", Numeric(5, 2)),
    Column("formateur_id", Integer),
    Column("motif", Text),
)


def _as_date(value: Any) -> date | None:
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _as_decimal(value: Any) -> Decimal | None:
    if value in (None, ""):
        return None
    return Decimal(str(value)).quantize(Decimal("0.01"))


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
        "score": _as_decimal(row.get("score")),
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
