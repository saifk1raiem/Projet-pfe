from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.schemas.qualification import QualificationImportRequest
from app.services.collaborateur_import_service import detect_collaborateur_conflicts
from app.services.excel_synonyms import get_excel_synonyms
from app.services.qualification_import_service import (
    collaborateurs_table,
    formateurs_table,
    formations_table,
    import_qualification_rows,
    qualification_table,
    recalculate_qualification_rows,
    resolve_qualification_status,
)
from app.utils.qualification_preview import SUPPORTED_UPLOAD_EXTENSIONS, parse_excel_to_rows


router = APIRouter(prefix="/qualification", tags=["qualification"])


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
        normalized_status = row.get("statut")
        if normalized_status not in {"Completee", "En cours"}:
            normalized_status = "Completee" if row.get("date_completion") else "En cours"

        association_date = None
        if row.get("date_association_systeme"):
            association_date = date.fromisoformat(str(row["date_association_systeme"]))

        qualification_status = resolve_qualification_status(
            normalized_status,
            association_date,
            durations_by_formation_id.get(int(row["formation_id"])) if row.get("formation_id") not in (None, "") else None,
            etat_qualification=row.get("etat_qualification"),
        )

        enriched_rows.append(
            {
                **row,
                "statut": normalized_status,
                "etat_qualification": qualification_status,
                "etat": qualification_status,
            }
        )

    return enriched_rows


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
            qualification_table.c.id.label("qualification_row_id"),
            qualification_table.c.formation_id,
            qualification_table.c.statut.label("qualification_statut"),
            qualification_table.c.date_association_systeme,
            qualification_table.c.date_completion,
            qualification_table.c.etat_qualification,
            qualification_table.c.formateur_id,
            qualification_table.c.motif,
            formations_table.c.nom_formation,
            formations_table.c.duree_jours,
            formateurs_table.c.nom_formateur,
        )
        .select_from(
            collaborateurs_table
            .outerjoin(
                qualification_table,
                collaborateurs_table.c.matricule == qualification_table.c.matricule,
            )
            .outerjoin(formations_table, formations_table.c.id == qualification_table.c.formation_id)
            .outerjoin(formateurs_table, formateurs_table.c.id == qualification_table.c.formateur_id)
        )
        .order_by(
            collaborateurs_table.c.matricule.asc(),
            qualification_table.c.date_association_systeme.desc().nullslast(),
            qualification_table.c.date_completion.desc().nullslast(),
            qualification_table.c.id.desc().nullslast(),
        )
    )

    raw_rows = db.execute(stmt).mappings().all()
    collaborators_by_matricule: dict[str, dict] = {}

    for item in raw_rows:
        matricule = item["matricule"]
        current = collaborators_by_matricule.get(matricule)
        latest_activity_date = item["date_completion"] or item["date_association_systeme"]
        qualification_status = resolve_qualification_status(
            item["qualification_statut"],
            item["date_association_systeme"],
            item["duree_jours"],
            etat_qualification=item["etat_qualification"],
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
                "date_completion": serialize_date(item["date_completion"]),
                "statut": qualification_status,
                "etat": qualification_status,
                "formation_id": item["formation_id"],
                "formations": 0,
                "derniereFormation": serialize_date(latest_activity_date),
            }
            collaborators_by_matricule[matricule] = current

        if item["qualification_row_id"] is not None:
            current["formations"] += 1

    result = []
    for collaborator in collaborators_by_matricule.values():
        result.append(collaborator)
    return result


@router.post("/recalculate")
def recalculate_collaborateur_qualification_statuses(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    return recalculate_qualification_rows(db)


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
            qualification_table.c.date_completion,
            qualification_table.c.etat_qualification,
            qualification_table.c.score,
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
            "code": item["code_formation"] or str(item["formation_id"]),
            "titre": item["nom_formation"] or f"Formation {item['formation_id']}",
            "type": item["domaine"] or "Formation",
            "date": item["date_completion"].isoformat() if item["date_completion"] else (
                item["date_association_systeme"].isoformat() if item["date_association_systeme"] else None
            ),
            "duree": item["duree_jours"],
            "resultat": resolve_qualification_status(
                item["statut"],
                item["date_association_systeme"],
                item["duree_jours"],
                etat_qualification=item["etat_qualification"],
            ),
            "statut": item["statut"],
            "score": float(item["score"]) if item["score"] is not None else None,
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
    merged_columns: list[str] = []
    merged_mapping: dict[str, str] = {}
    file_errors: list[dict[str, str]] = []

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
                synonyms=get_excel_synonyms(),
            )
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Spreadsheet support dependencies are missing (openpyxl/xlrd)",
            ) from exc
        except Exception as exc:
            file_errors.append({"file": upload.filename or "", "error": f"Invalid upload file: {exc}"})
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

        if "competence" not in mapping_used:
            file_errors.append(
                {
                    "file": upload.filename or "",
                    "error": "This file contains collaborator data but no qualification column. Use the Collaborateurs Excel import instead.",
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

    conflicts = detect_collaborateur_conflicts(db, merged_rows)

    return {
        "columns_detected": merged_columns,
        "mapping_used": merged_mapping,
        "rows": build_preview_rows_with_live_status(db, merged_rows),
        "rows_count": len(merged_rows),
        "file_errors": file_errors,
        "conflicts": [conflict.model_dump() for conflict in conflicts],
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

    summary = import_qualification_rows(db, [row.model_dump() for row in payload.rows])
    return {"import_summary": summary}
