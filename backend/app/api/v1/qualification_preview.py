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
    merge_qualification_rows,
    qualification_table,
    recalculate_qualification_rows,
    resolve_qualification_status,
)
from app.utils.qualification_preview import SUPPORTED_UPLOAD_EXTENSIONS, parse_excel_to_rows


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
            normalized_status = "En cours"

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
        aliases.append(("matricule", matricule))

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


def _merge_supplemental_row(existing: dict, incoming: dict) -> dict:
    merged = dict(existing)
    existing_date = _preview_date(existing.get("date_association_systeme"))
    incoming_date = _preview_date(incoming.get("date_association_systeme"))

    for field in SUPPLEMENTAL_QUALIFICATION_FIELDS:
        if _is_blank_preview_value(merged.get(field)) and not _is_blank_preview_value(incoming.get(field)):
            merged[field] = incoming.get(field)

    incoming_motif = incoming.get("motif")
    if not _is_blank_preview_value(incoming_motif):
        existing_motif = merged.get("motif")
        if _is_blank_preview_value(existing_motif):
            merged["motif"] = incoming_motif
        elif incoming_date and (existing_date is None or incoming_date >= existing_date):
            merged["motif"] = incoming_motif

    if incoming_date and (existing_date is None or incoming_date >= existing_date):
        merged["date_association_systeme"] = incoming.get("date_association_systeme")

    return merged


def _merge_supplemental_rows(rows: list[dict]) -> list[dict]:
    merged_rows: list[dict | None] = []
    alias_to_index: dict[tuple[str, ...], int] = {}

    for row in rows:
        aliases = _qualification_identity_aliases(row)
        if not aliases:
            continue

        matched_indexes = sorted({alias_to_index[alias] for alias in aliases if alias in alias_to_index})
        if not matched_indexes:
            target_index = len(merged_rows)
            merged_rows.append(dict(row))
        else:
            target_index = matched_indexes[0]
            combined_row = merged_rows[target_index] or {}

            for other_index in matched_indexes[1:]:
                other_row = merged_rows[other_index]
                if other_row is None:
                    continue
                combined_row = _merge_supplemental_row(combined_row, other_row)
                for alias in _qualification_identity_aliases(other_row):
                    alias_to_index[alias] = target_index
                merged_rows[other_index] = None

            merged_rows[target_index] = _merge_supplemental_row(combined_row, row)

        current_row = merged_rows[target_index]
        if current_row is None:
            continue

        for alias in _qualification_identity_aliases(current_row):
            alias_to_index[alias] = target_index

    return [row for row in merged_rows if row is not None]


def _enrich_qualification_rows(
    qualification_rows: list[dict],
    supplemental_rows: list[dict],
) -> list[dict]:
    if not qualification_rows or not supplemental_rows:
        return qualification_rows

    merged_supplemental_rows = _merge_supplemental_rows(supplemental_rows)
    supplemental_by_alias: dict[tuple[str, ...], dict] = {}

    for row in merged_supplemental_rows:
        for alias in _qualification_identity_aliases(row):
            supplemental_by_alias[alias] = row

    enriched_rows: list[dict] = []
    for row in qualification_rows:
        supplement = next(
            (supplemental_by_alias[alias] for alias in _qualification_identity_aliases(row) if alias in supplemental_by_alias),
            None,
        )
        if not supplement:
            enriched_rows.append(row)
            continue

        enriched_row = dict(row)
        for field in SUPPLEMENTAL_QUALIFICATION_FIELDS:
            if _is_blank_preview_value(enriched_row.get(field)) and not _is_blank_preview_value(supplement.get(field)):
                enriched_row[field] = supplement.get(field)
        enriched_rows.append(enriched_row)

    return enriched_rows


def _fetch_qualification_listing_rows(db: Session):
    stmt = (
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
            qualification_table.c.etat_qualification,
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
        .order_by(
            qualification_table.c.date_association_systeme.desc().nullslast(),
            qualification_table.c.id.desc().nullslast(),
            collaborateurs_table.c.matricule.asc(),
        )
    )
    return db.execute(stmt).mappings().all()


@router.get("")
def list_qualification_rows(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    raw_rows = _fetch_qualification_listing_rows(db)
    result: list[dict] = []
    for item in raw_rows:
        qualification_status = resolve_qualification_status(
            item["qualification_statut"],
            item["date_association_systeme"],
            item["duree_jours"],
            etat_qualification=item["etat_qualification"],
        )
        result.append(
            {
                "id": item["qualification_row_id"],
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
                "formations": 1,
                "derniereFormation": serialize_date(item["date_association_systeme"]),
            }
        )
    return result


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
                "statut": qualification_status,
                "etat": qualification_status,
                "formation_id": item["formation_id"],
                "formations": 0,
                "derniereFormation": serialize_date(latest_activity_date),
            }
            collaborators_by_matricule[matricule] = current

        if item["qualification_row_id"] is not None:
            current["formations"] += 1

    return list(collaborators_by_matricule.values())


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
            qualification_table.c.etat_qualification,
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
            "date": item["date_association_systeme"].isoformat() if item["date_association_systeme"] else None,
            "duree": item["duree_jours"],
            "resultat": resolve_qualification_status(
                item["statut"],
                item["date_association_systeme"],
                item["duree_jours"],
                etat_qualification=item["etat_qualification"],
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

        merged_rows.extend([row for row in rows if row.get("formation_id") not in (None, "")])

    if supplemental_only_messages and not merged_rows:
        file_errors.extend(supplemental_only_messages)

    if file_errors and not merged_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "No valid files to preview", "file_errors": file_errors},
        )

    merged_rows = merge_qualification_rows(merged_rows)
    merged_rows = _enrich_qualification_rows(merged_rows, supplemental_rows)
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
