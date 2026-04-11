from __future__ import annotations

from datetime import date, datetime
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.collaborateur import Collaborateur
from app.models.collaborateur_risk import CollaborateurRisk
from app.models.history import History
from app.schemas.risk import CollaborateurRiskRow, RiskDriver, RiskScoreSummary


PREDICTION_HORIZON_DAYS = 14
INACTIVE_GAP_DAYS = 14
RECENT_ACTIVITY_DAYS = 7
MODEL_VERSION_PREFIX = "quit-risk-v1"


_cached_model: Any | None = None
_cached_feature_columns: list[str] | None = None
_cached_dataset_end: date | None = None
_cached_model_version: str | None = None


def _resolve_history_date(moin: str | None, jour: str | None, reference_date: date) -> date | None:
    if not moin or not jour:
        return None
    try:
        month = int(moin)
        day = int(jour)
    except (TypeError, ValueError):
        return None

    for year_offset in (0, -1):
        try:
            candidate = date(reference_date.year + year_offset, month, day)
        except ValueError:
            continue
        if candidate <= reference_date:
            return candidate

    try:
        return date(reference_date.year, month, day)
    except ValueError:
        return None


def _coerce_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)).date()
    except ValueError:
        return None


def _build_presence_dataframe(db: Session) -> pd.DataFrame:
    reference_date = date.today()
    rows = db.execute(
        select(
            History.matricule,
            History.nature,
            History.entree_sorie,
            History.heures_de_presences,
            History.motif,
            History.eff_mr,
            History.abs_p_par_per,
            History.abs_np_par,
            History.nbr_de_retard,
            History.heurs_sup,
            History.moin,
            History.jour,
            Collaborateur.nom,
            Collaborateur.prenom,
            Collaborateur.groupe,
            Collaborateur.fonction,
            Collaborateur.contre_maitre,
            Collaborateur.segment,
            Collaborateur.gender,
            Collaborateur.anciennete,
            Collaborateur.date_recrutement,
        ).join(Collaborateur, Collaborateur.matricule == History.matricule, isouter=True)
    ).mappings().all()

    payload: list[dict[str, Any]] = []
    for row in rows:
        snapshot_date = _resolve_history_date(row.get("moin"), row.get("jour"), reference_date)
        if snapshot_date is None:
            continue

        nom = row.get("nom") or ""
        prenom = row.get("prenom") or ""
        employee_name = " ".join([nom, prenom]).strip() or None

        anciennete = row.get("anciennete")
        if anciennete is None:
            recruit_date = _coerce_date(row.get("date_recrutement"))
            if recruit_date:
                anciennete = max(reference_date.year - recruit_date.year, 0)

        payload.append(
            {
                "employee_id": str(row.get("matricule") or "").strip(),
                "employee_name": employee_name,
                "group": row.get("groupe"),
                "function_sap": row.get("fonction"),
                "supervisor": row.get("contre_maitre"),
                "segment": row.get("segment"),
                "gender": row.get("gender"),
                "nature": row.get("nature"),
                "entry_exit": row.get("entree_sorie"),
                "presence_hours": row.get("heures_de_presences"),
                "motif": row.get("motif"),
                "eff_mr": row.get("eff_mr"),
                "abs_p_per": row.get("abs_p_par_per"),
                "abs_np": row.get("abs_np_par"),
                "hours_sup": row.get("heurs_sup"),
                "late_count": row.get("nbr_de_retard"),
                "date": snapshot_date,
                "anciennete_years": anciennete,
            }
        )

    if not payload:
        return pd.DataFrame()

    df = pd.DataFrame(payload)
    df = df[df["employee_id"].astype(str).str.len() > 0]
    df["date"] = pd.to_datetime(df["date"])
    return df


def trailing_streak(values: list[Any], predicate) -> int:
    streak = 0
    for value in reversed(values):
        if predicate(value):
            streak += 1
        else:
            break
    return streak


