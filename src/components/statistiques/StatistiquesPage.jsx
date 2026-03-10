import { useAppPreferences } from "../../context/AppPreferencesContext";

export function StatistiquesPage() {
  const { tr } = useAppPreferences();

  return (
    <div className="rounded-[20px] bg-transparent px-2 py-1">
      <h1 className="leoni-page-title">{tr("Statistiques et Analyses", "Statistics and Analytics")}</h1>
      <p className="leoni-page-subtitle">{tr("Rapports detailles et analyses de performance...", "Detailed reports and performance analytics...")}</p>
    </div>
  );
}
