import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { TrainingDashboard } from "./TrainingDashboard";
import { FormationPage } from "./FormationPage";
import { FormateursList } from "./FormateursList";
import { CollaborateursPage } from "./CollaborateursPage";
import { QualificationPage } from "./QualificationPage";
import { AdvisorsPage } from "./AdvisorsPage";
import { ParametresPage } from "./ParametresPage";
import { useAppPreferences } from "../context/AppPreferencesContext";

const PlaceholderPage = ({ title, subtitle }) => (
  <div className="rounded-[20px] bg-transparent px-2 py-1">
    <h1 className="leoni-page-title">{title}</h1>
    <p className="leoni-page-subtitle">{subtitle}</p>
  </div>
);

export function Layout({ onSignOut, currentUser, accessToken }) {
  const { tr, theme, toggleTheme } = useAppPreferences();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [formationDetailsId, setFormationDetailsId] = useState(null);

  const handlePageChange = (page, options = {}) => {
    setCurrentPage(page);
    if (page === "formation") {
      setFormationDetailsId(options.formationId ?? null);
      return;
    }
    setFormationDetailsId(null);
  };

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <TrainingDashboard />;
      case "formation":
        return <FormationPage openFormationId={formationDetailsId} currentUser={currentUser} accessToken={accessToken} />;
      case "qualification":
        return (
          <QualificationPage
            onNavigateToPage={handlePageChange}
            currentUser={currentUser}
            accessToken={accessToken}
          />
        );
      case "requalification":
        return (
          <PlaceholderPage
            title={tr("Gestion des Requalifications", "Requalification Management")}
            subtitle={tr("Planification et suivi des requalifications...", "Planning and follow-up of requalifications...")}
          />
        );
      case "formateurs":
        return <FormateursList onNavigateToPage={handlePageChange} currentUser={currentUser} accessToken={accessToken} />;
      case "collaborateurs":
        return <CollaborateursPage onNavigateToPage={handlePageChange} currentUser={currentUser} accessToken={accessToken} />;
      case "advisors":
        return <AdvisorsPage accessToken={accessToken} />;
      case "statistiques":
        return (
          <PlaceholderPage
            title={tr("Statistiques et Analyses", "Statistics and Analytics")}
            subtitle={tr("Rapports detailles et analyses de performance...", "Detailed reports and performance analytics...")}
          />
        );
      case "parametres":
        return <ParametresPage currentUser={currentUser} accessToken={accessToken} />;
      default:
        return <TrainingDashboard />;
    }
  };

  return (
    <div className="leoni-shell flex h-screen overflow-hidden">
      <div className="px-5 py-5">
        <Sidebar
          currentPage={currentPage}
          onPageChange={handlePageChange}
          compact={isSidebarCollapsed}
          onToggleCompact={() => setIsSidebarCollapsed((prev) => !prev)}
          onSignOut={onSignOut}
          currentUser={currentUser}
        />
      </div>

      <div className="leoni-divider" />

      <main className="leoni-main flex-1 overflow-y-auto">{renderContent()}</main>

      <button aria-label={tr("Changer le theme", "Toggle theme")} className="leoni-theme-toggle" onClick={toggleTheme}>
        {theme === "night" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <button aria-label={tr("Aide", "Help")} className="leoni-help">
        ?
      </button>
    </div>
  );
}
