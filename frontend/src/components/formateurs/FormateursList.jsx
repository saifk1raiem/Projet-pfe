import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { GraduationCap, Mail, BookOpen, AlertCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { CollaborateursDialog } from "./CollaborateursDialog";
import { CreateFormateurDialog } from "./CreateFormateurDialog";
import { DeleteFormateurDialog } from "./DeleteFormateurDialog";
import { FormateursStat } from "./FormateursStat";
import { getInitials, getSpecialites } from "./formateursUtils";

const AUTO_REFRESH_INTERVAL_MS = 30000;

const getAuthHeaders = (accessToken) =>
  accessToken
    ? {
      Authorization: `Bearer ${accessToken}`,
    }
    : {};

const EMPTY_FORMATEUR_FORM = {
  nom: "",
  telephone: "",
  email: "",
  specialite: "",
  formationIds: [],
};

export function FormateursList({ onNavigateToPage, currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const isObserver = currentUser?.role === "observer";
  const [selectedFormateur, setSelectedFormateur] = useState(null);
  const [formateurs, setFormateurs] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [isCreatingFormateur, setIsCreatingFormateur] = useState(false);
  const [newFormateur, setNewFormateur] = useState(EMPTY_FORMATEUR_FORM);
  const [availableFormations, setAvailableFormations] = useState([]);
  const [isLoadingAvailableFormations, setIsLoadingAvailableFormations] = useState(false);
  const [availableFormationsError, setAvailableFormationsError] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [isUpdatingFormateur, setIsUpdatingFormateur] = useState(false);
  const [editingFormateur, setEditingFormateur] = useState(null);
  const [editFormateurValues, setEditFormateurValues] = useState(EMPTY_FORMATEUR_FORM);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeletingFormateur, setIsDeletingFormateur] = useState(false);
  const [deletingFormateur, setDeletingFormateur] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [formateurFormations, setFormateurFormations] = useState([]);
  const [formationsLoading, setFormationsLoading] = useState(false);
  const [formationsError, setFormationsError] = useState("");
  const [collaborateursDialogFormateur, setCollaborateursDialogFormateur] = useState(null);
  const [formateurCollaborateurs, setFormateurCollaborateurs] = useState([]);
  const [collaborateursLoading, setCollaborateursLoading] = useState(false);
  const [collaborateursError, setCollaborateursError] = useState("");

  const applyFormateursData = (rows) => {
    setFormateurs(rows);
    setSelectedFormateur((prev) => {
      if (!prev) return prev;
      return rows.find((item) => item.id === prev.id) ?? null;
    });
    setCollaborateursDialogFormateur((prev) => {
      if (!prev) return prev;
      return rows.find((item) => item.id === prev.id) ?? null;
    });
  };

  const loadFormateurs = async () => {
    const response = await fetch(apiUrl("/formateurs"), {
      headers: getAuthHeaders(accessToken),
    });

    const data = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error("load_failed");
    }

    const rows = Array.isArray(data) ? data : [];
    applyFormateursData(rows);
    setLoadError("");
    return rows;
  };

  const createFormateur = async (payload) => {
    const response = await fetch(apiUrl("/formateurs"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(accessToken),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  const loadAvailableFormations = async () => {
    if (!accessToken) {
      setAvailableFormationsError(tr("Impossible de charger les formations.", "Failed to load trainings."));
      return [];
    }

    const response = await fetch(apiUrl("/formations"), {
      headers: getAuthHeaders(accessToken),
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error("load_formations_failed");
    }

    const rows = Array.isArray(data) ? data : [];
    setAvailableFormations(rows);
    setAvailableFormationsError("");
    return rows;
  };

  const updateFormateur = async (formateurId, payload) => {
    const response = await fetch(apiUrl(`/formateurs/${formateurId}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(accessToken),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  const deleteFormateur = async (formateurId) => {
    const response = await fetch(apiUrl(`/formateurs/${formateurId}`), {
      method: "DELETE",
      headers: getAuthHeaders(accessToken),
    });
    const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
    return { response, data };
  };

  const loadFormateurFormations = async (formateurId) => {
    if (!accessToken || !formateurId) {
      setFormationsError(tr("Impossible de charger les formations.", "Failed to load trainings."));
      return;
    }

    const response = await fetch(apiUrl(`/formateurs/${formateurId}/formations`), {
      headers: getAuthHeaders(accessToken),
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      setFormationsError(tr("Impossible de charger les formations.", "Failed to load trainings."));
      return;
    }

    setFormateurFormations(Array.isArray(data) ? data : []);
    setFormationsError("");
  };

  const loadFormateurCollaborateurs = async (formateurId) => {
    if (!accessToken || !formateurId) {
      setCollaborateursError(tr("Impossible de charger les collaborateurs.", "Failed to load collaborators."));
      return;
    }

    const response = await fetch(apiUrl(`/formateurs/${formateurId}/collaborateurs`), {
      headers: getAuthHeaders(accessToken),
    });
    const data = await response.json().catch(() => []);
    if (!response.ok) {
      setCollaborateursError(tr("Impossible de charger les collaborateurs.", "Failed to load collaborators."));
      return;
    }

    setFormateurCollaborateurs(Array.isArray(data) ? data : []);
    setCollaborateursError("");
  };

  useEffect(() => {
    if (!accessToken) {
      applyFormateursData([]);
      setLoadError("");
      return;
    }

    let cancelled = false;

    const syncFormateurs = async () => {
      if (
        isCreateDialogOpen ||
        isCreatingFormateur ||
        isEditDialogOpen ||
        isUpdatingFormateur ||
        isDeleteDialogOpen ||
        isDeletingFormateur
      ) {
        return;
      }

      try {
        await loadFormateurs();
        if (cancelled) {
          return;
        }

        if (isDetailsDialogOpen && selectedFormateur?.id) {
          await loadFormateurFormations(selectedFormateur.id);
        }
        if (collaborateursDialogFormateur?.id) {
          await loadFormateurCollaborateurs(collaborateursDialogFormateur.id);
        }
      } catch {
        if (!cancelled) {
          setLoadError(tr("Impossible de charger les formateurs.", "Failed to load trainers."));
        }
      }
    };

    syncFormateurs();

    const intervalId = window.setInterval(() => {
      syncFormateurs();
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleWindowFocus = () => {
      syncFormateurs();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncFormateurs();
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
  }, [
    accessToken,
    collaborateursDialogFormateur?.id,
    isCreateDialogOpen,
    isCreatingFormateur,
    isDeleteDialogOpen,
    isDeletingFormateur,
    isEditDialogOpen,
    isDetailsDialogOpen,
    isUpdatingFormateur,
    selectedFormateur?.id,
    tr,
  ]);

  const totalFormateurs = formateurs.length;
  const activeFormateurs = formateurs.filter((formateur) => formateur.formations > 0).length;
  const totalAssignedFormations = formateurs.reduce((sum, formateur) => sum + (formateur.formations || 0), 0);
  const withContactInfo = formateurs.filter((formateur) => formateur.telephone || formateur.email).length;

  const handleOpenDetailsDialog = async (formateur) => {
    setSelectedFormateur(formateur);
    setIsDetailsDialogOpen(true);
    setFormateurFormations([]);
    setFormationsError("");

    if (!accessToken || !formateur?.id) {
      setFormationsError(tr("Impossible de charger les formations.", "Failed to load trainings."));
      return;
    }

    setFormationsLoading(true);
    try {
      await loadFormateurFormations(formateur.id);
    } catch {
      setFormationsError(tr("Impossible de charger les formations.", "Failed to load trainings."));
    } finally {
      setFormationsLoading(false);
    }
  };

  const closeDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedFormateur(null);
    setFormateurFormations([]);
    setFormationsError("");
  };

  const handleGoToFormationSection = (formation) => {
    closeDetailsDialog();
    onNavigateToPage?.("formation", { formationId: formation.formation_id });
  };

  const handleOpenCollaborateursDialog = async (formateur) => {
    setCollaborateursDialogFormateur(formateur);
    setFormateurCollaborateurs([]);
    setCollaborateursError("");

    if (!accessToken || !formateur?.id) {
      setCollaborateursError(tr("Impossible de charger les collaborateurs.", "Failed to load collaborators."));
      return;
    }

    setCollaborateursLoading(true);
    try {
      await loadFormateurCollaborateurs(formateur.id);
    } catch {
      setCollaborateursError(tr("Impossible de charger les collaborateurs.", "Failed to load collaborators."));
    } finally {
      setCollaborateursLoading(false);
    }
  };

  const closeCollaborateursDialog = () => {
    setCollaborateursDialogFormateur(null);
    setFormateurCollaborateurs([]);
    setCollaborateursError("");
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateError("");
    setNewFormateur(EMPTY_FORMATEUR_FORM);
    setAvailableFormationsError("");
  };

  const handleCreateFieldChange = (field, value) => {
    setNewFormateur((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleCreateFormation = (formationId) => {
    setNewFormateur((prev) => ({
      ...prev,
      formationIds: prev.formationIds.includes(formationId)
        ? prev.formationIds.filter((item) => item !== formationId)
        : [...prev.formationIds, formationId],
    }));
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingFormateur(null);
    setEditError("");
    setEditFormateurValues(EMPTY_FORMATEUR_FORM);
    setAvailableFormationsError("");
  };

  const handleEditFieldChange = (field, value) => {
    setEditFormateurValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleEditFormation = (formationId) => {
    setEditFormateurValues((prev) => ({
      ...prev,
      formationIds: prev.formationIds.includes(formationId)
        ? prev.formationIds.filter((item) => item !== formationId)
        : [...prev.formationIds, formationId],
    }));
  };

  const handleOpenEditDialog = async (formateur) => {
    setEditingFormateur(formateur);
    setEditFormateurValues({
      nom: formateur.nom || "",
      telephone: formateur.telephone || "",
      email: formateur.email || "",
      specialite: formateur.specialite || "",
      formationIds: [],
    });
    setEditError("");
    setIsEditDialogOpen(true);

    setIsLoadingAvailableFormations(true);
    try {
      await loadAvailableFormations();
      const response = await fetch(apiUrl(`/formateurs/${formateur.id}/formations`), {
        headers: getAuthHeaders(accessToken),
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setEditError(tr("Impossible de charger les formations du formateur.", "Failed to load trainer trainings."));
        return;
      }

      setEditFormateurValues((prev) => ({
        ...prev,
        formationIds: Array.isArray(data)
          ? data
            .map((item) => item?.formation_id)
            .filter((value) => value !== null && value !== undefined)
            .map((value) => String(value))
          : [],
      }));
    } catch {
      setEditError(tr("Impossible de charger les formations du formateur.", "Failed to load trainer trainings."));
    } finally {
      setIsLoadingAvailableFormations(false);
    }
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeletingFormateur(null);
    setDeleteError("");
  };

  const handleOpenDeleteDialog = (formateur) => {
    setDeletingFormateur(formateur);
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreateFormateur = async () => {
    if (!newFormateur.nom.trim()) {
      setCreateError(tr("Le nom du formateur est obligatoire.", "Trainer name is required."));
      return;
    }
    if (!accessToken) {
      setCreateError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }

    setIsCreatingFormateur(true);
    setCreateError("");
    try {
      const { response, data } = await createFormateur({
        nom: newFormateur.nom,
        telephone: newFormateur.telephone,
        email: newFormateur.email,
        specialite: newFormateur.specialite,
        formation_ids: newFormateur.formationIds.map((item) => Number(item)),
      });
      if (!response.ok) {
        const detail = typeof data?.detail === "string"
          ? data.detail
          : tr("Impossible de creer le formateur.", "Failed to create trainer.");
        setCreateError(detail);
        return;
      }

      await loadFormateurs();
      closeCreateDialog();
    } catch {
      setCreateError(tr("Impossible de creer le formateur.", "Failed to create trainer."));
    } finally {
      setIsCreatingFormateur(false);
    }
  };

  const handleSubmitEditFormateur = async () => {
    if (!editingFormateur?.id) {
      setEditError(tr("Formateur introuvable.", "Trainer not found."));
      return;
    }
    if (!editFormateurValues.nom.trim()) {
      setEditError(tr("Le nom du formateur est obligatoire.", "Trainer name is required."));
      return;
    }
    if (!accessToken) {
      setEditError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }

    setIsUpdatingFormateur(true);
    setEditError("");
    try {
      const { response, data } = await updateFormateur(editingFormateur.id, {
        nom: editFormateurValues.nom,
        telephone: editFormateurValues.telephone,
        email: editFormateurValues.email,
        specialite: editFormateurValues.specialite,
        formation_ids: editFormateurValues.formationIds.map((item) => Number(item)),
      });
      if (!response.ok) {
        const detail = typeof data?.detail === "string"
          ? data.detail
          : tr("Impossible de modifier le formateur.", "Failed to update trainer.");
        setEditError(detail);
        return;
      }

      await loadFormateurs();
      closeEditDialog();
    } catch {
      setEditError(tr("Impossible de modifier le formateur.", "Failed to update trainer."));
    } finally {
      setIsUpdatingFormateur(false);
    }
  };

  const handleSubmitDeleteFormateur = async () => {
    if (!deletingFormateur?.id) {
      setDeleteError(tr("Formateur introuvable.", "Trainer not found."));
      return;
    }
    if (!accessToken) {
      setDeleteError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }

    setIsDeletingFormateur(true);
    setDeleteError("");
    try {
      const { response, data } = await deleteFormateur(deletingFormateur.id);
      if (!response.ok) {
        const detail = typeof data?.detail === "string"
          ? data.detail
          : tr("Impossible de supprimer le formateur.", "Failed to delete trainer.");
        setDeleteError(detail);
        return;
      }

      if (selectedFormateur?.id === deletingFormateur.id) {
        closeDetailsDialog();
      }
      if (collaborateursDialogFormateur?.id === deletingFormateur.id) {
        closeCollaborateursDialog();
      }

      await loadFormateurs();
      closeDeleteDialog();
    } catch {
      setDeleteError(tr("Impossible de supprimer le formateur.", "Failed to delete trainer."));
    } finally {
      setIsDeletingFormateur(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">{tr("Gestion des Formateurs", "Trainer Management")}</h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">{tr("Liste et disponibilite des formateurs", "Trainer list and availability")}</p>
        </div>
        {!isObserver ? (
          <Button
            className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]"
            onClick={async () => {
              setIsCreateDialogOpen(true);
              setCreateError("");
              setIsLoadingAvailableFormations(true);
              try {
                await loadAvailableFormations();
              } catch {
                setAvailableFormationsError(
                  tr("Impossible de charger les formations.", "Failed to load trainings."),
                );
              } finally {
                setIsLoadingAvailableFormations(false);
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {tr("Definir un formateur", "Create a trainer")}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <FormateursStat icon={GraduationCap} title="Total Formateurs" value={totalFormateurs} color={{ bg: "bg-[#f3edff]", text: "text-[#9029ff]" }} />
        <FormateursStat icon={GraduationCap} title="Actifs" value={activeFormateurs} color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
        <FormateursStat icon={BookOpen} title="Formations assignees" value={totalAssignedFormations} color={{ bg: "bg-[#fff2e4]", text: "text-[#fc6200]" }} />
        <FormateursStat icon={Mail} title="Avec contact" value={withContactInfo} color={{ bg: "bg-[#e8f0ff]", text: "text-[#0f63f2]" }} />
      </div>

      {loadError ? (
        <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-[#8a1d1d] shadow-sm">
          {loadError}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {formateurs.map((formateur) => {
          const specialites = getSpecialites(formateur.specialite);

          return (
            <Card key={formateur.id} className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0f63f2] to-[#005ca9] text-[18px] font-medium text-white">
                    {getInitials(formateur.nom)}
                  </div>
                  <div>
                    <h3 className="leoni-display-lg text-[34px] font-medium text-[#191c20]">{formateur.nom}</h3>
                    <p className="mt-1 text-[15px] text-[#5f6777]">{formateur.specialite || tr("Specialite non definie", "Specialty not set")}</p>
                  </div>
                </div>

                <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[14px] text-[#005ca9]">
                  {tr("Formateur", "Trainer")}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[13px] text-[#5f6777]">{tr("Specialites", "Specialties")}</p>
                  <div className="flex flex-wrap gap-2">
                    {specialites.length > 0 ? specialites.map((specialite) => (
                      <Badge key={specialite} variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[13px]">
                        {specialite}
                      </Badge>
                    )) : (
                      <Badge variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[13px]">
                        {tr("Non definie", "Not set")}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[13px] text-[#5f6777]">{tr("Formations donnees", "Delivered trainings")}</p>
                    <p className="leoni-metric text-[32px] font-medium text-[#191c20]">{formateur.formations}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#5f6777]">{tr("Collaborateurs formes", "Taught collaborators")}</p>
                    <p className="leoni-metric text-[32px] font-medium text-[#191c20]">{formateur.collaborateurs ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  className="h-9 flex-1 rounded-xl border-[#ccd4d8] text-[16px]"
                  onClick={() => handleOpenDetailsDialog(formateur)}
                >
                  {tr("Voir details", "View details")}
                </Button>
                <Button
                  className="h-9 flex-1 rounded-xl bg-[#005ca9] text-[16px] font-medium text-white hover:bg-[#004a87]"
                  onClick={() => handleOpenCollaborateursDialog(formateur)}
                >
                  {tr("Voir liste collaborateurs", "View collaborator list")}
                </Button>
              </div>
              {!isObserver ? (
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    className="h-9 flex-1 rounded-xl border-[#ccd4d8] text-[16px]"
                    onClick={() => handleOpenEditDialog(formateur)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {tr("Modifier", "Edit")}
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-9 flex-1 rounded-xl"
                    onClick={() => handleOpenDeleteDialog(formateur)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {tr("Supprimer", "Delete")}
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {isDetailsDialogOpen && selectedFormateur ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeDetailsDialog}>
          <div
            className="leoni-rise-up flex h-[88vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-[24px] border border-[#dfe5e2] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#e2e8f0] px-7 py-5">
              <div>
                <h2 className="leoni-display-lg text-[30px] font-semibold leading-tight text-[#171a1f]">
                  {tr("Details du formateur", "Trainer details")}
                </h2>
                <p className="mt-1 text-[15px] text-[#64748b]">{selectedFormateur.nom}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isObserver ? (
                  <>
                    <Button variant="outline" className="rounded-xl" onClick={() => handleOpenEditDialog(selectedFormateur)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {tr("Modifier", "Edit")}
                    </Button>
                    <Button variant="destructive" className="rounded-xl" onClick={() => handleOpenDeleteDialog(selectedFormateur)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tr("Supprimer", "Delete")}
                    </Button>
                  </>
                ) : null}
                <Button variant="outline" className="rounded-xl" onClick={closeDetailsDialog}>
                  {tr("Fermer", "Close")}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-6">
              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Nom</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.nom}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Telephone</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.telephone || "-"}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Email</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.email || "-"}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">{tr("Specialite", "Specialty")}</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.specialite || "-"}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">{tr("Formations donnees", "Delivered trainings")}</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.formations}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">{tr("Collaborateurs formes", "Taught collaborators")}</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.collaborateurs ?? 0}</p></div>
              </div>

              <h3 className="mb-3 text-[22px] font-semibold text-[#171a1f]">{tr("Formations enseignees", "Taught trainings")}</h3>

              {formationsError ? (
                <div className="mb-4 rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
                  {formationsError}
                </div>
              ) : null}

              {formationsLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#5f6777]">
                  <AlertCircle className="h-4 w-4" />
                  {tr("Chargement des formations...", "Loading trainings...")}
                </div>
              ) : null}

              {!formationsLoading && !formationsError && formateurFormations.length === 0 ? (
                <p className="text-sm text-[#5f6777]">{tr("Aucune formation trouvee pour ce formateur.", "No trainings found for this trainer.")}</p>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {formateurFormations.map((formation) => (
                  <Card key={`${selectedFormateur.id}-${formation.formation_id}`} className="rounded-2xl border border-[#dfe5e2] bg-[#fbfdff] p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[20px] font-semibold text-[#191c20]">
                          {formation.code} - {formation.titre}
                        </h3>
                        <p className="mt-1 text-[14px] text-[#64748b]">{formation.domaine}</p>
                      </div>
                      <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[13px] font-medium text-[#005ca9]">
                        {formation.collaborateurs} {tr("collaborateurs", "collaborators")}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <p className="text-[12px] text-[#64748b]">{tr("Duree", "Duration")}</p>
                        <p className="text-[14px] font-medium text-[#1d2025]">
                          {formation.duree ? tr(`${formation.duree} jours`, `${formation.duree} days`) : "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <p className="text-[12px] text-[#64748b]">{tr("Derniere date", "Last date")}</p>
                        <p className="text-[14px] font-medium text-[#1d2025]">{formation.last_date || "-"}</p>
                      </div>
                    </div>
                    <Button className="mt-4 h-10 rounded-xl bg-[#005ca9] text-white hover:bg-[#004a87]" onClick={() => handleGoToFormationSection(formation)}>
                      {tr("Voir details formation", "Open training details")}
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <CollaborateursDialog
        tr={tr}
        isOpen={Boolean(collaborateursDialogFormateur)}
        formateur={collaborateursDialogFormateur}
        collaborateurs={formateurCollaborateurs}
        collaborateursLoading={collaborateursLoading}
        collaborateursError={collaborateursError}
        onClose={closeCollaborateursDialog}
      />

      <CreateFormateurDialog
        tr={tr}
        isOpen={!isObserver && isCreateDialogOpen}
        onClose={closeCreateDialog}
        formValues={newFormateur}
        onChange={handleCreateFieldChange}
        formations={availableFormations}
        selectedFormationIds={newFormateur.formationIds}
        onToggleFormation={handleToggleCreateFormation}
        onSubmit={handleSubmitCreateFormateur}
        isSubmitting={isCreatingFormateur}
        error={createError}
        isFormationsLoading={isLoadingAvailableFormations}
        formationsError={availableFormationsError}
      />

      <CreateFormateurDialog
        tr={tr}
        isOpen={!isObserver && isEditDialogOpen}
        onClose={closeEditDialog}
        formValues={editFormateurValues}
        onChange={handleEditFieldChange}
        formations={availableFormations}
        selectedFormationIds={editFormateurValues.formationIds}
        onToggleFormation={handleToggleEditFormation}
        onSubmit={handleSubmitEditFormateur}
        isSubmitting={isUpdatingFormateur}
        error={editError}
        title={tr("Modifier le formateur", "Edit trainer")}
        description={tr(
          "Mettez a jour les informations du formateur dans la base de donnees.",
          "Update the trainer information in the database.",
        )}
        submitLabel={tr("Enregistrer", "Save")}
        submittingLabel={tr("Enregistrement...", "Saving...")}
        isFormationsLoading={isLoadingAvailableFormations}
        formationsError={availableFormationsError}
      />

      <DeleteFormateurDialog
        tr={tr}
        isOpen={!isObserver && isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        formateur={deletingFormateur}
        onSubmit={handleSubmitDeleteFormateur}
        isSubmitting={isDeletingFormateur}
        error={deleteError}
      />
    </div>
  );
}


