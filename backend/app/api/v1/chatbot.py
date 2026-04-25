import re
import unicodedata
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.api.v1.dashboard import (
    _build_dashboard_charts,
    _build_dashboard_metrics,
    _load_dashboard_context,
)
from app.models.enums import UserRole
from app.models.history import History
from app.models.user import User
from app.services.qualification_import_service import (
    collaborateurs_table,
    formateurs_table,
    formations_table,
    qualification_table,
    resolve_qualification_status,
)


router = APIRouter(prefix="/chatbot", tags=["chatbot"])

HELP_MESSAGE = (
    "Je peux repondre avec les donnees de la base. Exemples: "
    "\"combien de collaborateurs\", \"stats\", \"repartition par statut\", "
    "\"top formations\", \"top formateurs\", \"collaborateur 12345\", "
    "\"formations du matricule 12345\", \"collaborateurs en depassement\", "
    "\"repartition par segment\", \"heures de presence\"."
)


class ChatbotMessageRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class ChatbotMessageResponse(BaseModel):
    reply: str


def _normalize_message(message: str) -> str:
    normalized = unicodedata.normalize("NFKD", message.casefold())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def _contains_any(text: str, words: tuple[str, ...]) -> bool:
    return any(word in text for word in words)


def _format_number(value: float | int | None) -> str:
    if value is None:
        return "0"
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return f"{value:,}".replace(",", " ")


def _format_trend(value: float | int | None) -> str:
    if value is None:
        return ""
    sign = "+" if value > 0 else ""
    return f" ({sign}{value}% vs periode precedente)"


def _format_distribution(rows: list[dict], *, label_key: str = "label", value_key: str = "value") -> str:
    if not rows:
        return "aucune donnee"
    return ", ".join(
        f"{row.get(label_key) or 'Non renseigne'}: {_format_number(row.get(value_key, 0))}"
        for row in rows
    )


