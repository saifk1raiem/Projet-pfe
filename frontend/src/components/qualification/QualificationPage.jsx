import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { statutOptions } from "./constants";
import { CollaborateursTable } from "./CollaborateursTable";
import { ComparisonStat } from "./ComparisonStat";
import { ImportConflictDialog } from "./ImportConflictDialog";
import { QualificationFilters } from "./QualificationFilters";
import { QualificationPreviewCard } from "./QualificationPreviewCard";
import { UploadReportModal } from "./UploadReportModal";

const AUTO_REFRESH_INTERVAL_MS = 30000;

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

async function previewCollaboratorFiles(accessToken, files) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  return readJsonResponse(apiUrl("/admin/collaborateurs/preview"), {
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

async function importCollaboratorRows(accessToken, rows) {
  return readJsonResponse(apiUrl("/admin/collaborateurs/import-rows"), {
    method: "POST",
    headers: getAuthHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ rows }),
  });
}

export function QualificationPage({ onNavigateToPage, currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const isObserver = currentUser?.role === "observer";

  const [searchTerm, setSearchTerm] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [collaborateursData, setCollaborateursData] = useState([]);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState(null);
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
  const [previewImportType, setPreviewImportType] = useState(null);
  const [previewConflicts, setPreviewConflicts] = useState([]);
  const [previewFileErrors, setPreviewFileErrors] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const [previewErrorDetails, setPreviewErrorDetails] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState("");
  const [pageError, setPageError] = useState("");
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const inputRef = useRef(null);
  const isLiveRefreshPaused =
    isUploadOpen || isPreviewLoading || isImportingPreview || isConflictDialogOpen || pendingImportRows.length > 0;

  const applyQualificationsData = (rows) => {
    setCollaborateursData(rows);
    setSelectedCollaborateur((prev) => {
      if (!prev) return prev;
      return rows.find((item) => item.id === prev.id) ?? null;
    });
  };

  const loadQualifications = async () => {
    if (!accessToken) {
      applyQualificationsData([]);
      setPageError("");
      return [];
    }

    const { response, data } = await fetchQualifications(accessToken);
    if (!response.ok) {
      throw new Error("load_failed");
    }

    const rows = Array.isArray(data) ? data : [];
    applyQualificationsData(rows);
    setPageError("");
    return rows;
  };

  const totalCollaborateurs = collaborateursData.length;
  const enCoursCount = collaborateursData.filter((collab) => collab.statut === "En cours").length;
  const qualifieCount = collaborateursData.filter((collab) => collab.statut === "Qualifie").length;
  const nonAssocieeCount = collaborateursData.filter(
    (collab) => collab.statut === "Non associee" || collab.statut === "Non associe",
  ).length;
  const depassementCount = collaborateursData.filter((collab) => collab.statut === "Depassement").length;
  const availableGroups = Array.from(
    new Set(
      collaborateursData
        .map((collab) => collab.groupe)
        .filter((value) => typeof value === "string" && value.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!accessToken) {
      applyQualificationsData([]);
      setPageError("");
      return;
    }

    let cancelled = false;

    const syncQualifications = async () => {
      if (isLiveRefreshPaused) {
        return;
      }

      try {
        await loadQualifications();
        if (cancelled) return;
      } catch {
        if (!cancelled) {
          setPageError(tr("Impossible de charger les qualifications.", "Failed to load qualifications."));
        }
      }
    };

    syncQualifications();

    const intervalId = window.setInterval(() => {
      syncQualifications();
    }, AUTO_REFRESH_INTERVAL_MS);

    const handleWindowFocus = () => {
      syncQualifications();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncQualifications();
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
  }, [accessToken, isLiveRefreshPaused, tr]);

  const handleFileChange = (fileList) => {
    const incoming = Array.from(fileList || []).filter((file) => {
      const name = (file?.name || "").toLowerCase();
      return name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
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

  const applyPreviewPayload = (data, importType) => {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const conflicts = Array.isArray(data?.conflicts) ? data.conflicts : [];
    setPreviewRows(rows);
    setPendingImportRows(rows);
    setPreviewRowsCount(Number.isFinite(data?.rows_count) ? data.rows_count : rows.length);
    setPreviewColumnsDetected(Array.isArray(data?.columns_detected) ? data.columns_detected : []);
    setPreviewMappingUsed(
      data?.mapping_used && typeof data.mapping_used === "object" ? data.mapping_used : {},
    );
    setPreviewConflicts(conflicts);
    setPreviewFileErrors(Array.isArray(data?.file_errors) ? data.file_errors : []);
    setPreviewImportType(importType);
    setIsConflictDialogOpen(conflicts.length > 0);
    closeModal();
    setSelectedFiles([]);
  };

  const setPreviewFailure = (detail, fallbackMessage) => {
    if (typeof detail === "object" && detail !== null) {
      setPreviewError(detail.message || fallbackMessage);
      setPreviewErrorDetails(detail);
    } else {
      setPreviewError(detail || fallbackMessage);
      setPreviewErrorDetails(null);
    }
  };

  const shouldFallbackToCollaboratorPreview = (detail) => {
    if (!detail) return false;

    if (typeof detail === "string") {
      const normalized = detail.toLowerCase();
      return normalized.includes("collaborator data") || normalized.includes("qualification column");
    }

    const messages = [
      detail.message,
      ...(Array.isArray(detail.file_errors) ? detail.file_errors.map((item) => item?.error) : []),
    ]
      .filter((value) => typeof value === "string")
      .join(" ")
      .toLowerCase();

    return messages.includes("collaborator data") || messages.includes("qualification column");
  };

  const shouldFallbackAfterQualificationSuccess = (data) => {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const mapping = data?.mapping_used && typeof data.mapping_used === "object" ? data.mapping_used : {};
    if (rows.length > 0) {
      return false;
    }

    const hasIdentityMapping =
      Boolean(mapping.matricule) || Boolean(mapping.nom) || Boolean(mapping.prenom) || Boolean(mapping.nomprenom);
    const hasQualificationMapping = Boolean(mapping.competence);

    return hasIdentityMapping && !hasQualificationMapping;
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
    setPreviewImportType(null);
    setPreviewConflicts([]);
    setImportSummary(null);
    setImportError("");
    setIsConflictDialogOpen(false);

    try {
      const { response, data } = await previewQualificationFiles(accessToken, selectedFiles);
      if (!response.ok) {
        const detail = data?.detail;
        if (shouldFallbackToCollaboratorPreview(detail)) {
          const collaboratorPreview = await previewCollaboratorFiles(accessToken, selectedFiles);
          if (!collaboratorPreview.response.ok) {
            setPreviewFailure(
              collaboratorPreview.data?.detail,
              tr("Echec de lecture du fichier importe.", "Failed to parse upload file."),
            );
            return;
          }

          applyPreviewPayload(collaboratorPreview.data, "collaborateurs");
          return;
        }

        setPreviewFailure(
          detail,
          tr("Echec de lecture du fichier importe.", "Failed to parse upload file."),
        );
        return;
      }

      if (shouldFallbackAfterQualificationSuccess(data)) {
        const collaboratorPreview = await previewCollaboratorFiles(accessToken, selectedFiles);
        if (!collaboratorPreview.response.ok) {
          setPreviewFailure(
            collaboratorPreview.data?.detail,
            tr("Echec de lecture du fichier importe.", "Failed to parse upload file."),
          );
          return;
        }

        applyPreviewPayload(collaboratorPreview.data, "collaborateurs");
        return;
      }

      applyPreviewPayload(data, "qualification");
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
    if (previewConflicts.length > 0) {
      setIsConflictDialogOpen(true);
      return;
    }

    setIsImportingPreview(true);
    setImportError("");
    setPageError("");

    try {
      const importAction =
        previewImportType === "collaborateurs" ? importCollaboratorRows : importQualificationRows;
      const { response, data } = await importAction(accessToken, pendingImportRows);
      if (!response.ok) {
        setImportError(data?.detail || tr("Echec de l'import.", "Import failed."));
        return;
      }

      setImportSummary(previewImportType === "collaborateurs" ? data : data?.import_summary ?? null);
      setPendingImportRows([]);

      await loadQualifications();
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

  const handleApplyConflictResolution = (nextRows) => {
    setPreviewRows(nextRows);
    setPendingImportRows(nextRows);
    setPreviewRowsCount(nextRows.length);
    setPreviewConflicts([]);
    setIsConflictDialogOpen(false);
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
      collab.motif,
    ]
      .filter((value) => typeof value === "string")
      .map((value) => value.toLowerCase());

    const matchesSearch = !query || searchableFields.some((value) => value.includes(query));
    const matchesStatus = statusFilter === "all" || collab.statut === statusFilter;
    const matchesGroup = groupFilter === "all" || collab.groupe === groupFilter;

    return matchesSearch && matchesStatus && matchesGroup;
  });

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ComparisonStat
          title={tr("Total Collaborateurs", "Total Collaborators")}
          value={totalCollaborateurs}
          icon={Users}
          iconBg="bg-[#e8f0ff]"
          iconColor="text-[#0f63f2]"
          delay="30ms"
        />
        <ComparisonStat
          title={tr("En cours", "In progress")}
          value={enCoursCount}
          deltaPercent={totalCollaborateurs > 0 ? (enCoursCount / totalCollaborateurs) * 100 : 0}
          deltaLabel={tr("du total", "of total")}
          deltaVariant="share"
          icon={AlertCircle}
          iconBg="bg-[#fff2e4]"
          iconColor="text-[#fc6200]"
          delay="60ms"
        />
        <ComparisonStat
          title={tr("Qualifie", "Qualified")}
          value={qualifieCount}
          deltaPercent={totalCollaborateurs > 0 ? (qualifieCount / totalCollaborateurs) * 100 : 0}
          deltaLabel={tr("du total", "of total")}
          deltaVariant="share"
          icon={CheckCircle2}
          iconBg="bg-[#e8f1fb]"
          iconColor="text-[#005ca9]"
          delay="120ms"
        />
        <ComparisonStat
          title={tr("Non associee", "Not associated")}
          value={nonAssocieeCount}
          deltaPercent={totalCollaborateurs > 0 ? (nonAssocieeCount / totalCollaborateurs) * 100 : 0}
          deltaLabel={tr("du total", "of total")}
          deltaVariant="share"
          icon={XCircle}
          iconBg="bg-[#fdeeee]"
          iconColor="text-[#ea3737]"
          delay="180ms"
        />
        <ComparisonStat
          title={tr("Depassement", "Overdue")}
          value={depassementCount}
          deltaPercent={totalCollaborateurs > 0 ? (depassementCount / totalCollaborateurs) * 100 : 0}
          deltaLabel={tr("du total", "of total")}
          deltaVariant="share"
          icon={AlertTriangle}
          iconBg="bg-[#f3edff]"
          iconColor="text-[#7b35e8]"
          delay="210ms"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="leoni-display-lg text-[30px] font-semibold leading-tight text-[#171a1f]">
            {tr("Suivi Qualification", "Qualification Tracking")}
          </h2>
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

        <CollaborateursTable
          rows={filteredCollaborateurs}
          onViewDetails={handleViewCollaborateur}
          selectedCollaborateur={selectedCollaborateur}
          onCloseDetails={() => setSelectedCollaborateur(null)}
        />
      </div>

      <QualificationPreviewCard
        tr={tr}
        previewRowsCount={previewRowsCount}
        previewError={previewError}
        previewErrorDetails={previewErrorDetails}
        previewFileErrors={previewFileErrors}
        previewRows={previewRows}
        previewColumnsDetected={previewColumnsDetected}
        previewMappingUsed={previewMappingUsed}
        previewImportType={previewImportType}
        previewConflictsCount={previewConflicts.length}
        canImport={pendingImportRows.length > 0}
        isImporting={isImportingPreview}
        onImport={handleImportPreview}
        onReviewConflicts={() => setIsConflictDialogOpen(true)}
        importSummary={importSummary}
        importError={importError}
      />

      <ImportConflictDialog
        tr={tr}
        isOpen={isConflictDialogOpen}
        conflicts={previewConflicts}
        rows={previewRows}
        onClose={() => setIsConflictDialogOpen(false)}
        onApply={handleApplyConflictResolution}
      />

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