def build_feature_row(employee_history: pd.DataFrame, snapshot_date: pd.Timestamp) -> dict[str, Any]:
    history = employee_history.loc[employee_history["date"] <= snapshot_date].tail(14).copy()

    motifs = history["motif"].fillna("")
    hours = pd.to_numeric(history["presence_hours"], errors="coerce").fillna(0)
    late = pd.to_numeric(history["late_count"], errors="coerce").fillna(0)
    overtime = pd.to_numeric(history["hours_sup"], errors="coerce").fillna(0)
    abs_np = pd.to_numeric(history["abs_np"], errors="coerce").fillna(0)
    abs_p = pd.to_numeric(history["abs_p_per"], errors="coerce").fillna(0)
    mr = pd.to_numeric(history["eff_mr"], errors="coerce").fillna(0)

    first_row = employee_history.iloc[0]

    return {
        "employee_id": first_row["employee_id"],
        "employee_name": first_row["employee_name"],
        "group": first_row["group"],
        "function_sap": first_row["function_sap"],
        "supervisor": first_row["supervisor"],
        "segment": first_row["segment"],
        "gender": first_row["gender"],
        "nature": first_row["nature"],
        "anciennete_years": first_row["anciennete_years"],
        "snapshot_date": snapshot_date,
        "days_since_start": int((snapshot_date - employee_history["date"].min()).days),
        "history_days": int(len(history)),
        "hours_sum_14d": float(hours.sum()),
        "hours_mean_14d": float(hours.mean()) if len(hours) else 0.0,
        "zero_hour_days_14d": int((hours == 0).sum()),
        "low_hour_days_14d": int((hours <= 4).sum()),
        "overtime_sum_14d": float(overtime.sum()),
        "delay_count_14d": float(late.sum()),
        "abs_np_sum_14d": float(abs_np.sum()),
        "abs_p_sum_14d": float(abs_p.sum()),
        "mr_sum_14d": float(mr.sum()),
        "mise_en_demeure_days_14d": int((motifs == "Mise en demeure").sum()),
        "sans_questionnaire_days_14d": int((motifs == "Sans questionnaire").sum()),
        "conge_sans_solde_days_14d": int((motifs == "Conge sans solde").sum()),
        "absence_autorise_days_14d": int((motifs == "Absence Autorise").sum()),
        "maladie_prolongee_days_14d": int((motifs == "Maladie prolongee").sum()),
        "recent_zero_streak": int(trailing_streak(hours.tolist(), lambda x: x == 0)),
        "recent_mise_en_demeure_streak": int(
            trailing_streak(motifs.tolist(), lambda x: x == "Mise en demeure")
        ),
        "current_month": int(snapshot_date.month),
    }


def build_training_snapshots(
    data: pd.DataFrame,
    prediction_horizon_days: int = PREDICTION_HORIZON_DAYS,
    inactive_gap_days: int = INACTIVE_GAP_DAYS,
) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    if data.empty:
        return pd.DataFrame()

    dataset_end = data["date"].max()

    for _, employee_history in data.groupby("employee_id"):
        employee_history = employee_history.sort_values("date").copy()
        last_seen = employee_history["date"].max()
        entry_exit = employee_history["entry_exit"].fillna("").astype(str).str.casefold()
        explicit_exit_dates = set(employee_history.loc[entry_exit == "sortie", "date"])

        for snapshot_date in employee_history["date"]:
            future_limit = snapshot_date + pd.Timedelta(days=prediction_horizon_days)
            if future_limit > dataset_end - pd.Timedelta(days=inactive_gap_days):
                continue

            explicit_exit_soon = any(snapshot_date < d <= future_limit for d in explicit_exit_dates)
            disappears_within_horizon = last_seen <= future_limit
            inactivity_is_confirmed = last_seen <= dataset_end - pd.Timedelta(days=inactive_gap_days)

            row = build_feature_row(employee_history, snapshot_date)
            row["target_quit_14d"] = int(
                explicit_exit_soon or (disappears_within_horizon and inactivity_is_confirmed)
            )
            rows.append(row)

    return pd.DataFrame(rows)