def _format_date(value: Any) -> str:
    if value is None:
        return "-"
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _clean_text(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def _extract_matricule(text: str) -> str | None:
    match = re.search(r"\b\d{2,20}\b", text)
    return match.group(0) if match else None


def _extract_limit(text: str, default: int = 5, maximum: int = 20) -> int:
    match = re.search(r"\b(?:top|first|premier|premiere|liste|affiche)\s+(\d{1,2})\b", text)
    if not match:
        return default
    return max(1, min(int(match.group(1)), maximum))


def _status_from_text(text: str) -> str | None:
    if "depassement" in text or "overdue" in text:
        return "Depassement"
    if "en cours" in text or "ongoing" in text:
        return "En cours"
    if "qualifie" in text or "qualifies" in text:
        return "Qualifie"
    if "non associe" in text or "not associated" in text:
        return "Non associee"
    return None


def _build_database_stats(db: Session) -> dict:
    today = date.today()
    context = _load_dashboard_context(db)
    metrics = _build_dashboard_metrics(context, today=today).model_dump(mode="json")
    charts = _build_dashboard_charts(context, today=today).model_dump(mode="json")

    total_formations = db.execute(select(func.count()).select_from(formations_table)).scalar_one()
    total_formateurs = db.execute(select(func.count()).select_from(formateurs_table)).scalar_one()
    total_qualifications = db.execute(select(func.count()).select_from(qualification_table)).scalar_one()

    top_formations = [
        {
            "formation_id": row["formation_id"],
            "formation": row["formation"],
            "collaborateurs": row["collaborateurs"],
        }
        for row in db.execute(
            select(
                formations_table.c.id.label("formation_id"),
                formations_table.c.nom_formation.label("formation"),
                func.count(qualification_table.c.id).label("collaborateurs"),
            )
            .select_from(
                formations_table.outerjoin(
                    qualification_table,
                    qualification_table.c.formation_id == formations_table.c.id,
                )
            )
            .group_by(formations_table.c.id, formations_table.c.nom_formation)
            .order_by(func.count(qualification_table.c.id).desc(), formations_table.c.nom_formation.asc())
            .limit(10)
        ).mappings().all()
    ]

    top_formateurs = [
        {
            "formateur_id": row["formateur_id"],
            "formateur": row["formateur"],
            "collaborateurs": row["collaborateurs"],
        }
        for row in db.execute(
            select(
                formateurs_table.c.id.label("formateur_id"),
                formateurs_table.c.nom_formateur.label("formateur"),
                func.count(qualification_table.c.id).label("collaborateurs"),
            )
            .select_from(
                formateurs_table.outerjoin(
                    qualification_table,
                    qualification_table.c.formateur_id == formateurs_table.c.id,
                )
            )
            .group_by(formateurs_table.c.id, formateurs_table.c.nom_formateur)
            .order_by(func.count(qualification_table.c.id).desc(), formateurs_table.c.nom_formateur.asc())
            .limit(10)
        ).mappings().all()
    ]

    return {
        "generated_at": today.isoformat(),
        "metrics": metrics,
        "charts": charts,
        "totals": {
            "collaborateurs": metrics["total_collaborateurs"]["value"],
            "formations": total_formations,
            "formateurs": total_formateurs,
            "qualifications": total_qualifications,
        },
        "top_formations_by_collaborateurs": top_formations,
        "top_formateurs_by_collaborateurs": top_formateurs,
    }


def _distribution_for_column(db: Session, column: Any) -> list[dict]:
    rows = db.execute(
        select(
            func.coalesce(func.nullif(column, ""), "Non renseigne").label("label"),
            func.count().label("value"),
        )
        .select_from(collaborateurs_table)
        .group_by(func.coalesce(func.nullif(column, ""), "Non renseigne"))
        .order_by(func.count().desc(), "label")
        .limit(10)
    ).mappings().all()
    return [{"label": row["label"], "value": row["value"]} for row in rows]


def _status_distribution(stats: dict) -> list[dict]:
    return stats["charts"]["qualification_status_distribution"]


def _status_count(stats: dict, status_name: str) -> int:
    return next((row["value"] for row in _status_distribution(stats) if row["label"] == status_name), 0)


def _collaborator_lookup(db: Session, user_message: str) -> str | None:
    text = _normalize_message(user_message)
    matricule = _extract_matricule(text)
    if not matricule and not _contains_any(text, ("collaborateur", "collab", "employee", "matricule")):
        return None

    row = None
    if matricule:
        row = db.execute(
            select(collaborateurs_table).where(collaborateurs_table.c.matricule == matricule)
        ).mappings().first()

    if row is None and _contains_any(text, ("collaborateur", "collab", "employee")):
        query_text = re.sub(r"\b(collaborateur|collab|employee|info|details?|detail|sur|de|du|la|le)\b", " ", text)
        query_text = re.sub(r"\b\d{2,20}\b", " ", query_text)
        query_text = _clean_text(query_text)
        if len(query_text) >= 2:
            like_value = f"%{query_text}%"
            row = db.execute(
                select(collaborateurs_table)
                .where(
                    or_(
                        func.lower(collaborateurs_table.c.nom).like(like_value),
                        func.lower(collaborateurs_table.c.prenom).like(like_value),
                        func.lower(
                            func.concat(collaborateurs_table.c.prenom, " ", collaborateurs_table.c.nom)
                        ).like(like_value),
                        func.lower(
                            func.concat(collaborateurs_table.c.nom, " ", collaborateurs_table.c.prenom)
                        ).like(like_value),
                    )
                )
                .order_by(collaborateurs_table.c.nom.asc(), collaborateurs_table.c.prenom.asc())
            ).mappings().first()

    if row is None:
        return f"Je n'ai pas trouve ce collaborateur. {HELP_MESSAGE}" if matricule else None

    formations = _collaborator_formations(db, row["matricule"], as_sentence=False)
    formation_part = f" Formations: {formations}." if formations else ""
    return (
        f"{row['prenom']} {row['nom']} ({row['matricule']}) - "
        f"fonction: {row.get('fonction') or '-'}, segment: {row.get('segment') or '-'}, "
        f"groupe: {row.get('groupe') or '-'}, centre cout: {row.get('centre_cout') or '-'}, "
        f"date recrutement: {_format_date(row.get('date_recrutement'))}."
        f"{formation_part}"
    )


def _collaborator_formations(db: Session, matricule: str, *, as_sentence: bool = True) -> str | None:
    rows = db.execute(
        select(
            qualification_table.c.statut,
            qualification_table.c.date_association_systeme,
            formations_table.c.nom_formation,
            formations_table.c.code_formation,
            formations_table.c.duree_jours,
            formateurs_table.c.nom_formateur,
        )
        .select_from(
            qualification_table.outerjoin(
                formations_table,
                formations_table.c.id == qualification_table.c.formation_id,
            ).outerjoin(
                formateurs_table,
                formateurs_table.c.id == qualification_table.c.formateur_id,
            )
        )
        .where(qualification_table.c.matricule == matricule)
        .order_by(qualification_table.c.date_association_systeme.desc().nullslast(), qualification_table.c.id.desc())
    ).mappings().all()

    items = []
    for row in rows:
        status = resolve_qualification_status(
            row["statut"],
            row["date_association_systeme"],
            row["duree_jours"],
        )
        label = row["nom_formation"] or row["code_formation"] or "Formation non renseignee"
        trainer = f", formateur {row['nom_formateur']}" if row["nom_formateur"] else ""
        items.append(f"{label} ({status}{trainer})")

    if not items:
        return f"Aucune formation trouvee pour le matricule {matricule}." if as_sentence else None

    value = "; ".join(items[:10])
    if len(items) > 10:
        value += f"; +{len(items) - 10} autres"
    return f"Formations du matricule {matricule}: {value}." if as_sentence else value


def _answer_collaborator_formations(db: Session, user_message: str) -> str | None:
    text = _normalize_message(user_message)
    if not _contains_any(text, ("formation", "formations")):
        return None
    if not _contains_any(text, ("matricule", "collaborateur", "collab", "employee")):
        return None
    matricule = _extract_matricule(text)
    if not matricule:
        return "Donne-moi le matricule pour afficher ses formations."
    return _collaborator_formations(db, matricule)


def _answer_collaborators_by_status(db: Session, user_message: str, stats: dict) -> str | None:
    text = _normalize_message(user_message)
    if not _contains_any(text, ("collaborateur", "collaborateurs", "collab", "employees")):
        return None
    status_name = _status_from_text(text)
    if status_name is None:
        return None

    if "liste" not in text and "affiche" not in text and "qui" not in text:
        return f"Il y a {_format_number(_status_count(stats, status_name))} collaborateurs avec le statut {status_name}."

    limit = _extract_limit(text, default=10)
    context = _load_dashboard_context(db)
    status_by_matricule: dict[str, str] = {}
    for qualification in context.qualifications:
        status = resolve_qualification_status(
            qualification.statut,
            qualification.association_date,
            qualification.duration_days,
        )
        current = status_by_matricule.get(qualification.matricule)
        if current is None or current == "Non associee":
            status_by_matricule[qualification.matricule] = status

    matched_matricules = [
        matricule
        for matricule, resolved_status in status_by_matricule.items()
        if resolved_status == status_name
    ]

    if status_name == "Non associee":
        with_qualification = set(status_by_matricule)
        all_matricules = set(db.execute(select(collaborateurs_table.c.matricule)).scalars().all())
        matched_matricules.extend(sorted(all_matricules - with_qualification))

    if not matched_matricules:
        return f"Aucun collaborateur trouve avec le statut {status_name}."

    rows = db.execute(
        select(
            collaborateurs_table.c.matricule,
            collaborateurs_table.c.nom,
            collaborateurs_table.c.prenom,
        )
        .where(collaborateurs_table.c.matricule.in_(matched_matricules[:limit]))
        .order_by(collaborateurs_table.c.nom.asc(), collaborateurs_table.c.prenom.asc())
    ).mappings().all()
    names = ", ".join(f"{row['prenom']} {row['nom']} ({row['matricule']})" for row in rows)
    extra = len(matched_matricules) - len(rows)
    suffix = f" et {_format_number(extra)} autres" if extra > 0 else ""
    return f"Collaborateurs {status_name}: {names}{suffix}."


def _answer_formation_lookup(db: Session, user_message: str) -> str | None:
    text = _normalize_message(user_message)
    if not _contains_any(text, ("formation", "formations")):
        return None
    if _contains_any(text, ("combien", "nombre", "total", "top", "stat", "en cours")):
        return None

    match = re.search(r"\bformation\s+(.+)$", text)
    term = _clean_text(match.group(1) if match else "")
    term = re.sub(r"\b(info|details?|sur|de|du|la|le)\b", " ", term).strip()
    if len(term) < 2:
        return None

    like_value = f"%{term}%"
    row = db.execute(
        select(
            formations_table.c.id,
            formations_table.c.code_formation,
            formations_table.c.nom_formation,
            formations_table.c.domaine,
            formations_table.c.duree_jours,
            func.count(qualification_table.c.id).label("collaborateurs"),
        )
        .select_from(
            formations_table.outerjoin(
                qualification_table,
                qualification_table.c.formation_id == formations_table.c.id,
            )
        )
        .where(
            or_(
                func.lower(formations_table.c.nom_formation).like(like_value),
                func.lower(formations_table.c.code_formation).like(like_value),
            )
        )
        .group_by(
            formations_table.c.id,
            formations_table.c.code_formation,
            formations_table.c.nom_formation,
            formations_table.c.domaine,
            formations_table.c.duree_jours,
        )
        .order_by(func.count(qualification_table.c.id).desc(), formations_table.c.nom_formation.asc())
    ).mappings().first()

    if not row:
        return f"Je n'ai pas trouve de formation pour \"{term}\"."

    return (
        f"Formation {row['nom_formation']} ({row['code_formation']}) - "
        f"domaine: {row['domaine'] or '-'}, duree: {row['duree_jours'] or '-'} jours, "
        f"collaborateurs associes: {_format_number(row['collaborateurs'])}."
    )


def _answer_history_stats(db: Session, user_message: str) -> str | None:
    text = _normalize_message(user_message)
    if not _contains_any(text, ("presence", "absence", "retard", "heures", "history", "historique")):
        return None

    matricule = _extract_matricule(text)
    conditions = []
    if matricule:
        conditions.append(History.matricule == matricule)

    stmt = select(
        func.coalesce(func.sum(History.heures_de_presences), 0).label("presence_hours"),
        func.coalesce(func.sum(History.abs_p_par_per), 0).label("absences_payees"),
        func.coalesce(func.sum(History.abs_np_par), 0).label("absences_non_payees"),
        func.coalesce(func.sum(History.nbr_de_retard), 0).label("retards"),
        func.coalesce(func.sum(History.heurs_sup), 0).label("heures_sup"),
        func.count(History.id).label("rows_count"),
    ).select_from(History)
    if conditions:
        stmt = stmt.where(*conditions)

    row = db.execute(stmt).mappings().one()
    scope = f" pour le matricule {matricule}" if matricule else ""
    if row["rows_count"] == 0:
        return f"Aucune donnee d'historique trouvee{scope}."

    return (
        f"Historique{scope}: {_format_number(row['presence_hours'])} heures de presence, "
        f"{_format_number(row['retards'])} retards, "
        f"{_format_number(row['absences_payees'])} absences payees, "
        f"{_format_number(row['absences_non_payees'])} absences non payees, "
        f"{_format_number(row['heures_sup'])} heures supplementaires."
    )


def _answer_known_stat_question(db: Session, user_message: str, stats: dict) -> str | None:
    text = _normalize_message(user_message)
    metrics = stats["metrics"]
    charts = stats["charts"]
    totals = stats["totals"]

    asks_for_count = _contains_any(text, ("combien", "nombre", "total", "count", "how many"))
    asks_for_stats = _contains_any(text, ("stat", "statistique", "metric", "kpi", "dashboard", "resume"))
    asks_for_distribution = _contains_any(text, ("repartition", "distribution", "par statut", "by status"))
    asks_for_known_stat = asks_for_count or asks_for_stats or asks_for_distribution

    if _contains_any(text, ("aide", "help", "exemple", "question", "questions")):
        return HELP_MESSAGE

    if _contains_any(text, ("bonjour", "salut", "hello", "hi")):
        return f"Bonjour. {HELP_MESSAGE}"

    if asks_for_count and _contains_any(text, ("collaborateur", "collaborateurs", "employee", "employees", "personnel")):
        metric = metrics["total_collaborateurs"]
        return (
            f"Il y a {_format_number(metric['value'])} collaborateurs dans la base"
            f"{_format_trend(metric.get('trend'))}."
        )

    if asks_for_count and _contains_any(text, ("formation", "formations")):
        if _contains_any(text, ("en cours", "ongoing", "active")):
            metric = metrics["formations_en_cours"]
            return (
                f"Il y a {_format_number(metric['value'])} formations en cours"
                f"{_format_trend(metric.get('trend'))}."
            )
        return f"Il y a {_format_number(totals['formations'])} formations dans la base."

    if asks_for_count and _contains_any(text, ("qualification", "qualifications")):
        return f"Il y a {_format_number(totals['qualifications'])} lignes de qualification dans la base."

    if asks_for_count and _contains_any(text, ("formateur", "formateurs", "trainer", "trainers")):
        if _contains_any(text, ("disponible", "available")):
            metric = metrics["formateurs_disponibles"]
            return (
                f"Il y a {_format_number(metric['value'])} formateurs disponibles"
                f"{_format_trend(metric.get('trend'))}."
            )
        return f"Il y a {_format_number(totals['formateurs'])} formateurs dans la base."

    if asks_for_known_stat and _contains_any(
        text,
        ("statut", "status", "qualification", "qualifie", "qualifies", "en cours", "depassement", "non associe"),
    ):
        status_name = _status_from_text(text)
        if asks_for_count and status_name:
            label = "collaborateurs" if status_name in {"Qualifie", "Non associee"} else "qualifications"
            return f"Il y a {_format_number(_status_count(stats, status_name))} {label} {status_name} dans la base."
        return f"Repartition des statuts de qualification: {_format_distribution(_status_distribution(stats))}."

    if _contains_any(text, ("centre cout", "centre de cout", "cost center")):
        return f"Repartition par centre de cout: {_format_distribution(charts['centre_cout_distribution'])}."

    if _contains_any(text, ("segment", "segments")):
        rows = _distribution_for_column(db, collaborateurs_table.c.segment)
        return f"Repartition par segment: {_format_distribution(rows)}."

    if _contains_any(text, ("groupe", "groupes", "group")):
        rows = _distribution_for_column(db, collaborateurs_table.c.groupe)
        return f"Repartition par groupe: {_format_distribution(rows)}."

    if _contains_any(text, ("fonction", "poste", "job")):
        rows = _distribution_for_column(db, collaborateurs_table.c.fonction)
        return f"Repartition par fonction: {_format_distribution(rows)}."

    if _contains_any(text, ("top formation", "formation plus", "formations plus", "meilleure formation")):
        limit = _extract_limit(text, default=5)
        rows = stats["top_formations_by_collaborateurs"][:limit]
        return f"Top formations par collaborateurs: {_format_distribution(rows, label_key='formation', value_key='collaborateurs')}."

    if _contains_any(text, ("top formateur", "formateur plus", "formateurs plus", "meilleur formateur")):
        limit = _extract_limit(text, default=5)
        rows = stats["top_formateurs_by_collaborateurs"][:limit]
        return f"Top formateurs par collaborateurs: {_format_distribution(rows, label_key='formateur', value_key='collaborateurs')}."

    if _contains_any(text, ("recrue", "recrues", "entry", "entries", "entree", "entrees")):
        metric = metrics["nouvelles_recrues"]
        return (
            f"Il y a {_format_number(metric['value'])} nouvelles recrues sur la periode courante"
            f"{_format_trend(metric.get('trend'))}."
        )

    if _contains_any(text, ("sortie", "sorties", "exit", "exits")):
        metric = metrics["sorties"]
        return (
            f"Il y a {_format_number(metric['value'])} sorties sur la periode courante"
            f"{_format_trend(metric.get('trend'))}."
        )

    if _contains_any(text, ("taux presence", "presence rate", "on track")):
        metric = metrics["taux_presence"]
        return f"Le taux de presence est {_format_number(metric['value'])}%{_format_trend(metric.get('trend'))}."

    if asks_for_stats:
        return (
            "Voici les stats actuelles de la base: "
            f"{_format_number(totals['collaborateurs'])} collaborateurs, "
            f"{_format_number(totals['formations'])} formations, "
            f"{_format_number(totals['formateurs'])} formateurs, "
            f"{_format_number(totals['qualifications'])} qualifications, "
            f"{_format_number(metrics['formations_en_cours']['value'])} formations en cours. "
            f"Statuts: {_format_distribution(_status_distribution(stats))}."
        )

    return None


def _answer_from_database(db: Session, user_message: str) -> str:
    stats = _build_database_stats(db)

    for answer_builder in (
        lambda: _answer_collaborator_formations(db, user_message),
        lambda: _collaborator_lookup(db, user_message),
        lambda: _answer_collaborators_by_status(db, user_message, stats),
        lambda: _answer_formation_lookup(db, user_message),
        lambda: _answer_history_stats(db, user_message),
        lambda: _answer_known_stat_question(db, user_message, stats),
    ):
        answer = answer_builder()
        if answer:
            return answer

    return f"Je n'ai pas trouve une reponse exacte dans la base pour cette question. {HELP_MESSAGE}"


@router.post("/message", response_model=ChatbotMessageResponse)
def send_chatbot_message(
    payload: ChatbotMessageRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    return ChatbotMessageResponse(reply=_answer_from_database(db, payload.message))
