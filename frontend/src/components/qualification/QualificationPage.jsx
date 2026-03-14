import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Users } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import {
  collaborateursQualification,
  MAX_LAST_FORMATION_AGE_DAYS,
  statutOptions,
} from "./constants";
import { hasRecentFormation } from "./dateUtils";
import { CollaborateursTable } from "./CollaborateursTable";
import { ComparisonStat } from "./ComparisonStat";
import { DeleteCollaborateurDialog } from "./DeleteCollaborateurDialog";
import { FormationsDialog } from "./FormationsDialog";
import { QualificationFilters } from "./QualificationFilters";
import { QualificationPreviewCard } from "./QualificationPreviewCard";
import { UploadReportModal } from "./UploadReportModal";

const getAuthHeaders = (accessToken, headers = {}) =>
  accessToken ? { ...headers, Authorization: `Bearer ${accessToken}` } : headers;

async function readJsonResponse(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function fetchQualifications(accessToken) {
  return readJsonResponse(apiUrl("/qualification"), {
    headers: getAuthHeaders(accessToken),
  });
}

async function previewQualificationFiles(accessToken, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  return readJsonResponse(apiUrl("/qualification/preview"), {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: formData,
  });
}

async function importQualificationRows(accessToken, rows) {
  return readJsonResponse(apiUrl("/qualification/import"), {
    method: "POST",
    headers: getAuthHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ rows }),
  });
}

async function fetchCollaboratorFormations(accessToken, matricule) {
  return readJsonResponse(
    apiUrl(`/qualification/${encodeURIComponent(matricule)}/formations`),
    {
      headers: getAuthHeaders(accessToken),
    },
  );
}

async function deleteCollaborator(accessToken, matricule) {
  const response = await fetch(
    apiUrl(`/qualification/${encodeURIComponent(matricule)}`),
    {
      method: "DELETE",
      headers: getAuthHeaders(accessToken),
    },
  );

  const data =
    response.status === 204 ? {} : await response.json().catch(() => ({}));

  return { response, data };
}