def build_latest_snapshots(data: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    if data.empty:
        return pd.DataFrame()

    dataset_end = data["date"].max()

    for _, employee_history in data.groupby("employee_id"):
        employee_history = employee_history.sort_values("date").copy()
        rows.append(build_feature_row(employee_history, employee_history["date"].max()))

    latest = pd.DataFrame(rows)
    latest["days_since_last_seen"] = (dataset_end - latest["snapshot_date"]).dt.days
    latest["is_recently_active"] = latest["days_since_last_seen"] <= RECENT_ACTIVITY_DAYS
    return latest


def _train_model(snapshot_df: pd.DataFrame) -> tuple[Any | None, list[str]]:
    if snapshot_df.empty:
        return None, []

    feature_columns = [
        c
        for c in snapshot_df.columns
        if c not in {"employee_id", "employee_name", "snapshot_date", "target_quit_14d"}
    ]
    X = snapshot_df[feature_columns].copy()
    y = snapshot_df["target_quit_14d"].copy()

    if y.nunique() < 2:
        return None, feature_columns

    try:
        from sklearn.compose import ColumnTransformer
        from sklearn.impute import SimpleImputer
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import OneHotEncoder, StandardScaler
    except ImportError:
        return None, feature_columns

    numeric_features = X.select_dtypes(include=["number"]).columns.tolist()
    categorical_features = [c for c in X.columns if c not in numeric_features]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_features,
            ),
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_features,
            ),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=2000, class_weight="balanced")),
        ]
    )
    model.fit(X, y)
    return model, feature_columns


def _heuristic_scores(latest_df: pd.DataFrame) -> np.ndarray:
    if latest_df.empty:
        return np.array([])

    scores = (
        0.35 * np.clip(latest_df["zero_hour_days_14d"].fillna(0) / 5, 0, 1)
        + 0.25 * np.clip(latest_df["abs_np_sum_14d"].fillna(0) / 3, 0, 1)
        + 0.20 * np.clip(latest_df["mise_en_demeure_days_14d"].fillna(0) / 2, 0, 1)
        + 0.10 * np.clip(latest_df["delay_count_14d"].fillna(0) / 3, 0, 1)
        + 0.10 * np.clip((8 - latest_df["hours_mean_14d"].fillna(8)) / 8, 0, 1)
    )
    return np.clip(scores, 0, 1).to_numpy()


def _risk_bucket(prob: float) -> str:
    if prob >= 0.66:
        return "high"
    if prob >= 0.33:
        return "medium"
    return "low"


def _build_drivers(row: pd.Series) -> list[RiskDriver]:
    candidates: list[tuple[str, float, float]] = []

    def add(label: str, value: float | int | None, score: float) -> None:
        if value is None:
            return
        if isinstance(value, (int, float)) and value <= 0:
            return
        candidates.append((label, float(value), score))

    add("Mise en demeure (14j)", row.get("mise_en_demeure_days_14d"), row.get("mise_en_demeure_days_14d", 0) * 3)
    add("Absence NP (14j)", row.get("abs_np_sum_14d"), row.get("abs_np_sum_14d", 0) * 2.5)
    add("Zero heures (14j)", row.get("zero_hour_days_14d"), row.get("zero_hour_days_14d", 0) * 2)
    add("Retards (14j)", row.get("delay_count_14d"), row.get("delay_count_14d", 0) * 1.5)
    add("Heures sup (14j)", row.get("overtime_sum_14d"), row.get("overtime_sum_14d", 0) * 0.8)

    hours_mean = row.get("hours_mean_14d")
    if hours_mean is not None:
        try:
            hours_mean_value = float(hours_mean)
        except (TypeError, ValueError):
            hours_mean_value = None
        if hours_mean_value is not None and hours_mean_value < 6:
            candidates.append(("Heures moy. faibles", hours_mean_value, (6 - hours_mean_value) * 1.2))

    candidates.sort(key=lambda item: item[2], reverse=True)
    return [RiskDriver(label=label, value=value) for label, value, _ in candidates[:3]]


