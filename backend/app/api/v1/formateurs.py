from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.services.qualification_import_service import collaborateur_formations_table, formateurs_table, formations_table


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
            func.count(func.distinct(collaborateur_formations_table.c.formation_id)).label("formations_count"),
            func.count(collaborateur_formations_table.c.id).label("collaborateurs_count"),
        )
        .select_from(
            formateurs_table.outerjoin(
                collaborateur_formations_table,
                collaborateur_formations_table.c.formateur_id == formateurs_table.c.id,
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


@router.post("", status_code=status.HTTP_201_CREATED)
def create_formateur(
    payload: dict,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    nom = str(payload.get("nom_formateur") or "").strip()
    telephone = str(payload.get("telephone") or "").strip() or None
    email = str(payload.get("email") or "").strip() or None
    specialite = str(payload.get("specialite") or "").strip() or None

    if not nom:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="nom_formateur is required")

    existing = db.execute(
        select(formateurs_table).where(func.lower(formateurs_table.c.nom_formateur) == nom.lower())
    ).mappings().first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Trainer already exists")

    inserted = db.execute(
        formateurs_table.insert()
        .values(
            nom_formateur=nom,
            telephone=telephone,
            email=email,
            specialite=specialite,
        )
        .returning(
            formateurs_table.c.id,
            formateurs_table.c.nom_formateur,
            formateurs_table.c.telephone,
            formateurs_table.c.email,
            formateurs_table.c.specialite,
        )
    ).mappings().one()
    db.commit()

    return {
        "id": inserted["id"],
        "nom": inserted["nom_formateur"],
        "telephone": inserted["telephone"],
        "email": inserted["email"],
        "specialite": inserted["specialite"],
        "formations": 0,
        "collaborateurs": 0,
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

    stmt = (
        select(
            collaborateur_formations_table.c.formation_id,
            func.count(collaborateur_formations_table.c.id).label("collaborateurs_count"),
            func.max(collaborateur_formations_table.c.date_association_systeme).label("last_association_date"),
            func.max(collaborateur_formations_table.c.date_completion).label("last_completion_date"),
        )
        .where(collaborateur_formations_table.c.formateur_id == formateur_id)
        .group_by(collaborateur_formations_table.c.formation_id)
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
        last_date = row["last_completion_date"] or row["last_association_date"]
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
