from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RiskDriver(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    value: float | int | str | None = None


class CollaborateurRiskRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    matricule: str
    nom: str | None = None
    prenom: str | None = None
    groupe: str | None = None
    segment: str | None = None
    prob_leave: float
    risk_bucket: Literal["low", "medium", "high"]
    scored_at: datetime | None = None
    model_version: str | None = None
    drivers: list[RiskDriver] = Field(default_factory=list)
    feature_snapshot: dict[str, float | int | None] | None = None
    days_since_last_seen: int | None = None
    is_recently_active: bool | None = None


class RiskScoreSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rows_processed: int = 0
    rows_inserted: int = 0
    rows_updated: int = 0
    model_version: str | None = None
    dataset_end: str | None = None
