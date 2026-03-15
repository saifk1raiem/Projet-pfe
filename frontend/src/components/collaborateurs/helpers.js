export const statutOptions = ["Non associe", "En cours", "Qualifie", "Depassement"];

export function formatDisplayDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function statusRank(value) {
  if (value === "Depassement") return 3;
  if (value === "En cours") return 2;
  if (value === "Qualifie") return 1;
  return 0;
}

export function mapCollaborateur(item) {
  return {
    id: item.id ?? item.matricule,
    matricule: item.matricule ?? "-",
    nom: item.nom ?? "-",
    prenom: item.prenom ?? "-",
    departement: item.segment || item.groupe || item.centre_cout || "-",
    poste: item.fonction || "-",
    dateEntree: formatDisplayDate(item.date_recrutement),
    statut: item.statut || "Non associee",
    formations: Number.isFinite(item.formations) ? item.formations : 0,
    derniereFormation: formatDisplayDate(item.derniereFormation),
  };
}
