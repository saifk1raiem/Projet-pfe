import { useEffect, useRef, useState } from "react";
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
import { EditCollaborateurDialog } from "./EditCollaborateurDialog";
import { FormationsDialog } from "./FormationsDialog";
import { mapCollaborateur } from "./helpers";
import {
  fetchCollaborateurPresenceHistory,
  getEmptyPresenceHistoryState,
  normalizePresenceHistoryPayload,
} from "./presenceHistory";

const AUTO_REFRESH_INTERVAL_MS = 30000;
const EMPTY_COLLABORATEUR_FORM = {
  matricule: "",
  nom: "",
  prenom: "",
  fonction: "",
  centre_cout: "",
  groupe: "",
  contre_maitre: "",
  segment: "",
  gender: "",
  num_tel: "",
  date_recrutement: "",
  anciennete: "",
};

const getAuthHeaders = (accessToken, headers = {}) =>
  accessToken ? { ...headers, Authorization: `Bearer ${accessToken}` } : headers;

async function readJsonResponse(url, options = {}) {
  const response = await fetch(url, options);
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  return { response, data };
}

async function fetchCollaborateurs(accessToken) {
  return readJsonResponse(apiUrl("/qualification/collaborateurs"), {
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

async function updateCollaborateur(accessToken, matricule, payload) {
  return readJsonResponse(apiUrl(`/admin/collaborateurs/${encodeURIComponent(matricule)}`), {
    method: "PATCH",
    headers: getAuthHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
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
  const [presenceHistoryByMatricule, setPresenceHistoryByMatricule] = useState({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCollaborateur, setEditingCollaborateur] = useState(null);
  const [editCollaborateurValues, setEditCollaborateurValues] = useState(EMPTY_COLLABORATEUR_FORM);
  const [editCollaborateurError, setEditCollaborateurError] = useState("");
  const [isSavingCollaborateur, setIsSavingCollaborateur] = useState(false);
  const selectedCollaborateurMatriculeRef = useRef("");
  const formationsCollaborateurMatriculeRef = useRef("");

  const closeFormationsDialog = () => {
    setIsFormationsDialogOpen(false);
    setFormationsCollaborateur(null);
    setFormationsHistory([]);
    setFormationsHistoryError("");
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingCollaborateur(null);
    setEditCollaborateurValues(EMPTY_COLLABORATEUR_FORM);
    setEditCollaborateurError("");
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

  useEffect(() => {
    selectedCollaborateurMatriculeRef.current = selectedCollaborateur?.matricule ?? "";
  }, [selectedCollaborateur?.matricule]);

  useEffect(() => {
    formationsCollaborateurMatriculeRef.current = formationsCollaborateur?.matricule ?? "";
  }, [formationsCollaborateur?.matricule]);

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

  const loadCollaborateurPresenceHistory = async (matricule) => {
    if (!accessToken || !matricule) {
      return;
    }

    setPresenceHistoryByMatricule((prev) => ({
      ...prev,
      [matricule]: getEmptyPresenceHistoryState({
        ...prev[matricule],
        loading: true,
        error: "",
      }),
    }));

    try {
      const { response, data } = await fetchCollaborateurPresenceHistory(accessToken, matricule);
      if (!response.ok) {
        setPresenceHistoryByMatricule((prev) => ({
          ...prev,
          [matricule]: getEmptyPresenceHistoryState({
            ...prev[matricule],
            loaded: true,
            error: tr(
              "Impossible de charger l'historique de presence.",
              "Failed to load attendance history.",
            ),
          }),
        }));
        return;
      }

      setPresenceHistoryByMatricule((prev) => ({
        ...prev,
        [matricule]: normalizePresenceHistoryPayload(data),
      }));
    } catch {
      setPresenceHistoryByMatricule((prev) => ({
        ...prev,
        [matricule]: getEmptyPresenceHistoryState({
          ...prev[matricule],
          loaded: true,
          error: tr(
            "Impossible de charger l'historique de presence.",
            "Failed to load attendance history.",
          ),
        }),
      }));
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setCollaborateursData([]);
      setLoadError("");
      setPageError("");
      setPresenceHistoryByMatricule({});
      return;
    }

    let cancelled = false;

    const syncCollaborateurs = async () => {
      if (isRefreshingData || isEditDialogOpen || isSavingCollaborateur) {
        return;
      }

      try {
        await loadCollaborateurs();
        if (cancelled) {
          return;
        }

        const selectedMatricule = selectedCollaborateurMatriculeRef.current;
        if (selectedMatricule) {
          await loadCollaborateurPresenceHistory(selectedMatricule);
        }

        const formationsMatricule = formationsCollaborateurMatriculeRef.current;
        if (formationsMatricule) {
          await loadCollaborateurHistory(formationsMatricule);
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
  }, [accessToken, formationsCollaborateur?.matricule, isEditDialogOpen, isRefreshingData, isSavingCollaborateur, tr]);

  useEffect(() => {
    if (!selectedCollaborateur?.matricule || !accessToken) {
      return;
    }

    loadCollaborateurPresenceHistory(selectedCollaborateur.matricule);
  }, [accessToken, selectedCollaborateur?.matricule, tr]);

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

      if (selectedCollaborateurMatriculeRef.current) {
        await loadCollaborateurPresenceHistory(selectedCollaborateurMatriculeRef.current);
      }

      if (formationsCollaborateurMatriculeRef.current) {
        await loadCollaborateurHistory(formationsCollaborateurMatriculeRef.current);
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

  const handleToggleCollaborateurDetails = (collab) => {
    setSelectedCollaborateur((prev) => {
      const shouldClose = prev?.id === collab.id;
      if (shouldClose) {
        return null;
      }

      if (collab?.matricule) {
        setPresenceHistoryByMatricule((currentState) => ({
          ...currentState,
          [collab.matricule]: getEmptyPresenceHistoryState({
            ...currentState[collab.matricule],
            loading: true,
            error: "",
          }),
        }));
      }

      return collab;
    });
  };

  const handleOpenEditDialog = (collab) => {
    setEditingCollaborateur(collab);
    setEditCollaborateurValues({
      matricule: collab.matricule || "",
      nom: collab.nom || "",
      prenom: collab.prenom || "",
      fonction: collab.fonction || "",
      centre_cout: collab.centre_cout || "",
      groupe: collab.groupe || "",
      contre_maitre: collab.contre_maitre || "",
      segment: collab.segment || "",
      gender: collab.gender || "",
      num_tel: collab.num_tel || "",
      date_recrutement: collab.date_recrutement || "",
      anciennete: collab.anciennete || "",
    });
    setEditCollaborateurError("");
    setIsEditDialogOpen(true);
  };

  const handleEditFieldChange = (field, value) => {
    setEditCollaborateurValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitEditCollaborateur = async () => {
    if (!editingCollaborateur?.matricule) {
      setEditCollaborateurError(tr("Collaborateur introuvable.", "Collaborator not found."));
      return;
    }
    if (!accessToken) {
      setEditCollaborateurError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }
    if (!editCollaborateurValues.nom.trim() || !editCollaborateurValues.prenom.trim()) {
      setEditCollaborateurError(tr("Le nom et le prenom sont obligatoires.", "Last name and first name are required."));
      return;
    }

    setIsSavingCollaborateur(true);
    setEditCollaborateurError("");
    try {
      const payload = {
        nom: editCollaborateurValues.nom,
        prenom: editCollaborateurValues.prenom,
        fonction: editCollaborateurValues.fonction,
        centre_cout: editCollaborateurValues.centre_cout,
        groupe: editCollaborateurValues.groupe,
        contre_maitre: editCollaborateurValues.contre_maitre,
        segment: editCollaborateurValues.segment,
        gender: editCollaborateurValues.gender,
        num_tel: editCollaborateurValues.num_tel,
        date_recrutement: editCollaborateurValues.date_recrutement || null,
        anciennete:
          editCollaborateurValues.anciennete === ""
            ? null
            : Number.parseInt(editCollaborateurValues.anciennete, 10),
      };

      const { response, data } = await updateCollaborateur(
        accessToken,
        editingCollaborateur.matricule,
        payload,
      );
      if (!response.ok) {
        setEditCollaborateurError(
          typeof data?.detail === "string"
            ? data.detail
            : tr("Impossible de modifier le collaborateur.", "Failed to update collaborator."),
        );
        return;
      }

      await loadCollaborateurs();
      if (selectedCollaborateurMatriculeRef.current) {
        await loadCollaborateurPresenceHistory(selectedCollaborateurMatriculeRef.current);
      }
      if (formationsCollaborateurMatriculeRef.current) {
        await loadCollaborateurHistory(formationsCollaborateurMatriculeRef.current);
      }
      closeEditDialog();
    } catch {
      setEditCollaborateurError(tr("Impossible de modifier le collaborateur.", "Failed to update collaborator."));
    } finally {
      setIsSavingCollaborateur(false);
    }
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
        onViewDetails={handleToggleCollaborateurDetails}
        onCloseDetails={() => setSelectedCollaborateur(null)}
        onViewFormations={handleOpenFormationsDialog}
        onEditCollaborateur={handleOpenEditDialog}
        presenceHistoryByMatricule={presenceHistoryByMatricule}
        canEdit={!isObserver}
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

      <EditCollaborateurDialog
        tr={tr}
        isOpen={!isObserver && isEditDialogOpen}
        onClose={closeEditDialog}
        formValues={editCollaborateurValues}
        onChange={handleEditFieldChange}
        onSubmit={handleSubmitEditCollaborateur}
        isSubmitting={isSavingCollaborateur}
        error={editCollaborateurError}
      />
    </div>
  );
}
