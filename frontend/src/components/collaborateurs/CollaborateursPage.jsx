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
import { AssociateFormationDialog } from "./AssociateFormationDialog";
import { CollaborateursStat } from "./CollaborateursStat";
import { CollaborateursTable } from "./CollaborateursTable";
import { CreateCollaborateurDialog } from "./CreateCollaborateurDialog";
import { DeleteCollaborateurDialog } from "./DeleteCollaborateurDialog";
import { FormationsDialog } from "./FormationsDialog";
import {
  formatDisplayDate,
  getTodayDateInputValue,
  mapCollaborateur,
  statusRank,
} from "./helpers";

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
  const [collaborateurToDelete, setCollaborateurToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingCollaborateur, setIsDeletingCollaborateur] = useState(false);
  const [isFormationsDialogOpen, setIsFormationsDialogOpen] = useState(false);
  const [formationsCollaborateur, setFormationsCollaborateur] = useState(null);
  const [formationsHistory, setFormationsHistory] = useState([]);
  const [formationsHistoryLoading, setFormationsHistoryLoading] = useState(false);
  const [formationsHistoryError, setFormationsHistoryError] = useState("");
  const [isAssociateDialogOpen, setIsAssociateDialogOpen] = useState(false);
  const [isSubmittingAssociation, setIsSubmittingAssociation] = useState(false);
  const [associateError, setAssociateError] = useState("");
  const [associationFormations, setAssociationFormations] = useState([]);
  const [associationFormationsLoading, setAssociationFormationsLoading] = useState(false);
  const [associationFormateurs, setAssociationFormateurs] = useState([]);
  const [collaborateurToAssociate, setCollaborateurToAssociate] = useState(null);
  const [newAssociation, setNewAssociation] = useState({
    formationId: "",
    formateurId: "",
    dateAssociation: getTodayDateInputValue(),
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newCollaborateur, setNewCollaborateur] = useState({
    matricule: "",
    nom: "",
    prenom: "",
    fonction: "",
    segment: "",
    num_tel: "",
    date_recrutement: "",
  });

  const resetCreateForm = () => {
    setNewCollaborateur({
      matricule: "",
      nom: "",
      prenom: "",
      fonction: "",
      segment: "",
      num_tel: "",
      date_recrutement: "",
    });
    setCreateError("");
  };

  const closeAssociateDialog = () => {
    setIsAssociateDialogOpen(false);
    setCollaborateurToAssociate(null);
    setAssociationFormations([]);
    setAssociationFormateurs([]);
    setAssociationFormationsLoading(false);
    setIsSubmittingAssociation(false);
    setAssociateError("");
    setNewAssociation({
      formationId: "",
      formateurId: "",
      dateAssociation: getTodayDateInputValue(),
    });
  };

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

  useEffect(() => {
    if (!accessToken) {
      setCollaborateursData([]);
      return;
    }

    let cancelled = false;

    const initializeCollaborateurs = async () => {
      try {
        if (!cancelled) {
          await loadCollaborateurs();
        }
      } catch {
        if (!cancelled) {
          setLoadError(tr("Impossible de charger les collaborateurs.", "Failed to load collaborators."));
        }
      }
    };

    initializeCollaborateurs();

    return () => {
      cancelled = true;
    };
  }, [accessToken, tr]);

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

  const handleCreateCollaborateur = async () => {
    if (!accessToken) {
      setCreateError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }

    const payload = {
      matricule: String(newCollaborateur.matricule || "").trim(),
      nom: String(newCollaborateur.nom || "").trim(),
      prenom: String(newCollaborateur.prenom || "").trim(),
      fonction: String(newCollaborateur.fonction || "").trim() || null,
      segment: String(newCollaborateur.segment || "").trim() || null,
      num_tel: String(newCollaborateur.num_tel || "").trim() || null,
      date_recrutement: String(newCollaborateur.date_recrutement || "").trim() || null,
    };

    if (!payload.matricule || !payload.nom || !payload.prenom) {
      setCreateError(tr("Matricule, nom et prenom sont obligatoires.", "ID, last name, and first name are required."));
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError("");
    try {
      const response = await fetch(apiUrl("/qualification"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCreateError(data?.detail || tr("Impossible de creer le collaborateur.", "Failed to create collaborator."));
        return;
      }

      const createdCollaborateur = mapCollaborateur(data);
      setCollaborateursData((prev) =>
        [...prev, createdCollaborateur].sort((a, b) => a.matricule.localeCompare(b.matricule)),
      );
      setIsCreateOpen(false);
      resetCreateForm();
    } catch {
      setCreateError(tr("Impossible de creer le collaborateur.", "Failed to create collaborator."));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenAssociateDialog = async (collab) => {
    if (isObserver || !accessToken) return;

    setCollaborateurToAssociate(collab);
    setIsAssociateDialogOpen(true);
    setAssociationFormations([]);
    setAssociationFormateurs([]);
    setAssociationFormationsLoading(true);
    setAssociateError("");
    setNewAssociation({
      formationId: "",
      formateurId: "",
      dateAssociation: getTodayDateInputValue(),
    });

    try {
      const [formationsResponse, formateursResponse] = await Promise.all([
        fetch(apiUrl("/formations"), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch(apiUrl("/formateurs"), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      ]);
      const [formationsData, formateursData] = await Promise.all([
        formationsResponse.json().catch(() => []),
        formateursResponse.json().catch(() => []),
      ]);
      if (!formationsResponse.ok) {
        setAssociateError(tr("Impossible de charger les formations.", "Failed to load trainings."));
        return;
      }

      if (!formateursResponse.ok) {
        setAssociateError(tr("Impossible de charger les formateurs.", "Failed to load trainers."));
        return;
      }

      const formations = Array.isArray(formationsData) ? formationsData : [];
      const formateurs = Array.isArray(formateursData) ? formateursData : [];
      setAssociationFormations(formations);
      setAssociationFormateurs(formateurs);
      if (formations.length === 0) {
        setAssociateError(tr("Aucune formation disponible.", "No training is available."));
      }
    } catch {
      setAssociateError(tr("Impossible de charger les formations.", "Failed to load trainings."));
    } finally {
      setAssociationFormationsLoading(false);
    }
  };

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
      const response = await fetch(apiUrl(`/qualification/${collab.matricule}/formations`), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
        return;
      }
      setFormationsHistory(Array.isArray(data) ? data : []);
    } catch {
      setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
    } finally {
      setFormationsHistoryLoading(false);
    }
  };

  const handleAssociateFormation = async () => {
    if (!accessToken || !collaborateurToAssociate) {
      setAssociateError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }

    const formationId = Number(newAssociation.formationId);
    const formateurIdRaw = String(newAssociation.formateurId || "").trim();
    if (!Number.isFinite(formationId) || formationId <= 0) {
      setAssociateError(tr("Selectionnez une formation.", "Select a training."));
      return;
    }

    setIsSubmittingAssociation(true);
    setAssociateError("");
    try {
      const response = await fetch(
        apiUrl(`/qualification/${encodeURIComponent(collaborateurToAssociate.matricule)}/formations`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            formation_id: formationId,
            formateur_id: formateurIdRaw ? Number(formateurIdRaw) : null,
            date_association_systeme: newAssociation.dateAssociation || null,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAssociateError(
          data?.detail || tr("Impossible d'associer la formation.", "Failed to associate the training."),
        );
        return;
      }

      const latestDate = formatDisplayDate(data.date);
      const nextStatus = statusRank(data.resultat) > statusRank(collaborateurToAssociate.statut)
        ? data.resultat
        : collaborateurToAssociate.statut;

      setCollaborateursData((prev) =>
        prev.map((collab) => {
          if (collab.id !== collaborateurToAssociate.id) {
            return collab;
          }
          return {
            ...collab,
            formations: (collab.formations || 0) + 1,
            derniereFormation: latestDate,
            statut: statusRank(data.resultat) > statusRank(collab.statut) ? data.resultat : collab.statut,
          };
        }),
      );

      setSelectedCollaborateur((prev) => {
        if (!prev || prev.id !== collaborateurToAssociate.id) {
          return prev;
        }
        return {
          ...prev,
          formations: (prev.formations || 0) + 1,
          derniereFormation: latestDate,
          statut: nextStatus,
        };
      });

      setFormationsCollaborateur((prev) => {
        if (!prev || prev.id !== collaborateurToAssociate.id) {
          return prev;
        }
        return {
          ...prev,
          formations: (prev.formations || 0) + 1,
          derniereFormation: latestDate,
          statut: nextStatus,
        };
      });

      if (formationsCollaborateur?.id === collaborateurToAssociate.id) {
        setFormationsHistory((prev) => [data, ...prev]);
      }

      closeAssociateDialog();
    } catch {
      setAssociateError(tr("Impossible d'associer la formation.", "Failed to associate the training."));
    } finally {
      setIsSubmittingAssociation(false);
    }
  };

  const handleDeleteCollaborateur = () => {
    if (!collaborateurToDelete) return;

    const deleteCollaborateur = async () => {
      const matricule = collaborateurToDelete.matricule;
      setIsDeletingCollaborateur(true);
      setPageError("");

      try {
        const response = await fetch(
          apiUrl(`/qualification/${encodeURIComponent(matricule)}`),
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
        if (!response.ok) {
          setPageError(
            data?.detail || tr("Impossible de supprimer le collaborateur.", "Failed to delete collaborator."),
          );
          return;
        }

        setCollaborateursData((prev) => prev.filter((collab) => collab.id !== collaborateurToDelete.id));
        setSelectedCollaborateur((prev) => (prev?.id === collaborateurToDelete.id ? null : prev));
        setIsDeleteDialogOpen(false);
        setCollaborateurToDelete(null);
      } catch {
        setPageError(tr("Impossible de supprimer le collaborateur.", "Failed to delete collaborator."));
      } finally {
        setIsDeletingCollaborateur(false);
      }
    };

    if (!accessToken) {
      setPageError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }

    deleteCollaborateur();
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
        const { response, data } = await fetchCollaborateurFormations(accessToken, formationsCollaborateur.matricule);
        if (!response.ok) {
          setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
        } else {
          setFormationsHistory(Array.isArray(data) ? data : []);
          setFormationsHistoryError("");
        }
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
          <Button
            className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]"
            disabled={isObserver}
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
          >
            <Users className="mr-2 h-4 w-4" />
            {tr("Nouveau Collaborateur", "New Collaborator")}
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
        onOpenAssociate={handleOpenAssociateDialog}
        onAskDelete={(collab) => {
          if (isObserver) return;
          setCollaborateurToDelete(collab);
          setIsDeleteDialogOpen(true);
        }}
        canManage={!isObserver}
        tr={tr}
      />

      <CreateCollaborateurDialog
        tr={tr}
        isOpen={!isObserver && isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        newCollaborateur={newCollaborateur}
        onChange={(field, value) => setNewCollaborateur((prev) => ({ ...prev, [field]: value }))}
        createError={createError}
        isSubmitting={isSubmittingCreate}
        onSubmit={handleCreateCollaborateur}
      />

      <AssociateFormationDialog
        tr={tr}
        isOpen={!isObserver && isAssociateDialogOpen}
        onClose={closeAssociateDialog}
        collaborateur={collaborateurToAssociate}
        formations={associationFormations}
        formateurs={associationFormateurs}
        isLoading={associationFormationsLoading}
        error={associateError}
        newAssociation={newAssociation}
        onAssociationChange={(field, value) => setNewAssociation((prev) => ({ ...prev, [field]: value }))}
        onSubmit={handleAssociateFormation}
        isSubmitting={isSubmittingAssociation}
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

      {!isObserver ? (
        <DeleteCollaborateurDialog
          tr={tr}
          isOpen={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) {
              setCollaborateurToDelete(null);
            }
          }}
          collaborateurToDelete={collaborateurToDelete}
          onDeleteCollaborateur={handleDeleteCollaborateur}
          isDeleting={isDeletingCollaborateur}
        />
      ) : null}
    </div>
  );
}
