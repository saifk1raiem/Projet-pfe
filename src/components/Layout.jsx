import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TrainingDashboard } from "./TrainingDashboard";
import { FormationPage } from "./FormationPage";
import { FormateursList } from "./FormateursList";
import { CollaborateursPage } from "./CollaborateursPage";

const PlaceholderPage = ({ title, subtitle }) => (
  <div className="rounded-[20px] bg-transparent px-2 py-1">
    <h1 className="leoni-page-title">{title}</h1>
    <p className="leoni-page-subtitle">{subtitle}</p>
  </div>
);

export function Layout() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <TrainingDashboard />;
      case "formation":
        return <FormationPage />;
      case "qualification":
        return (
          <PlaceholderPage
            title="Gestion des Qualifications"
            subtitle="Suivi et validation des qualifications des collaborateurs..."
          />
        );
      case "requalification":
        return (
          <PlaceholderPage
            title="Gestion des Requalifications"
            subtitle="Planification et suivi des requalifications..."
          />
        );
      case "formateurs":
        return <FormateursList />;
      case "collaborateurs":
        return <CollaborateursPage />;
      case "statistiques":
        return (
          <PlaceholderPage
            title="Statistiques et Analyses"
            subtitle="Rapports détaillés et analyses de performance..."
          />
        );
      case "parametres":
        return (
          <PlaceholderPage
            title="Paramètres du Système"
            subtitle="Configuration et paramètres de l'application..."
          />
        );
      default:
        return <TrainingDashboard />;
    }
  };

  return (
    <div className="leoni-shell flex h-screen overflow-hidden">
      <div className="px-5 py-5">
        <Sidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          compact={currentPage === "dashboard"}
        />
      </div>

      <div className="leoni-divider" />

      <main className="leoni-main flex-1 overflow-y-auto">{renderContent()}</main>

      <button aria-label="Aide" className="leoni-help">
        ?
      </button>
    </div>
  );
}

