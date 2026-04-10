from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.schemas.formateur import FormateurCreateRequest, FormateurUpdateRequest
from app.services.qualification_import_service import (
    collaborateurs_table,
    formateur_formations_table,
    formateurs_table,
    formations_table,
    qualification_table,
    resolve_qualification_status,
)


router = APIRouter(prefix="/formateurs", tags=["formateurs"])


def _clean_optional_text(value: str | None, max_length: int) -> str | None:
    if value is None:
        return None
    text = " ".join(str(value).split()).strip()
    if not text:
        return None
    return text[:max_length]


def _serialize_formateur_row(row: dict) -> dict:
    return {
        "id": row["id"],
        "nom": row["nom_formateur"],
        "telephone": row["telephone"],
        "email": row["email"],
        "specialite": row["specialite"],
        "formation_ids": row.get("formation_ids", []) or [],
        "formations": row.get("formations_count", 0) or 0,
        "collaborateurs": row.get("collaborateurs_count", 0) or 0,
    }


def _get_formateur_row(db: Session, formateur_id: int) -> dict | None:
    return db.execute(
        select(
            formateurs_table.c.id,
            formateurs_table.c.nom_formateur,
            formateurs_table.c.telephone,
            formateurs_table.c.email,
            formateurs_table.c.specialite,
        ).where(formateurs_table.c.id == formateur_id)
    ).mappings().first()


def _normalize_formation_ids(formation_ids: list[int] | None) -> list[int]:
    normalized: list[int] = []
    seen: set[int] = set()
    for formation_id in formation_ids or []:
        try:
            parsed_id = int(formation_id)
        except (TypeError, ValueError):
            continue
        if parsed_id in seen:
            continue
        seen.add(parsed_id)
        normalized.append(parsed_id)
    return normalized


def _validate_formation_ids(db: Session, formation_ids: list[int]) -> list[int]:
    if not formation_ids:
        return []

    existing_ids = set(
        db.execute(
            select(formations_table.c.id).where(formations_table.c.id.in_(formation_ids))
        ).scalars().all()
    )
    missing_ids = [formation_id for formation_id in formation_ids if formation_id not in existing_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown formations: {', '.join(str(item) for item in missing_ids)}",
        )
    return formation_ids


def _get_formateur_formation_ids(db: Session, formateur_id: int) -> list[int]:
    return list(
        db.execute(
            select(formateur_formations_table.c.formation_id)
            .where(formateur_formations_table.c.formateur_id == formateur_id)
            .order_by(formateur_formations_table.c.formation_id.asc())
        ).scalars().all()
    )


def _replace_formateur_formations(db: Session, formateur_id: int, formation_ids: list[int]) -> None:
    db.execute(
        delete(formateur_formations_table).where(formateur_formations_table.c.formateur_id == formateur_id)
    )
    if formation_ids:
        db.execute(
            insert(formateur_formations_table),
            [{"formateur_id": formateur_id, "formation_id": formation_id} for formation_id in formation_ids],
        )


def _detach_qualifications_for_removed_formations(
    db: Session,
    formateur_id: int,
    removed_formation_ids: list[int],
) -> None:
    if not removed_formation_ids:
        return

    db.execute(
        update(qualification_table)
        .where(qualification_table.c.formateur_id == formateur_id)
        .where(qualification_table.c.formation_id.in_(removed_formation_ids))
        .values(formateur_id=None)
    )


