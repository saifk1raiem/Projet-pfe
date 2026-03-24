from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.services.extraction_mapper import DEFAULT_EXTRACTION_SYNONYMS

DEFAULT_EXCEL_SYNONYMS: dict[str, list[str]] = {
    field: list(aliases) for field, aliases in DEFAULT_EXTRACTION_SYNONYMS.items()
}
LEGACY_FIELD_MAP = {
    "fonction": "fonction_sap",
    "nomprenom": "full_name",
}

_SYNONYMS_FILE = Path(__file__).resolve().parents[2] / "data" / "excel_synonyms.json"


def _dedupe_aliases(values: list[str]) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()

    for value in values:
        clean = value.strip()
        if not clean:
            continue
        token = clean.casefold()
        if token in seen:
            continue
        seen.add(token)
        deduped.append(clean)

    return deduped


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

    for legacy_field, target_field in LEGACY_FIELD_MAP.items():
        raw_aliases = source.get(legacy_field, [])
        if not isinstance(raw_aliases, list):
            continue
        merged = [*sanitized.get(target_field, [])]
        for alias in raw_aliases:
            if isinstance(alias, str):
                merged.append(alias)
        sanitized[target_field] = _dedupe_aliases(merged)

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

