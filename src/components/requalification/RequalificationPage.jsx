import { useAppPreferences } from "../../context/AppPreferencesContext";

export function RequalificationPage() {
  const { tr } = useAppPreferences();

  return (
    <div className="rounded-[20px] bg-transparent px-2 py-1">
      <h1 className="leoni-page-title">{tr("Gestion des Requalifications", "Requalification Management")}</h1>
      <p className="leoni-page-subtitle">{tr("Planification et suivi des requalifications...", "Planning and follow-up of requalifications...")}</p>
    </div>
  );
}
