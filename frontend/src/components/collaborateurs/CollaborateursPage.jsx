import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { EntityFiltersCard } from "../filters/EntityFiltersCard";
import { CollaborateursStat } from "./CollaborateursStat";
import { CollaborateursTable } from "./CollaborateursTable";
import { FormationsDialog } from "./FormationsDialog";
import { mapCollaborateur } from "./helpers";

const AUTO_REFRESH_INTERVAL_MS = 30000;

const getAuthHeaders = (accessToken, headers = {}) =>
  accessToken ? { ...headers, Authorization: `Bearer ${accessToken}` } : headers;

async function readJsonResponse(url, options = {}) {
  const response = await fetch(url, options);
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  return { response, data };
}

async function fetchCollaborateurs(accessToken) {
  return readJsonResponse(apiUrl("/qualification"), {
    headers: getAuthHeaders(accessToken),
  });
}

async function fetchCollaborateurFormations(accessToken, matricule) {
  return readJsonResponse(
    apiUrl(`/qualification/${encodeURIComponent(matricule)}/formations`),
    {
      headers: getAuthHeaders(accessToken),
    },
  );
}

async function recalculateQualificationStatuses(accessToken) {
  return readJsonResponse(apiUrl("/qualification/recalculate"), {
    method: "POST",
    headers: getAuthHeaders(accessToken),
  });
}

