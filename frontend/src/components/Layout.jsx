import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { TrainingDashboard } from "./dashboard/TrainingDashboard";
import { FormationPage } from "./formation/FormationPage";
import { FormateursList } from "./formateurs/FormateursList";
import { CollaborateursPage } from "./collaborateurs/CollaborateursPage";
import { HistoryPage } from "./history/HistoryPage";
import { QualificationPage } from "./qualification/QualificationPage";
import { AdvisorsPage } from "./advisors/AdvisorsPage";
import { ParametresPage } from "./parametres/ParametresPage";
import { RequalificationPage } from "./requalification/RequalificationPage";
import { StatistiquesPage } from "./statistiques/StatistiquesPage";
import { ProfileDialog } from "./profile/ProfileDialog";
import { useAppPreferences } from "../context/AppPreferencesContext";

export function Layout({ onSignOut, currentUser, accessToken, onCurrentUserChange }) {
  const { tr, theme, toggleTheme } = useAppPreferences();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [formationDetailsId, setFormationDetailsId] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
        return <TrainingDashboard accessToken={accessToken} currentUser={currentUser} />;
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
      case "historique":
        return <HistoryPage currentUser={currentUser} accessToken={accessToken} />;
      case "requalification":
        return <RequalificationPage />;
      case "formateurs":
        return <FormateursList onNavigateToPage={handlePageChange} currentUser={currentUser} accessToken={accessToken} />;
      case "collaborateurs":
        return <CollaborateursPage onNavigateToPage={handlePageChange} currentUser={currentUser} accessToken={accessToken} />;
      case "advisors":
        return <AdvisorsPage accessToken={accessToken} />;
      case "statistiques":
        return <StatistiquesPage />;
      case "parametres":
        return <ParametresPage currentUser={currentUser} accessToken={accessToken} onCurrentUserChange={onCurrentUserChange} />;
      default:
        return <TrainingDashboard accessToken={accessToken} />;
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
          onProfileClick={() => setIsProfileOpen(true)}
          currentUser={currentUser}
        />
      </div>

      <div className="leoni-divider" />

      <main className="leoni-main flex-1 overflow-y-auto">{renderContent()}</main>

      <ProfileDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        currentUser={currentUser}
        accessToken={accessToken}
        onUserUpdated={onCurrentUserChange}
      />

      <button aria-label={tr("Changer le theme", "Toggle theme")} className="leoni-theme-toggle" onClick={toggleTheme}>
        {theme === "night" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <button aria-label={tr("Aide", "Help")} className="leoni-help">
        ?
      </button>
    </div>
  );
}
