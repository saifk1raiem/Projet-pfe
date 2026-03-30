from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.services.qualification_import_service import (
    collaborateurs_table,
    formateurs_table,
    formations_table,
    qualification_table,
    resolve_qualification_status,
)


router = APIRouter(prefix="/formateurs", tags=["formateurs"])


@router.get("")
def list_formateurs(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    stmt = (
        select(
            formateurs_table.c.id,
            formateurs_table.c.nom_formateur,
            formateurs_table.c.telephone,
            formateurs_table.c.email,
            formateurs_table.c.specialite,
            func.count(func.distinct(qualification_table.c.formation_id)).label("formations_count"),
            func.count(qualification_table.c.id).label("collaborateurs_count"),
        )
        .select_from(
            formateurs_table.outerjoin(
                qualification_table,
                qualification_table.c.formateur_id == formateurs_table.c.id,
            )
        )
        .group_by(
            formateurs_table.c.id,
            formateurs_table.c.nom_formateur,
            formateurs_table.c.telephone,
            formateurs_table.c.email,
            formateurs_table.c.specialite,
        )
        .order_by(formateurs_table.c.nom_formateur.asc())
    )

    rows = db.execute(stmt).mappings().all()
    return [
        {
            "id": row["id"],
            "nom": row["nom_formateur"],
            "telephone": row["telephone"],
            "email": row["email"],
            "specialite": row["specialite"],
            "formations": row["formations_count"] or 0,
            "collaborateurs": row["collaborateurs_count"] or 0,
        }
        for row in rows
    ]


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

    stmt = (
        select(
            qualification_table.c.formation_id,
            func.count(qualification_table.c.id).label("collaborateurs_count"),
            func.max(qualification_table.c.date_association_systeme).label("last_association_date"),
        )
        .where(qualification_table.c.formateur_id == formateur_id)
        .group_by(qualification_table.c.formation_id)
    )

    rows = db.execute(stmt).mappings().all()
    formation_ids = [row["formation_id"] for row in rows if row["formation_id"] is not None]
    formations_by_id = {}
    if formation_ids:
        formations_rows = db.execute(
            select(
                formations_table.c.id,
                formations_table.c.code_formation,
                formations_table.c.nom_formation,
                formations_table.c.domaine,
                formations_table.c.duree_jours,
            ).where(formations_table.c.id.in_(formation_ids))
        ).mappings().all()
        formations_by_id = {item["id"]: item for item in formations_rows}

    result = []
    for row in rows:
        formation_id = row["formation_id"]
        formation = formations_by_id.get(formation_id, {})
        last_date = row["last_association_date"]
        result.append(
            {
                "formation_id": formation_id,
                "code": formation.get("code_formation") or str(formation_id),
                "titre": formation.get("nom_formation") or f"Formation {formation_id}",
                "domaine": formation.get("domaine") or "Formation",
                "duree": formation.get("duree_jours"),
                "collaborateurs": row["collaborateurs_count"] or 0,
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