export function CollaborateursPage({ onNavigateToPage, currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const isObserver = currentUser?.role === "observer";
  const [searchTerm, setSearchTerm] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [collaborateursData, setCollaborateursData] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [pageError, setPageError] = useState("");
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState(null);
  const [isFormationsDialogOpen, setIsFormationsDialogOpen] = useState(false);
  const [formationsCollaborateur, setFormationsCollaborateur] = useState(null);
  const [formationsHistory, setFormationsHistory] = useState([]);
  const [formationsHistoryLoading, setFormationsHistoryLoading] = useState(false);
  const [formationsHistoryError, setFormationsHistoryError] = useState("");

  const closeFormationsDialog = () => {
    setIsFormationsDialogOpen(false);
    setFormationsCollaborateur(null);
    setFormationsHistory([]);
    setFormationsHistoryError("");
  };

  const applyCollaborateursData = (rows) => {
    setCollaborateursData(rows);
    setSelectedCollaborateur((prev) => {
      if (!prev) return prev;
      return rows.find((item) => item.id === prev.id) ?? null;
    });
    setFormationsCollaborateur((prev) => {
      if (!prev) return prev;
      return rows.find((item) => item.id === prev.id) ?? null;
    });
  };

  const loadCollaborateurs = async () => {
    const { response, data } = await fetchCollaborateurs(accessToken);
    if (!response.ok) {
      throw new Error("load_failed");
    }

    const mappedRows = Array.isArray(data) ? data.map(mapCollaborateur) : [];
    applyCollaborateursData(mappedRows);
    setLoadError("");
    setPageError("");
    return mappedRows;
  };

  const loadCollaborateurHistory = async (matricule) => {
    if (!accessToken || !matricule) {
      setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
      return;
    }

    const { response, data } = await fetchCollaborateurFormations(accessToken, matricule);
    if (!response.ok) {
      setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
      return;
    }

    setFormationsHistory(Array.isArray(data) ? data : []);
    setFormationsHistoryError("");
  };

  useEffect(() => {
    if (!accessToken) {
      setCollaborateursData([]);
      setLoadError("");
      setPageError("");
      return;
    }

    let cancelled = false;

    const syncCollaborateurs = async () => {
      if (isRefreshingData) {
        return;
      }

      try {
        await loadCollaborateurs();
        if (cancelled) {
          return;
        }

        if (formationsCollaborateur?.matricule) {
          await loadCollaborateurHistory(formationsCollaborateur.matricule);
        }
      } catch {
        if (!cancelled) {
          setLoadError(tr("Impossible de charger les collaborateurs.", "Failed to load collaborators."));
        }
      }
    };

    syncCollaborateurs();

    const intervalId = window.setInterval(() => {
      syncCollaborateurs();
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleWindowFocus = () => {
      syncCollaborateurs();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncCollaborateurs();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accessToken, formationsCollaborateur?.matricule, isRefreshingData, tr]);

  const totalCollaborateurs = collaborateursData.length;
  const qualifiesCount = collaborateursData.filter((collab) => collab.statut === "Qualifie").length;
  const enCoursCount = collaborateursData.filter((collab) => collab.statut === "En cours").length;
  const nonAssocieeCount = collaborateursData.filter(
    (collab) => collab.statut === "Non associee" || collab.statut === "Non associe",
  ).length;
  const depassementCount = collaborateursData.filter((collab) => collab.statut === "Depassement").length;
  const availableDepartments = Array.from(
    new Set(
      collaborateursData
        .map((collab) => collab.departement)
        .filter((value) => typeof value === "string" && value.trim().length > 0 && value !== "-"),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const filteredCollaborateurs = collaborateursData.filter((collab) => {
    const matchesSearch =
      collab.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collab.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collab.departement.toLowerCase().includes(searchTerm.toLowerCase());

    const normalizedStatus = collab.statut === "Non associe" ? "Non associee" : collab.statut;
    const normalizedFilterStatus = statusFilter === "Non associe" ? "Non associee" : statusFilter;
    const matchesStatus = normalizedFilterStatus === "all" || normalizedStatus === normalizedFilterStatus;
    const matchesDepartment = departmentFilter === "all" || collab.departement === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const handleOpenFormationsDialog = async (collab) => {
    setFormationsCollaborateur(collab);
    setIsFormationsDialogOpen(true);
    setFormationsHistory([]);
    setFormationsHistoryError("");

    if (!accessToken || !collab?.matricule) {
      setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
      return;
    }

    setFormationsHistoryLoading(true);
    try {
      await loadCollaborateurHistory(collab.matricule);
    } catch {
      setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
    } finally {
      setFormationsHistoryLoading(false);
    }
  };

  const handleRefreshData = async () => {
    if (!accessToken) {
      setPageError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }

    setIsRefreshingData(true);
    setPageError("");

    try {
      if (!isObserver) {
        const { response, data } = await recalculateQualificationStatuses(accessToken);
        if (!response.ok) {
          setPageError(
            data?.detail || tr("Impossible de recalculer les etats.", "Failed to recalculate statuses."),
          );
          return;
        }
      }

      await loadCollaborateurs();

      if (formationsCollaborateur?.matricule) {
        await loadCollaborateurHistory(formationsCollaborateur.matricule);
      }
    } catch {
      setPageError(tr("Impossible d'actualiser les collaborateurs.", "Failed to refresh collaborators."));
    } finally {
      setIsRefreshingData(false);
    }
  };

  const handleGoToFormationSection = (formation) => {
    closeFormationsDialog();
    onNavigateToPage?.("formation", { formationId: formation.formation_id });
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">
            {tr("Gestion des Collaborateurs", "Collaborator Management")}
          </h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">
            {tr("Liste et suivi des collaborateurs", "Collaborator list and tracking")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-10 rounded-[10px] border-[#ccd4d8] px-5 text-[16px]"
            disabled={isRefreshingData}
            onClick={handleRefreshData}
          >
            {isRefreshingData ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            {tr("Actualiser", "Refresh")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <CollaborateursStat icon={Users} title="Total" value={totalCollaborateurs} color={{ bg: "bg-[#e8f0ff]", text: "text-[#0f63f2]" }} />
        <CollaborateursStat icon={CheckCircle2} title="Qualifies" value={qualifiesCount} color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
        <CollaborateursStat icon={AlertCircle} title="En cours" value={enCoursCount} color={{ bg: "bg-[#fff2e4]", text: "text-[#fc6200]" }} />
        <CollaborateursStat icon={XCircle} title="Non associee" value={nonAssocieeCount} color={{ bg: "bg-[#fdeeee]", text: "text-[#ea3737]" }} />
        <CollaborateursStat icon={AlertTriangle} title="Depassement" value={depassementCount} color={{ bg: "bg-[#f3edff]", text: "text-[#7b35e8]" }} />
      </div>

      {loadError ? (
        <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-sm text-[#8a1d1d] shadow-sm">
          {loadError}
        </Card>
      ) : null}

      {pageError ? (
        <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-sm text-[#8a1d1d] shadow-sm">
          {pageError}
        </Card>
      ) : null}

      <EntityFiltersCard
        tr={tr}
        searchPlaceholder={tr("Rechercher par nom, matricule ou departement...", "Search by name, ID, or department...")}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        isFiltersOpen={isFiltersOpen}
        onToggleFilters={() => setIsFiltersOpen((prev) => !prev)}
        filters={[
          {
            id: "collab-status-filter",
            label: tr("Statut", "Status"),
            value: statusFilter,
            onChange: setStatusFilter,
            allOptionLabel: tr("Tous les statuts", "All statuses"),
            options: [
              { value: "Non associee", label: tr("Non associee", "Not associated") },
              { value: "En cours", label: tr("En cours", "In progress") },
              { value: "Qualifie", label: tr("Qualifie", "Qualified") },
              { value: "Depassement", label: tr("Depassement", "Overdue") },
            ],
          },
          {
            id: "collab-department-filter",
            label: tr("Departement", "Department"),
            value: departmentFilter,
            onChange: setDepartmentFilter,
            allOptionLabel: tr("Tous les departements", "All departments"),
            options: availableDepartments.map((department) => ({ value: department, label: department })),
          },
        ]}
        onResetFilters={() => {
          setStatusFilter("all");
          setDepartmentFilter("all");
        }}
        filtersGridClassName="md:grid-cols-3"
      />

      <CollaborateursTable
        rows={filteredCollaborateurs}
        selectedCollaborateur={selectedCollaborateur}
        onViewDetails={(collab) => setSelectedCollaborateur((prev) => (prev?.id === collab.id ? null : collab))}
        onCloseDetails={() => setSelectedCollaborateur(null)}
        onViewFormations={handleOpenFormationsDialog}
        tr={tr}
      />

      <FormationsDialog
        tr={tr}
        isOpen={isFormationsDialogOpen}
        collaborateur={formationsCollaborateur}
        formationsHistory={formationsHistory}
        formationsHistoryLoading={formationsHistoryLoading}
        formationsHistoryError={formationsHistoryError}
        onClose={closeFormationsDialog}
        onOpenFormationDetails={handleGoToFormationSection}
      />
    </div>
  );
}