def _coerce_number(value: Any, cast):
    if value is None or pd.isna(value):
        return None
    try:
        return cast(value)
    except (TypeError, ValueError):
        return None


def _build_feature_snapshot(row: pd.Series) -> dict[str, float | int | None]:
    return {
        "recent_mise_en_demeure_streak": _coerce_number(row.get("recent_mise_en_demeure_streak"), int),
        "mise_en_demeure_days_14d": _coerce_number(row.get("mise_en_demeure_days_14d"), int),
        "abs_np_sum_14d": _coerce_number(row.get("abs_np_sum_14d"), float),
        "zero_hour_days_14d": _coerce_number(row.get("zero_hour_days_14d"), int),
        "hours_mean_14d": _coerce_number(row.get("hours_mean_14d"), float),
    }


def _ensure_model(
    data: pd.DataFrame,
    *,
    force_refresh: bool = False,
) -> tuple[Any | None, list[str], str, date | None]:
    global _cached_model, _cached_feature_columns, _cached_dataset_end, _cached_model_version

    if data.empty:
        return None, [], "heuristic-v1", None

    dataset_end = data["date"].max().date()
    if force_refresh:
        _cached_model = None
        _cached_feature_columns = None
        _cached_dataset_end = None
        _cached_model_version = None

    if _cached_model is not None and _cached_dataset_end == dataset_end and _cached_feature_columns:
        return _cached_model, _cached_feature_columns, _cached_model_version or "model-cache", dataset_end

    snapshot_df = build_training_snapshots(data)
    model, feature_columns = _train_model(snapshot_df)
    model_version = f"{MODEL_VERSION_PREFIX}-{dataset_end:%Y%m%d}"

    _cached_model = model
    _cached_feature_columns = feature_columns
    _cached_dataset_end = dataset_end
    _cached_model_version = model_version if model is not None else "heuristic-v1"

    return model, feature_columns, _cached_model_version, dataset_end


def score_all_risks(db: Session, *, force_refresh: bool = False) -> RiskScoreSummary:
    data = _build_presence_dataframe(db)
    if data.empty:
        return RiskScoreSummary()

    model, feature_columns, model_version, dataset_end = _ensure_model(data, force_refresh=force_refresh)
    latest_df = build_latest_snapshots(data)

    if model is not None and feature_columns:
        scores = model.predict_proba(latest_df[feature_columns])[:, 1]
    else:
        scores = _heuristic_scores(latest_df)
        model_version = "heuristic-v1"

    latest_df = latest_df.copy()
    latest_df["quit_risk_probability"] = scores
    latest_df["risk_bucket"] = latest_df["quit_risk_probability"].apply(_risk_bucket)

    existing = {
        row.matricule: row
        for row in db.execute(
            select(CollaborateurRisk).where(CollaborateurRisk.matricule.in_(latest_df["employee_id"].tolist()))
        ).scalars().all()
    }

    inserted = 0
    updated = 0
    for _, row in latest_df.iterrows():
        matricule = str(row["employee_id"])
        drivers = _build_drivers(row)
        payload = {
            "prob_leave": float(row["quit_risk_probability"]),
            "risk_bucket": row["risk_bucket"],
            "model_version": model_version,
            "drivers": [driver.model_dump() for driver in drivers],
            "feature_snapshot": _build_feature_snapshot(row),
            "days_since_last_seen": int(row.get("days_since_last_seen") or 0),
            "is_recently_active": bool(row.get("is_recently_active")),
        }

        record = existing.get(matricule)
        if record is None:
            db.add(CollaborateurRisk(matricule=matricule, **payload))
            inserted += 1
            continue

        for field, value in payload.items():
            setattr(record, field, value)
        record.scored_at = datetime.utcnow()
        updated += 1

    db.commit()

    return RiskScoreSummary(
        rows_processed=len(latest_df),
        rows_inserted=inserted,
        rows_updated=updated,
        model_version=model_version,
        dataset_end=dataset_end.isoformat() if dataset_end else None,
    )


