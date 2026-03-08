from __future__ import annotations

from collections.abc import Iterable
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import Column, Date, Integer, MetaData, Numeric, String, Table, insert, select, update
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

collaborateur_formations_table = Table(
    "collaborateur_formations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("matricule", String(20), nullable=False),
    Column("formation_id", Integer, nullable=False),
    Column("statut", String(20), nullable=False),
    Column("date_association_systeme", Date),
    Column("date_completion", Date),
    Column("etat_qualification", String(30)),
    Column("score", Numeric(5, 2)),
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

    try:
        for row in _dedupe_rows(rows):
            matricule = row.get("matricule")
            formation_id = row.get("formation_id")
            statut = row.get("statut")
            if not matricule or formation_id is None or not statut:
                skipped += 1
                continue

            collaborator_values = _build_collaborateur_values(row)
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

            _ensure_formation(db, int(formation_id), row.get("formation_label"))
            formation = _get_formation(db, int(formation_id))

            qualification_values = _build_qualification_values(row)
            qualification_values["etat_qualification"] = compute_etat_qualification(
                qualification_values.get("statut"),
                qualification_values.get("date_association_systeme"),
                formation.get("duree_jours") if formation else None,
            )
            existing_qualification = db.execute(
                select(collaborateur_formations_table)
                .where(collaborateur_formations_table.c.matricule == matricule)
                .where(collaborateur_formations_table.c.formation_id == formation_id)
                .order_by(collaborateur_formations_table.c.id.desc())
            ).mappings().first()

            if existing_qualification:
                qualification_changes = _changed_fields(existing_qualification, qualification_values)
                if qualification_changes:
                    db.execute(
                        update(collaborateur_formations_table)
                        .where(collaborateur_formations_table.c.id == existing_qualification["id"])
                        .values(**qualification_changes)
                    )
                    qualification_updated += 1
            else:
                db.execute(insert(collaborateur_formations_table).values(**qualification_values))
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
        "skipped": skipped,
    }
