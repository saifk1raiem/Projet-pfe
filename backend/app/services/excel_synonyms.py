from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DEFAULT_EXCEL_SYNONYMS: dict[str, list[str]] = {
    "matricule": ["matricule", "mat", "id", "code", "Plugins - matricule", "emp_id"],
    "nom": ["nom", "Plugins - name", "surname", "family_name"],
    "prenom": ["prenom", "first_name", "Plugins - first name"],
    "nomprenom": [
        "nom_prenom",
        "nom_&_prenom",
        "nom_prenom2",
        "collaborateur_nom_&_prenom",
        "collaborateur_nom_prenom",
    ],
    "fonction": ["fonction", "job", "role", "position", "Fonction SAP"],
    "centre_cout": ["centre_cout", "cc", "cost_center", "costcentre"],
    "groupe": ["groupe", "group", "gr"],
    "competence": ["competence", "skill", "qualification", "competency"],
    "contre_maitre": ["contre_maitre", "supervisor", "Contre maitre", "team_lead", "Rh seg"],
    "segment": ["segment", "department", "division", "seg"],
    "num_tel": ["num_tel", "telephone", "phone", "tel", "num tel"],
    "date_recrutement": [
        "date_recrutement",
        "Date recrutement",
        "date_embauche",
        "recruitment_date",
        "date_entree",
        "date_dentree",
        "date_d'association",
        "date_association",
    ],
    "anciennete": ["anciennete", "seniority", "years", "years_of_service"],
    "etat": ["etat", "status", "Niveau de formation", "qualification_status", "etat_qualifie", "etatqualifies"],
}

_SYNONYMS_FILE = Path(__file__).resolve().parents[2] / "data" / "excel_synonyms.json"


def _sanitize_synonyms(payload: Any) -> dict[str, list[str]]:
    sanitized: dict[str, list[str]] = {}
    source = payload if isinstance(payload, dict) else {}

    for field, defaults in DEFAULT_EXCEL_SYNONYMS.items():
        raw_aliases = source.get(field, defaults)
        aliases: list[str] = []
        if isinstance(raw_aliases, list):
            for alias in raw_aliases:
                if not isinstance(alias, str):
                    continue
                clean = alias.strip()
                if clean and clean not in aliases:
                    aliases.append(clean)
        if not aliases:
            aliases = list(defaults)
        sanitized[field] = aliases
    return sanitized


def get_excel_synonyms() -> dict[str, list[str]]:
    if not _SYNONYMS_FILE.exists():
        return _sanitize_synonyms(DEFAULT_EXCEL_SYNONYMS)

    try:
        payload = json.loads(_SYNONYMS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return _sanitize_synonyms(DEFAULT_EXCEL_SYNONYMS)
    return _sanitize_synonyms(payload)


def save_excel_synonyms(payload: dict[str, list[str]]) -> dict[str, list[str]]:
    sanitized = _sanitize_synonyms(payload)
    _SYNONYMS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _SYNONYMS_FILE.write_text(json.dumps(sanitized, ensure_ascii=True, indent=2), encoding="utf-8")
    return sanitized

