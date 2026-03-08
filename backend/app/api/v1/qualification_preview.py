from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.services.excel_synonyms import get_excel_synonyms
from app.services.qualification_import_service import (
    collaborateur_formations_table,
    collaborateurs_table,
    compute_etat_qualification,
    formations_table,
    import_qualification_rows,
)
from app.utils.qualification_preview import parse_excel_to_rows


router = APIRouter(prefix="/qualification", tags=["qualification"])


def resolve_phase(date_association_systeme) -> str:
    if not date_association_systeme:
        return "qualification"
    days_since_association = (date.today() - date_association_systeme).days
    return "indection" if days_since_association <= 5 else "qualification"


@router.get("")
def list_qualification_rows(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    stmt = (
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
            collaborateur_formations_table.c.id.label("qualification_row_id"),
            collaborateur_formations_table.c.formation_id,
            collaborateur_formations_table.c.statut.label("qualification_statut"),
            collaborateur_formations_table.c.date_association_systeme,
            collaborateur_formations_table.c.date_completion,
            collaborateur_formations_table.c.etat_qualification,
            formations_table.c.duree_jours,
        )
        .select_from(
            collaborateurs_table
            .outerjoin(
                collaborateur_formations_table,
                collaborateurs_table.c.matricule == collaborateur_formations_table.c.matricule,
            )
            .outerjoin(formations_table, formations_table.c.id == collaborateur_formations_table.c.formation_id)
        )
        .order_by(collaborateurs_table.c.matricule.asc())
    )

    raw_rows = db.execute(stmt).mappings().all()
    collaborators_by_matricule: dict[str, dict] = {}

    def status_rank(value: str) -> int:
        if value == "Depassement":
            return 3
        if value == "En cours":
            return 2
        if value == "Qualifie":
            return 1
        return 0

    for item in raw_rows:
        matricule = item["matricule"]
        current = collaborators_by_matricule.get(matricule)
        qualification_status = compute_etat_qualification(
            item["qualification_statut"],
            item["date_association_systeme"],
            item["duree_jours"],
        ) if item["qualification_row_id"] is not None else "Non associee"

        if current is None:
            current = {
                "id": matricule,
                "phase": "indection",
                "matricule": matricule,
                "nom": item["nom"],
                "prenom": item["prenom"],
                "fonction": item["fonction"],
                "centre_cout": item["centre_cout"],
                "groupe": item["groupe"],
                "competence": None,
                "contre_maitre": item["contre_maitre"],
                "segment": item["segment"],
                "gender": item["gender"],
                "num_tel": item["num_tel"],
                "date_recrutement": item["date_recrutement"].isoformat() if item["date_recrutement"] else None,
                "anciennete": item["anciennete"],
                "statut": "Non associee",
                "formations": 0,
                "derniereFormation": None,
                "_latest_association_date": None,
            }
            collaborators_by_matricule[matricule] = current

        if item["qualification_row_id"] is not None:
            current["formations"] += 1
            if item["date_association_systeme"] and (
                current["derniereFormation"] is None or item["date_association_systeme"].isoformat() > current["derniereFormation"]
            ):
                current["derniereFormation"] = item["date_association_systeme"].isoformat()
            if status_rank(qualification_status) > status_rank(current["statut"]):
                current["statut"] = qualification_status
            if current["_latest_association_date"] is None or item["date_association_systeme"] > current["_latest_association_date"]:
                current["_latest_association_date"] = item["date_association_systeme"]
                current["phase"] = resolve_phase(item["date_association_systeme"])

    result = []
    for collaborator in collaborators_by_matricule.values():
        collaborator.pop("_latest_association_date", None)
        result.append(collaborator)
    return result


@router.get("/{matricule}/formations")
def list_collaborateur_formations(
    matricule: str,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    stmt = (
        select(
            collaborateur_formations_table.c.id,
            collaborateur_formations_table.c.formation_id,
            collaborateur_formations_table.c.statut,
            collaborateur_formations_table.c.date_association_systeme,
            collaborateur_formations_table.c.date_completion,
            collaborateur_formations_table.c.etat_qualification,
            collaborateur_formations_table.c.score,
            formations_table.c.code_formation,
            formations_table.c.nom_formation,
            formations_table.c.domaine,
            formations_table.c.duree_jours,
        )
        .select_from(
            collaborateur_formations_table.outerjoin(
                formations_table,
                formations_table.c.id == collaborateur_formations_table.c.formation_id,
            )
        )
        .where(collaborateur_formations_table.c.matricule == matricule)
        .order_by(collaborateur_formations_table.c.date_association_systeme.desc(), collaborateur_formations_table.c.id.desc())
    )

    rows = db.execute(stmt).mappings().all()
    return [
        {
            "id": item["id"],
            "formation_id": item["formation_id"],
            "code": item["code_formation"] or str(item["formation_id"]),
            "titre": item["nom_formation"] or f"Formation {item['formation_id']}",
            "type": item["domaine"] or "Formation",
            "date": item["date_completion"].isoformat() if item["date_completion"] else (
                item["date_association_systeme"].isoformat() if item["date_association_systeme"] else None
            ),
            "duree": item["duree_jours"],
            "resultat": item["etat_qualification"] or item["statut"],
            "statut": item["statut"],
            "score": float(item["score"]) if item["score"] is not None else None,
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
    merged_columns: list[str] = []
    merged_mapping: dict[str, str] = {}
    file_errors: list[dict[str, str]] = []

    for upload in files:
        filename = (upload.filename or "").lower()
        if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
            file_errors.append({"file": upload.filename or "", "error": "Only .xlsx and .xls files are accepted"})
            continue

        content = await upload.read()
        if not content:
            file_errors.append({"file": upload.filename or "", "error": "Uploaded file is empty"})
            continue

        try:
            columns_detected, mapping_used, rows = parse_excel_to_rows(
                content,
                filename,
                synonyms=get_excel_synonyms(),
            )
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Excel support dependencies are missing (openpyxl/xlrd)",
            ) from exc
        except Exception as exc:
            file_errors.append({"file": upload.filename or "", "error": f"Invalid Excel file: {exc}"})
            continue

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

        merged_rows.extend(rows)
        for column in columns_detected:
            if column not in merged_columns:
                merged_columns.append(column)
        for field, header in mapping_used.items():
            if field not in merged_mapping:
                merged_mapping[field] = header

    if file_errors and not merged_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "No valid files to preview", "file_errors": file_errors},
        )

    import_summary = import_qualification_rows(db, merged_rows) if merged_rows else {
        "collaborators_inserted": 0,
        "collaborators_updated": 0,
        "qualifications_inserted": 0,
        "qualifications_updated": 0,
        "skipped": 0,
    }

    return {
        "columns_detected": merged_columns,
        "mapping_used": merged_mapping,
        "rows": merged_rows,
        "rows_count": len(merged_rows),
        "file_errors": file_errors,
        "import_summary": import_summary,
    }