def list_risks(
    db: Session,
    *,
    limit: int = 15,
    bucket: str | None = None,
    recent_only: bool | None = None,
) -> list[CollaborateurRiskRow]:
    if limit <= 0:
        return []

    existing_count = db.query(CollaborateurRisk).count()
    if existing_count == 0:
        score_all_risks(db)
    else:
        missing_snapshot = (
            db.query(CollaborateurRisk.id)
            .filter(CollaborateurRisk.feature_snapshot.is_(None))
            .limit(1)
            .first()
        )
        if missing_snapshot:
            score_all_risks(db)

    query = select(
        CollaborateurRisk.matricule,
        CollaborateurRisk.prob_leave,
        CollaborateurRisk.risk_bucket,
        CollaborateurRisk.model_version,
        CollaborateurRisk.scored_at,
        CollaborateurRisk.drivers,
        CollaborateurRisk.feature_snapshot,
        CollaborateurRisk.days_since_last_seen,
        CollaborateurRisk.is_recently_active,
        Collaborateur.nom,
        Collaborateur.prenom,
        Collaborateur.groupe,
        Collaborateur.segment,
    ).join(Collaborateur, Collaborateur.matricule == CollaborateurRisk.matricule, isouter=True)
    if bucket in {"low", "medium", "high"}:
        query = query.where(CollaborateurRisk.risk_bucket == bucket)
    if recent_only is True:
        query = query.where(CollaborateurRisk.is_recently_active.is_(True))
    query = query.order_by(CollaborateurRisk.prob_leave.desc()).limit(limit)

    rows: list[CollaborateurRiskRow] = []
    for item in db.execute(query).mappings().all():
        rows.append(
            CollaborateurRiskRow(
                matricule=item["matricule"],
                nom=item.get("nom"),
                prenom=item.get("prenom"),
                groupe=item.get("groupe"),
                segment=item.get("segment"),
                prob_leave=float(item["prob_leave"]),
                risk_bucket=item["risk_bucket"],
                scored_at=item.get("scored_at"),
                model_version=item.get("model_version"),
                drivers=[RiskDriver.model_validate(driver) for driver in (item.get("drivers") or [])],
                feature_snapshot=item.get("feature_snapshot"),
                days_since_last_seen=item.get("days_since_last_seen"),
                is_recently_active=item.get("is_recently_active"),
            )
        )

    return rows


def get_risk_for_matricule(
    db: Session,
    matricule: str,
    *,
    refresh: bool = False,
) -> CollaborateurRiskRow | None:
    if refresh:
        score_all_risks(db, force_refresh=True)

    query = select(
        CollaborateurRisk.matricule,
        CollaborateurRisk.prob_leave,
        CollaborateurRisk.risk_bucket,
        CollaborateurRisk.model_version,
        CollaborateurRisk.scored_at,
        CollaborateurRisk.drivers,
        CollaborateurRisk.feature_snapshot,
        CollaborateurRisk.days_since_last_seen,
        CollaborateurRisk.is_recently_active,
        Collaborateur.nom,
        Collaborateur.prenom,
        Collaborateur.groupe,
        Collaborateur.segment,
    ).join(Collaborateur, Collaborateur.matricule == CollaborateurRisk.matricule, isouter=True)
    query = query.where(CollaborateurRisk.matricule == matricule)

    item = db.execute(query).mappings().first()
    if not item:
        return None

    return CollaborateurRiskRow(
        matricule=item["matricule"],
        nom=item.get("nom"),
        prenom=item.get("prenom"),
        groupe=item.get("groupe"),
        segment=item.get("segment"),
        prob_leave=float(item["prob_leave"]),
        risk_bucket=item["risk_bucket"],
        scored_at=item.get("scored_at"),
        model_version=item.get("model_version"),
        drivers=[RiskDriver.model_validate(driver) for driver in (item.get("drivers") or [])],
        feature_snapshot=item.get("feature_snapshot"),
        days_since_last_seen=item.get("days_since_last_seen"),
        is_recently_active=item.get("is_recently_active"),
    )