@router.get("")
def list_formateurs(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    formations_count_subquery = (
        select(
            formateur_formations_table.c.formateur_id.label("formateur_id"),
            func.count(formateur_formations_table.c.formation_id).label("formations_count"),
        )
        .group_by(formateur_formations_table.c.formateur_id)
        .subquery()
    )
    collaborateurs_count_subquery = (
        select(
            qualification_table.c.formateur_id.label("formateur_id"),
            func.count(qualification_table.c.id).label("collaborateurs_count"),
        )
        .where(qualification_table.c.formateur_id.is_not(None))
        .group_by(qualification_table.c.formateur_id)
        .subquery()
    )
    stmt = (
        select(
            formateurs_table.c.id,
            formateurs_table.c.nom_formateur,
            formateurs_table.c.telephone,
            formateurs_table.c.email,
            formateurs_table.c.specialite,
            func.coalesce(formations_count_subquery.c.formations_count, 0).label("formations_count"),
            func.coalesce(collaborateurs_count_subquery.c.collaborateurs_count, 0).label("collaborateurs_count"),
        )
        .select_from(
            formateurs_table
            .outerjoin(
                formations_count_subquery,
                formations_count_subquery.c.formateur_id == formateurs_table.c.id,
            )
            .outerjoin(
                collaborateurs_count_subquery,
                collaborateurs_count_subquery.c.formateur_id == formateurs_table.c.id,
            )
        )
        .order_by(formateurs_table.c.nom_formateur.asc())
    )

    rows = db.execute(stmt).mappings().all()
    formation_ids_by_formateur: dict[int, list[int]] = {}
    formateur_ids = [row["id"] for row in rows]
    if formateur_ids:
        assignments = db.execute(
            select(
                formateur_formations_table.c.formateur_id,
                formateur_formations_table.c.formation_id,
            )
            .where(formateur_formations_table.c.formateur_id.in_(formateur_ids))
            .order_by(
                formateur_formations_table.c.formateur_id.asc(),
                formateur_formations_table.c.formation_id.asc(),
            )
        ).mappings().all()
        for assignment in assignments:
            formation_ids_by_formateur.setdefault(assignment["formateur_id"], []).append(assignment["formation_id"])

    return [
        _serialize_formateur_row({
            **row,
            "formation_ids": formation_ids_by_formateur.get(row["id"], []),
        })
        for row in rows
    ]


@router.post("")
def create_formateur(
    payload: FormateurCreateRequest,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    nom = _clean_optional_text(payload.nom, 150)
    if not nom:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trainer name is required")
    formation_ids = _validate_formation_ids(db, _normalize_formation_ids(payload.formation_ids))

    existing = db.execute(
        select(formateurs_table.c.id).where(func.lower(formateurs_table.c.nom_formateur) == nom.lower())
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Trainer already exists")

    inserted_id = db.execute(
        insert(formateurs_table)
        .values(
            nom_formateur=nom,
            telephone=_clean_optional_text(payload.telephone, 20),
            email=_clean_optional_text(payload.email, 150),
            specialite=_clean_optional_text(payload.specialite, 100),
        )
        .returning(formateurs_table.c.id)
    ).scalar_one()
    _replace_formateur_formations(db, inserted_id, formation_ids)
    db.commit()

    return {
        "id": inserted_id,
        "nom": nom,
        "telephone": _clean_optional_text(payload.telephone, 20),
        "email": _clean_optional_text(payload.email, 150),
        "specialite": _clean_optional_text(payload.specialite, 100),
        "formation_ids": formation_ids,
        "formations": len(formation_ids),
        "collaborateurs": 0,
    }


@router.patch("/{formateur_id}")
def update_formateur(
    formateur_id: int,
    payload: FormateurUpdateRequest,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    existing = _get_formateur_row(db, formateur_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trainer not found")

    nom = _clean_optional_text(payload.nom, 150)
    if not nom:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trainer name is required")
    formation_ids = _validate_formation_ids(db, _normalize_formation_ids(payload.formation_ids))
    existing_formation_ids = _get_formateur_formation_ids(db, formateur_id)

    duplicate = db.execute(
        select(formateurs_table.c.id)
        .where(func.lower(formateurs_table.c.nom_formateur) == nom.lower())
        .where(formateurs_table.c.id != formateur_id)
    ).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Trainer already exists")

    values = {
        "nom_formateur": nom,
        "telephone": _clean_optional_text(payload.telephone, 20),
        "email": _clean_optional_text(payload.email, 150),
        "specialite": _clean_optional_text(payload.specialite, 100),
    }
    db.execute(update(formateurs_table).where(formateurs_table.c.id == formateur_id).values(**values))
    _replace_formateur_formations(db, formateur_id, formation_ids)
    removed_formation_ids = [formation_id for formation_id in existing_formation_ids if formation_id not in formation_ids]
    _detach_qualifications_for_removed_formations(db, formateur_id, removed_formation_ids)
    db.commit()

    return {
        "id": formateur_id,
        "nom": values["nom_formateur"],
        "telephone": values["telephone"],
        "email": values["email"],
        "specialite": values["specialite"],
        "formation_ids": formation_ids,
        "formations": len(formation_ids),
        "collaborateurs": 0,
    }


@router.delete("/{formateur_id}")
def delete_formateur(
    formateur_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    existing = _get_formateur_row(db, formateur_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trainer not found")

    detached_qualifications = db.execute(
        select(func.count())
        .select_from(qualification_table)
        .where(qualification_table.c.formateur_id == formateur_id)
    ).scalar_one()

    if detached_qualifications:
        db.execute(
            update(qualification_table)
            .where(qualification_table.c.formateur_id == formateur_id)
            .values(formateur_id=None)
        )

    db.execute(delete(formateur_formations_table).where(formateur_formations_table.c.formateur_id == formateur_id))
    db.execute(delete(formateurs_table).where(formateurs_table.c.id == formateur_id))
    db.commit()

    return {
        "id": formateur_id,
        "deleted": True,
        "detached_qualifications": detached_qualifications,
    }


@router.get("/{formateur_id}/formations")
def list_formateur_formations(
    formateur_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    exists = db.execute(
        select(formateurs_table.c.id).where(formateurs_table.c.id == formateur_id)
    ).first()
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trainer not found")

    assigned_formation_ids = _get_formateur_formation_ids(db, formateur_id)
    qualification_stats = db.execute(
        select(
            qualification_table.c.formation_id,
            func.count(qualification_table.c.id).label("collaborateurs_count"),
            func.max(qualification_table.c.date_association_systeme).label("last_association_date"),
        )
        .where(qualification_table.c.formateur_id == formateur_id)
        .group_by(qualification_table.c.formation_id)
    ).mappings().all()
    qualification_stats_by_formation = {
        row["formation_id"]: row
        for row in qualification_stats
        if row["formation_id"] is not None
    }

    if not assigned_formation_ids:
        return []

    stmt = (
        select(
            formations_table.c.id,
            formations_table.c.code_formation,
            formations_table.c.nom_formation,
            formations_table.c.domaine,
            formations_table.c.duree_jours,
        )
        .where(formations_table.c.id.in_(assigned_formation_ids))
    )

    rows = db.execute(stmt).mappings().all()
    formations_by_id = {row["id"]: row for row in rows}

    result = []
    for formation_id in assigned_formation_ids:
        formation = formations_by_id.get(formation_id, {})
        stats = qualification_stats_by_formation.get(formation_id, {})
        last_date = stats.get("last_association_date")
        result.append(
            {
                "formation_id": formation_id,
                "code": formation.get("code_formation") or str(formation_id),
                "titre": formation.get("nom_formation") or f"Formation {formation_id}",
                "domaine": formation.get("domaine") or "Formation",
                "duree": formation.get("duree_jours"),
                "collaborateurs": stats.get("collaborateurs_count", 0) or 0,
                "last_date": last_date.isoformat() if last_date else None,
            }
        )

    result.sort(key=lambda item: (item["titre"] or "").lower())
    return result


@router.get("/{formateur_id}/collaborateurs")
def list_formateur_collaborateurs(
    formateur_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    exists = db.execute(
        select(formateurs_table.c.id).where(formateurs_table.c.id == formateur_id)
    ).first()
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trainer not found")

    stmt = (
        select(
            qualification_table.c.id.label("association_id"),
            qualification_table.c.matricule,
            qualification_table.c.statut,
            qualification_table.c.date_association_systeme,
            collaborateurs_table.c.nom,
            collaborateurs_table.c.prenom,
            collaborateurs_table.c.fonction,
            collaborateurs_table.c.segment,
            collaborateurs_table.c.groupe,
            collaborateurs_table.c.centre_cout,
            formations_table.c.id.label("formation_id"),
            formations_table.c.code_formation,
            formations_table.c.nom_formation,
            formations_table.c.duree_jours,
        )
        .select_from(
            qualification_table.join(
                collaborateurs_table,
                collaborateurs_table.c.matricule == qualification_table.c.matricule,
            ).outerjoin(
                formations_table,
                formations_table.c.id == qualification_table.c.formation_id,
            )
        )
        .where(qualification_table.c.formateur_id == formateur_id)
        .order_by(
            collaborateurs_table.c.nom.asc(),
            collaborateurs_table.c.prenom.asc(),
            qualification_table.c.date_association_systeme.desc(),
            qualification_table.c.id.desc(),
        )
    )

    rows = db.execute(stmt).mappings().all()
    result = []
    for row in rows:
        statut = resolve_qualification_status(
            row["statut"],
            row["date_association_systeme"],
            row["duree_jours"],
        )

        result.append(
            {
                "id": row["association_id"],
                "matricule": row["matricule"],
                "nom": row["nom"],
                "prenom": row["prenom"],
                "poste": row["fonction"],
                "departement": row["segment"] or row["groupe"] or row["centre_cout"],
                "statut": statut,
                "date_association": row["date_association_systeme"].isoformat()
                if row["date_association_systeme"]
                else None,
                "formation_id": row["formation_id"],
                "formation_code": row["code_formation"] or (str(row["formation_id"]) if row["formation_id"] else None),
                "formation_titre": row["nom_formation"] or (
                    f"Formation {row['formation_id']}" if row["formation_id"] else None
                ),
            }
        )

    return result