export function QualificationPage({ onNavigateToPage, currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const isObserver = currentUser?.role === "observer";

  const [activeTab, setActiveTab] = useState("induction");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [collaborateursData, setCollaborateursData] = useState(collaborateursQualification);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState(null);
  const [collaborateurToDelete, setCollaborateurToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingCollaborateur, setIsDeletingCollaborateur] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImportingPreview, setIsImportingPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [pendingImportRows, setPendingImportRows] = useState([]);
  const [previewRowsCount, setPreviewRowsCount] = useState(0);
  const [previewColumnsDetected, setPreviewColumnsDetected] = useState([]);
  const [previewMappingUsed, setPreviewMappingUsed] = useState({});
  const [previewFileErrors, setPreviewFileErrors] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const [previewErrorDetails, setPreviewErrorDetails] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState("");
  const [pageError, setPageError] = useState("");
  const [isFormationsDialogOpen, setIsFormationsDialogOpen] = useState(false);
  const [formationsCollaborateur, setFormationsCollaborateur] = useState(null);
  const [formationsHistory, setFormationsHistory] = useState([]);
  const [formationsHistoryLoading, setFormationsHistoryLoading] = useState(false);
  const [formationsHistoryError, setFormationsHistoryError] = useState("");
  const inputRef = useRef(null);

  const totalCollaborateurs = collaborateursData.length;
  const inductionCount = collaborateursData.filter((collab) => collab.phase === "induction").length;
  const qualificationCount = collaborateursData.filter((collab) => collab.phase === "qualification").length;
  const inductionPercent = totalCollaborateurs > 0 ? (inductionCount / totalCollaborateurs) * 100 : 0;
  const qualificationPercent = totalCollaborateurs > 0 ? (qualificationCount / totalCollaborateurs) * 100 : 0;
  const availableGroups = Array.from(
    new Set(
      collaborateursData
        .map((collab) => collab.groupe)
        .filter((value) => typeof value === "string" && value.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!accessToken) {
      setPageError("");
      return;
    }

    let cancelled = false;

    const loadQualifications = async () => {
      try {
        const { response, data } = await fetchQualifications(accessToken);
        if (!response.ok) {
          if (!cancelled) {
            setPageError(tr("Impossible de charger les qualifications.", "Failed to load qualifications."));
          }
          return;
        }

        if (!cancelled) {
          setCollaborateursData(Array.isArray(data) ? data : []);
          setPageError("");
        }
      } catch {
        if (!cancelled) {
          setPageError(tr("Impossible de charger les qualifications.", "Failed to load qualifications."));
        }
      }
    };

    loadQualifications();
    return () => {
      cancelled = true;
    };
  }, [accessToken, tr]);

  const handleFileChange = (fileList) => {
    const incoming = Array.from(fileList || []).filter((file) => {
      const name = (file?.name || "").toLowerCase();
      return name.endsWith(".xlsx") || name.endsWith(".xls");
    });
    if (!incoming.length) return;

    setSelectedFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const merged = [...prev];

      incoming.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      });

      return merged;
    });
  };

  const closeModal = () => {
    setIsUploadOpen(false);
    setIsDragging(false);
  };

  const handleSubmit = async () => {
    if (!selectedFiles.length) return;
    if (!accessToken) {
      setPreviewError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      setPreviewErrorDetails(null);
      return;
    }

    setIsPreviewLoading(true);
    setPageError("");
    setPreviewError("");
    setPreviewErrorDetails(null);
    setPreviewFileErrors([]);
    setPreviewRows([]);
    setPendingImportRows([]);
    setPreviewRowsCount(0);
    setPreviewColumnsDetected([]);
    setPreviewMappingUsed({});
    setImportSummary(null);
    setImportError("");

    try {
      const { response, data } = await previewQualificationFiles(accessToken, selectedFiles);
      if (!response.ok) {
        const detail = data?.detail;
        if (typeof detail === "object" && detail !== null) {
          setPreviewError(detail.message || tr("Echec de lecture du fichier Excel.", "Failed to parse Excel file."));
          setPreviewErrorDetails(detail);
        } else {
          setPreviewError(detail || tr("Echec de lecture du fichier Excel.", "Failed to parse Excel file."));
          setPreviewErrorDetails(null);
        }
        return;
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];
      setPreviewRows(rows);
      setPendingImportRows(rows);
      setPreviewRowsCount(Number.isFinite(data.rows_count) ? data.rows_count : rows.length);
      setPreviewColumnsDetected(Array.isArray(data.columns_detected) ? data.columns_detected : []);
      setPreviewMappingUsed(
        data.mapping_used && typeof data.mapping_used === "object" ? data.mapping_used : {},
      );
      setPreviewFileErrors(Array.isArray(data.file_errors) ? data.file_errors : []);
      closeModal();
      setSelectedFiles([]);
    } catch (error) {
      setPreviewError(
        error?.message || tr("Erreur reseau lors de l'envoi du fichier.", "Network error while uploading file."),
      );
      setPreviewErrorDetails(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleImportPreview = async () => {
    if (!pendingImportRows.length) return;
    if (!accessToken) {
      setImportError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }

    setIsImportingPreview(true);
    setImportError("");
    setPageError("");

    try {
      const { response, data } = await importQualificationRows(accessToken, pendingImportRows);
      if (!response.ok) {
        setImportError(data?.detail || tr("Echec de l'import.", "Import failed."));
        return;
      }

      setImportSummary(data?.import_summary ?? null);
      setPendingImportRows([]);

      const refreshed = await fetchQualifications(accessToken);
      if (refreshed.response.ok) {
        setCollaborateursData(Array.isArray(refreshed.data) ? refreshed.data : []);
      }
    } catch (error) {
      setImportError(
        error?.message || tr("Erreur reseau lors de l'import.", "Network error while importing."),
      );
    } finally {
      setIsImportingPreview(false);
    }
  };

  const handleViewCollaborateur = (collab) => {
    setSelectedCollaborateur((prev) => (prev?.id === collab.id ? null : collab));
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
      const { response, data } = await fetchCollaboratorFormations(accessToken, collab.matricule);
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

  const closeFormationsDialog = () => {
    setIsFormationsDialogOpen(false);
    setFormationsCollaborateur(null);
    setFormationsHistory([]);
    setFormationsHistoryError("");
  };

  const handleGoToFormationSection = (formation) => {
    closeFormationsDialog();
    onNavigateToPage?.("formation", { formationId: formation.formation_id });
  };

  const handleAskDeleteCollaborateur = (collab) => {
    if (isObserver) return;
    setCollaborateurToDelete(collab);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCollaborateur = async () => {
    if (!collaborateurToDelete) return;

    const matricule = collaborateurToDelete.matricule;
    setIsDeletingCollaborateur(true);
    setPageError("");

    try {
      if (accessToken) {
        const { response, data } = await deleteCollaborator(accessToken, matricule);
        if (!response.ok) {
          setPageError(
            data?.detail || tr("Impossible de supprimer le collaborateur.", "Failed to delete collaborator."),
          );
          return;
        }
      }

      setCollaborateursData((prev) => prev.filter((collab) => collab.matricule !== matricule));
      setSelectedCollaborateur((prev) => (prev?.matricule === matricule ? null : prev));
      setIsDeleteDialogOpen(false);
      setCollaborateurToDelete(null);
    } catch {
      setPageError(tr("Impossible de supprimer le collaborateur.", "Failed to delete collaborator."));
    } finally {
      setIsDeletingCollaborateur(false);
    }
  };

  const filteredCollaborateurs = collaborateursData.filter((collab) => {
    const query = searchTerm.trim().toLowerCase();
    const searchableFields = [
      collab.nom,
      collab.prenom,
      collab.matricule,
      collab.fonction,
      collab.centre_cout,
      collab.groupe,
      collab.segment,
    ]
      .filter((value) => typeof value === "string")
      .map((value) => value.toLowerCase());

    const matchesSearch = !query || searchableFields.some((value) => value.includes(query));
    const matchesStatus = statusFilter === "all" || collab.statut === statusFilter;
    const matchesGroup = groupFilter === "all" || collab.groupe === groupFilter;
    const matchesLastFormationWindow =
      activeTab !== "qualification" || hasRecentFormation(collab.derniereFormation, MAX_LAST_FORMATION_AGE_DAYS);

    return collab.phase === activeTab && matchesSearch && matchesStatus && matchesGroup && matchesLastFormationWindow;
  });

  const tableLabels = {
    viewDetails: tr("Voir details", "View details"),
    viewFormations: tr("Voir formations", "View trainings"),
    delete: tr("Supprimer", "Delete"),
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="leoni-rise-up-soft">
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">
            {tr("Gestion des Qualifications", "Qualification Management")}
          </h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">
            {tr(
              "Suivi et validation des qualifications des collaborateurs",
              "Tracking and validation of collaborator qualifications",
            )}
          </p>
        </div>

        <Button
          onClick={() => setIsUploadOpen(true)}
          className="leoni-rise-up-soft h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]"
          disabled={isObserver}
        >
          <FileText className="mr-2 h-4 w-4" />
          {tr("Donner le rapport du jour", "Submit today's report")}
        </Button>
      </div>

      {pageError ? (
        <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-sm text-[#8a1d1d]">
          {pageError}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ComparisonStat
          title="Total Collaborateurs"
          value={totalCollaborateurs}
          deltaPercent={totalCollaborateurs > 0 ? 100 : 0}
          icon={Users}
          iconBg="bg-[#e8f0ff]"
          iconColor="text-[#0f63f2]"
          delay="30ms"
        />
        <ComparisonStat
          title="Induction"
          value={inductionCount}
          deltaPercent={inductionPercent}
          icon={AlertCircle}
          iconBg="bg-[#fff2e4]"
          iconColor="text-[#fc6200]"
          delay="60ms"
        />
        <ComparisonStat
          title="Qualification"
          value={qualificationCount}
          deltaPercent={qualificationPercent}
          icon={CheckCircle2}
          iconBg="bg-[#e8f1fb]"
          iconColor="text-[#005ca9]"
          delay="120ms"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="leoni-display-lg text-[30px] font-semibold leading-tight text-[#171a1f]">
            {tr("Repartition Collaborateurs", "Collaborator Distribution")}
          </h2>
          <TabsList className="h-11 rounded-xl bg-[#e8eef6] p-1">
            <TabsTrigger value="induction" className="rounded-lg px-5 text-[15px]">
              Induction
            </TabsTrigger>
            <TabsTrigger value="qualification" className="rounded-lg px-5 text-[15px]">
              Qualification
            </TabsTrigger>
          </TabsList>
        </div>

        <QualificationFilters
          tr={tr}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          isFiltersOpen={isFiltersOpen}
          onToggleFilters={() => setIsFiltersOpen((prev) => !prev)}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          groupFilter={groupFilter}
          onGroupFilterChange={setGroupFilter}
          availableGroups={availableGroups}
          statutOptions={statutOptions}
          onResetFilters={() => {
            setStatusFilter("all");
            setGroupFilter("all");
            setSearchTerm("");
          }}
        />

        {["induction", "qualification"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="m-0">
            <CollaborateursTable
              rows={filteredCollaborateurs}
              onViewDetails={handleViewCollaborateur}
              onViewFormations={handleOpenFormationsDialog}
              onAskDelete={handleAskDeleteCollaborateur}
              selectedCollaborateur={selectedCollaborateur}
              onCloseDetails={() => setSelectedCollaborateur(null)}
              canManage={!isObserver}
              labels={tableLabels}
            />
          </TabsContent>
        ))}
      </Tabs>

      <QualificationPreviewCard
        tr={tr}
        previewRowsCount={previewRowsCount}
        previewError={previewError}
        previewErrorDetails={previewErrorDetails}
        previewFileErrors={previewFileErrors}
        previewRows={previewRows}
        previewColumnsDetected={previewColumnsDetected}
        previewMappingUsed={previewMappingUsed}
        canImport={pendingImportRows.length > 0}
        isImporting={isImportingPreview}
        onImport={handleImportPreview}
        importSummary={importSummary}
        importError={importError}
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

      <UploadReportModal
        tr={tr}
        isOpen={!isObserver && isUploadOpen}
        onClose={closeModal}
        inputRef={inputRef}
        onFileChange={handleFileChange}
        isDragging={isDragging}
        onSetDragging={setIsDragging}
        selectedFiles={selectedFiles}
        isPreviewLoading={isPreviewLoading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
