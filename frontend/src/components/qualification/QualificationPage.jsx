import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { statutOptions } from "./constants";
import { CollaborateursTable } from "./CollaborateursTable";
import { ComparisonStat } from "./ComparisonStat";
import { QualificationFilters } from "./QualificationFilters";
import { QualificationMovementTab } from "./QualificationMovementTab";
import { QualificationPreviewCard } from "./QualificationPreviewCard";
import { EditQualificationDialog } from "./EditQualificationDialog";
import { UploadNotificationStack } from "./UploadNotificationStack";
import { UploadReportModal } from "./UploadReportModal";
import {
  saveQualificationUploadReview,
} from "../../lib/qualificationUploadReview";
import {
  buildUploadNotifications,
  filterPreviewRowsByAlert,
  PREVIEW_ALERT_FILTERS,
} from "./uploadAlertUtils";
import {
  fetchCollaborateurPresenceHistory,
  getEmptyPresenceHistoryState,
  normalizePresenceHistoryPayload,
} from "../collaborateurs/presenceHistory";
import { toDateInputValue } from "../collaborateurs/helpers";

const AUTO_REFRESH_INTERVAL_MS = 30000;
const EMPTY_EDIT_QUALIFICATION_FORM = {
  formation_id: "",
  formateur_id: "",
  statut: "Non associee",
  date_association_systeme: "",
  motif: "",
};

const ImportMissingDataDialog = lazy(() =>
  import("./ImportMissingDataDialog").then((module) => ({
    default: module.ImportMissingDataDialog,
  })),
);

const ImportConflictDialog = lazy(() =>
  import("./ImportConflictDialog").then((module) => ({
    default: module.ImportConflictDialog,
  })),
);

const ImportUnmatchedRowsDialog = lazy(() =>
  import("./ImportUnmatchedRowsDialog").then((module) => ({
    default: module.ImportUnmatchedRowsDialog,
  })),
);

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

async function fetchFormationOptions(accessToken) {
  return readJsonResponse(apiUrl("/formations"), {
    headers: getAuthHeaders(accessToken),
  });
}

async function fetchFormateurOptions(accessToken) {
  return readJsonResponse(apiUrl("/formateurs"), {
    headers: getAuthHeaders(accessToken),
  });
}

async function updateQualification(accessToken, qualificationId, payload) {
  return readJsonResponse(apiUrl(`/qualification/${qualificationId}`), {
    method: "PATCH",
    headers: getAuthHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });
}

const buildPreviewRowId = (row, index) =>
  [
    row.matricule || `${row.nom || "unknown"}-${row.prenom || "unknown"}`,
    row.formation_id ?? row.competence ?? "no-formation",
    row.date_association_systeme ?? row.date_completion ?? "no-date",
    index,
  ].join("::");

const withPreviewRowIds = (rows) =>
  rows.map((row, index) => ({
    ...row,
    __previewRowId: row.__previewRowId || buildPreviewRowId(row, index),
  }));

const mapIssuesToPreviewRows = (issues, rows) =>
  issues.map((issue) => ({
    ...issue,
    rowId: rows[issue.row_index]?.__previewRowId ?? null,
  }));

const mapUnmatchedRows = (issues) =>
  issues.map((issue, index) => {
    const row = issue?.row && typeof issue.row === "object" ? issue.row : {};
    const previewRow =
      row.__previewRowId
        ? row
        : {
            ...row,
            __previewRowId: buildPreviewRowId(row, index),
          };
    return {
      ...issue,
      row: previewRow,
    };
  });

const filterIssuesForRows = (issues, rows) => {
  const rowIds = new Set(rows.map((row) => row.__previewRowId).filter(Boolean));
  return issues.filter((issue) => issue.rowId && rowIds.has(issue.rowId));
};

const getErrorMessageFromDetail = (detail, fallbackMessage) => {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (detail && typeof detail === "object" && typeof detail.message === "string" && detail.message.trim()) {
    return detail.message;
  }
  return fallbackMessage;
};

const persistUploadReview = ({
  importType,
  conflicts,
  missingRequirements,
  unmatchedRows,
  fileErrors,
}) => {
  saveQualificationUploadReview({
    importType,
    conflicts: Array.isArray(conflicts) ? conflicts : [],
    missingRequirements: Array.isArray(missingRequirements) ? missingRequirements : [],
    unmatchedRows: Array.isArray(unmatchedRows) ? unmatchedRows : [],
    fileErrors: Array.isArray(fileErrors) ? fileErrors : [],
  });
};

export function QualificationPage({ onNavigateToPage, currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const isObserver = currentUser?.role === "observer";

  const [activeTab, setActiveTab] = useState("tracking");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [collaborateursData, setCollaborateursData] = useState([]);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState(null);
  const [presenceHistoryByMatricule, setPresenceHistoryByMatricule] = useState({});
  const [availableFormations, setAvailableFormations] = useState([]);
  const [availableFormateurs, setAvailableFormateurs] = useState([]);
  const [isEditQualificationOpen, setIsEditQualificationOpen] = useState(false);
  const [editingQualification, setEditingQualification] = useState(null);
  const [editQualificationValues, setEditQualificationValues] = useState(EMPTY_EDIT_QUALIFICATION_FORM);
  const [editQualificationError, setEditQualificationError] = useState("");
  const [isSavingQualification, setIsSavingQualification] = useState(false);
  const [isLoadingQualificationOptions, setIsLoadingQualificationOptions] = useState(false);
  const [qualificationOptionsError, setQualificationOptionsError] = useState("");
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
  const [previewMissingRequirements, setPreviewMissingRequirements] = useState([]);
  const [previewUnmatchedRows, setPreviewUnmatchedRows] = useState([]);
  const [activePreviewAlertFilter, setActivePreviewAlertFilter] = useState(null);
  const [previewFileErrors, setPreviewFileErrors] = useState([]);
  const [previewError, setPreviewError] = useState("");
  const [previewErrorDetails, setPreviewErrorDetails] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState("");
  const [pageError, setPageError] = useState("");
  const [isMissingDataDialogOpen, setIsMissingDataDialogOpen] = useState(false);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [isUnmatchedRowsDialogOpen, setIsUnmatchedRowsDialogOpen] = useState(false);
  const inputRef = useRef(null);
  const previewCardRef = useRef(null);
  const selectedCollaborateurMatriculeRef = useRef("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const isLiveRefreshPaused =
    isEditQualificationOpen ||
    isSavingQualification ||
    isUploadOpen ||
    isPreviewLoading ||
    isImportingPreview ||
    isMissingDataDialogOpen ||
    isConflictDialogOpen ||
    isUnmatchedRowsDialogOpen ||
    pendingImportRows.length > 0;

  const applyQualificationsData = (rows) => {
    setCollaborateursData(rows);
    setSelectedCollaborateur((prev) => {
      if (!prev) return prev;
      return rows.find((item) => item.id === prev.id) ?? null;
    });
  };

  useEffect(() => {
    selectedCollaborateurMatriculeRef.current = selectedCollaborateur?.matricule ?? "";
  }, [selectedCollaborateur?.matricule]);

  const loadQualifications = async () => {
    if (!accessToken) {
      applyQualificationsData([]);
      setPageError("");
      setPresenceHistoryByMatricule({});
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

  const loadQualificationOptions = async () => {
    if (!accessToken) {
      setQualificationOptionsError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }

    const [formationsResult, formateursResult] = await Promise.all([
      fetchFormationOptions(accessToken),
      fetchFormateurOptions(accessToken),
    ]);

    if (!formationsResult.response.ok || !formateursResult.response.ok) {
      throw new Error("load_options_failed");
    }

    setAvailableFormations(Array.isArray(formationsResult.data) ? formationsResult.data : []);
    setAvailableFormateurs(Array.isArray(formateursResult.data) ? formateursResult.data : []);
    setQualificationOptionsError("");
  };

  const closeEditQualificationDialog = () => {
    setIsEditQualificationOpen(false);
    setEditingQualification(null);
    setEditQualificationValues(EMPTY_EDIT_QUALIFICATION_FORM);
    setEditQualificationError("");
    setQualificationOptionsError("");
  };

  const handleEditQualificationFieldChange = (field, value) => {
    setEditQualificationValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOpenEditQualificationDialog = async (row) => {
    if (!row?.qualification_row_id) {
      return;
    }

    const storedStatus =
      row.qualification_statut === "Completee"
        ? "Qualifie"
        : row.qualification_statut === "En cours"
          ? "En cours"
          : "Non associee";

    setEditingQualification(row);
    setEditQualificationValues({
      formation_id: row.formation_id === null || row.formation_id === undefined ? "" : String(row.formation_id),
      formateur_id: row.formateur_id === null || row.formateur_id === undefined ? "" : String(row.formateur_id),
      statut: storedStatus,
      date_association_systeme: toDateInputValue(row.date_association_systeme),
      motif: row.motif || "",
    });
    setEditQualificationError("");
    setQualificationOptionsError("");
    setIsEditQualificationOpen(true);

    setIsLoadingQualificationOptions(true);
    try {
      await loadQualificationOptions();
    } catch {
      setQualificationOptionsError(
        tr(
          "Impossible de charger les formations et formateurs.",
          "Failed to load trainings and trainers.",
        ),
      );
    } finally {
      setIsLoadingQualificationOptions(false);
    }
  };

  const handleSubmitEditQualification = async () => {
    if (!editingQualification?.qualification_row_id) {
      setEditQualificationError(tr("Qualification introuvable.", "Qualification not found."));
      return;
    }
    if (!accessToken) {
      setEditQualificationError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }
    if (!editQualificationValues.formation_id && editQualificationValues.formateur_id) {
      setEditQualificationError(
        tr(
          "Choisissez d'abord une formation avant d'affecter un formateur.",
          "Select a training before assigning a trainer.",
        ),
      );
      return;
    }

    setIsSavingQualification(true);
    setEditQualificationError("");
    try {
      const payload = {
        formation_id: editQualificationValues.formation_id ? Number(editQualificationValues.formation_id) : null,
        formateur_id: editQualificationValues.formateur_id ? Number(editQualificationValues.formateur_id) : null,
        statut: editQualificationValues.statut || "Non associee",
        date_association_systeme: editQualificationValues.date_association_systeme || null,
        motif: editQualificationValues.motif || null,
      };

      const { response, data } = await updateQualification(
        accessToken,
        editingQualification.qualification_row_id,
        payload,
      );
      if (!response.ok) {
        setEditQualificationError(
          typeof data?.detail === "string"
            ? data.detail
            : tr("Impossible de modifier la qualification.", "Failed to update qualification."),
        );
        return;
      }

      await loadQualifications();
      if (selectedCollaborateurMatriculeRef.current) {
        await loadCollaborateurPresenceHistory(selectedCollaborateurMatriculeRef.current);
      }
      closeEditQualificationDialog();
    } catch {
      setEditQualificationError(tr("Impossible de modifier la qualification.", "Failed to update qualification."));
    } finally {
      setIsSavingQualification(false);
    }
  };

  const totalQualifications = collaborateursData.length;
  const enCoursCount = useMemo(
    () => collaborateursData.filter((collab) => collab.statut === "En cours").length,
    [collaborateursData],
  );
  const qualifieCount = useMemo(
    () => collaborateursData.filter((collab) => collab.statut === "Qualifie").length,
    [collaborateursData],
  );
  const nonAssocieeCount = useMemo(
    () =>
      collaborateursData.filter(
        (collab) => collab.statut === "Non associee" || collab.statut === "Non associe",
      ).length,
    [collaborateursData],
  );
  const depassementCount = useMemo(
    () => collaborateursData.filter((collab) => collab.statut === "Depassement").length,
    [collaborateursData],
  );
  const availableGroups = useMemo(
    () =>
      Array.from(
        new Set(
          collaborateursData
            .map((collab) => collab.groupe)
            .filter((value) => typeof value === "string" && value.trim().length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [collaborateursData],
  );

  useEffect(() => {
    if (!accessToken) {
      applyQualificationsData([]);
      setPageError("");
      setPresenceHistoryByMatricule({});
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

        if (selectedCollaborateurMatriculeRef.current) {
          await loadCollaborateurPresenceHistory(selectedCollaborateurMatriculeRef.current);
        }
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

  useEffect(() => {
    if (!selectedCollaborateur?.matricule || !accessToken) {
      return;
    }

    loadCollaborateurPresenceHistory(selectedCollaborateur.matricule);
  }, [accessToken, selectedCollaborateur?.matricule, tr]);

  useEffect(() => {
    if (!activePreviewAlertFilter) {
      return;
    }

    const filteredRows = filterPreviewRowsByAlert(previewRows, activePreviewAlertFilter);
    if (filteredRows.length === 0) {
      setActivePreviewAlertFilter(null);
    }
  }, [activePreviewAlertFilter, previewRows]);

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

  const scrollToPreviewCard = () => {
    setActiveTab("tracking");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        previewCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  const syncPreviewRows = (nextRows, { clearConflicts = false, clearMissingRequirements = false } = {}) => {
    setPreviewRows(nextRows);
    setPendingImportRows(nextRows);
    setPreviewRowsCount(nextRows.length);
    setPreviewConflicts((prev) => (clearConflicts ? [] : filterIssuesForRows(prev, nextRows)));
    setPreviewMissingRequirements((prev) =>
      clearMissingRequirements ? [] : filterIssuesForRows(prev, nextRows),
    );
  };

  const applyPreviewPayload = (data, importType) => {
    const rows = withPreviewRowIds(Array.isArray(data?.rows) ? data.rows : []);
    const conflicts = mapIssuesToPreviewRows(Array.isArray(data?.conflicts) ? data.conflicts : [], rows);
    const missingRequirements = mapIssuesToPreviewRows(
      Array.isArray(data?.missing_requirements) ? data.missing_requirements : [],
      rows,
    );
    const unmatchedRows = mapUnmatchedRows(Array.isArray(data?.unmatched_rows) ? data.unmatched_rows : []);
    setPreviewRows(rows);
    setPendingImportRows(rows);
    setPreviewRowsCount(rows.length);
    setPreviewColumnsDetected(Array.isArray(data?.columns_detected) ? data.columns_detected : []);
    setPreviewMappingUsed(
      data?.mapping_used && typeof data.mapping_used === "object" ? data.mapping_used : {},
    );
    setPreviewConflicts(conflicts);
    setPreviewMissingRequirements(missingRequirements);
    setPreviewUnmatchedRows(unmatchedRows);
    setActivePreviewAlertFilter(null);
    setPreviewFileErrors(Array.isArray(data?.file_errors) ? data.file_errors : []);
    setPreviewImportType(importType);
    setActiveTab("tracking");
    setIsMissingDataDialogOpen(false);
    setIsConflictDialogOpen(false);
    setIsUnmatchedRowsDialogOpen(false);
    persistUploadReview({
      importType,
      conflicts,
      missingRequirements,
      unmatchedRows,
      fileErrors: Array.isArray(data?.file_errors) ? data.file_errors : [],
    });
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
    setActiveTab("tracking");
    closeModal();
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
    setPreviewMissingRequirements([]);
    setPreviewUnmatchedRows([]);
    setActivePreviewAlertFilter(null);
    setImportSummary(null);
    setImportError("");
    setIsMissingDataDialogOpen(false);
    setIsConflictDialogOpen(false);
    setIsUnmatchedRowsDialogOpen(false);

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
      setActiveTab("tracking");
      closeModal();
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
    if (previewMissingRequirements.length > 0) {
      setIsMissingDataDialogOpen(true);
      return;
    }
    if (previewConflicts.length > 0) {
      setIsConflictDialogOpen(true);
      return;
    }
    if (previewUnmatchedRows.length > 0) {
      setIsUnmatchedRowsDialogOpen(true);
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
        if (
          previewImportType === "qualification" &&
          data?.detail &&
          typeof data.detail === "object" &&
          Array.isArray(data.detail.missing_requirements)
        ) {
          const remappedWarnings = mapIssuesToPreviewRows(data.detail.missing_requirements, pendingImportRows);
          setPreviewMissingRequirements(remappedWarnings);
          setIsMissingDataDialogOpen(remappedWarnings.length > 0);
        }
        setImportError(getErrorMessageFromDetail(data?.detail, tr("Echec de l'import.", "Import failed.")));
        return;
      }

      setImportSummary(previewImportType === "collaborateurs" ? data : data?.import_summary ?? null);
      setPendingImportRows([]);
      setPreviewUnmatchedRows([]);

      await loadQualifications();
    } catch (error) {
      setImportError(
        error?.message || tr("Erreur reseau lors de l'import.", "Network error while importing."),
      );
    } finally {
      setIsImportingPreview(false);
    }
  };

  const handleOpenUploadErrors = () => {
    setActivePreviewAlertFilter(null);
    setActiveTab("tracking");
    setIsMissingDataDialogOpen(false);
    setIsConflictDialogOpen(false);
    setIsUnmatchedRowsDialogOpen(false);

    if (previewMissingRequirements.length > 0) {
      setIsMissingDataDialogOpen(true);
      return;
    }

    if (previewConflicts.length > 0) {
      setIsConflictDialogOpen(true);
      return;
    }

    if (previewUnmatchedRows.length > 0) {
      setIsUnmatchedRowsDialogOpen(true);
      return;
    }

    scrollToPreviewCard();
  };

  const handleOpenPreviewAlert = (filter) => {
    setActivePreviewAlertFilter(filter);
    scrollToPreviewCard();
  };

  const handleViewCollaborateur = (collab) => {
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

  const handleApplyConflictResolution = (nextRows) => {
    syncPreviewRows(nextRows, { clearConflicts: true });
    setIsConflictDialogOpen(false);
    persistUploadReview({
      importType: previewImportType,
      conflicts: [],
      missingRequirements: previewMissingRequirements,
      unmatchedRows: previewUnmatchedRows,
      fileErrors: previewFileErrors,
    });
  };

  const handleApplyMissingDataResolution = (nextRows) => {
    syncPreviewRows(nextRows, { clearMissingRequirements: true });
    setIsMissingDataDialogOpen(false);
    persistUploadReview({
      importType: previewImportType,
      conflicts: previewConflicts,
      missingRequirements: [],
      unmatchedRows: previewUnmatchedRows,
      fileErrors: previewFileErrors,
    });
  };

  const handleApplyUnmatchedResolution = (nextRows, skippedIssues) => {
    syncPreviewRows(nextRows);
    setPreviewUnmatchedRows([]);
    setIsUnmatchedRowsDialogOpen(false);
    persistUploadReview({
      importType: previewImportType,
      conflicts: previewConflicts,
      missingRequirements: previewMissingRequirements,
      unmatchedRows: skippedIssues,
      fileErrors: previewFileErrors,
    });
  };

  const filteredCollaborateurs = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();
    return collaborateursData.filter((collab) => {
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
  }, [collaborateursData, deferredSearchTerm, groupFilter, statusFilter]);

  const uploadNotifications = useMemo(
    () =>
      buildUploadNotifications({
        tr,
        previewError,
        previewFileErrors,
        previewMissingRequirements,
        previewConflicts,
        previewUnmatchedRows,
        previewRows,
        onOpenErrors: handleOpenUploadErrors,
        onOpenAbsence: () => handleOpenPreviewAlert(PREVIEW_ALERT_FILTERS.absence),
        onOpenReturnAbsence: () => handleOpenPreviewAlert(PREVIEW_ALERT_FILTERS.returnAbsence),
        onOpenConsecutiveAbsence: () => handleOpenPreviewAlert(PREVIEW_ALERT_FILTERS.consecutiveAbsence),
      }),
    [
      tr,
      previewError,
      previewFileErrors,
      previewMissingRequirements,
      previewConflicts,
      previewUnmatchedRows,
      previewRows,
    ],
  );

  const uploadNotificationSignature = useMemo(
    () =>
      JSON.stringify({
        previewImportType,
        previewError,
        previewFileErrors: previewFileErrors.map((item) => `${item.file}:${item.error}`),
        previewMissingRequirements: previewMissingRequirements.map((item) => item.rowId || item.row_index || ""),
        previewConflicts: previewConflicts.map((item) => item.rowId || item.row_index || ""),
        previewUnmatchedRows: previewUnmatchedRows.map(
          (item) => item.row?.__previewRowId || item.row_index || item.source_row_number || "",
        ),
        previewRows: previewRows.map(
          (row) => `${row.__previewRowId || ""}:${row.motif || ""}:${row.date_association_systeme || row.date || ""}`,
        ),
      }),
    [
      previewImportType,
      previewError,
      previewFileErrors,
      previewMissingRequirements,
      previewConflicts,
      previewUnmatchedRows,
      previewRows,
    ],
  );

  return (
    <div className="space-y-5 pb-6">
      <UploadNotificationStack
        tr={tr}
        notifications={uploadNotifications}
        signature={uploadNotificationSignature}
      />

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-[560px] grid-cols-2 rounded-[22px] border border-[#dfe5e2] bg-white p-2 shadow-sm">
          <TabsTrigger
            value="tracking"
            className="rounded-[16px] border border-transparent px-5 py-4 text-[15px] font-medium data-[state=active]:border-[#b9d3ea] data-[state=active]:bg-[#f5f9ff] data-[state=active]:text-[#005ca9] data-[state=active]:shadow-none"
          >
            {tr("Suivi Qualification", "Qualification Tracking")}
          </TabsTrigger>
          <TabsTrigger
            value="movement"
            className="rounded-[16px] border border-transparent px-5 py-4 text-[15px] font-medium data-[state=active]:border-[#f1c59e] data-[state=active]:bg-[#fff9f3] data-[state=active]:text-[#c45a00] data-[state=active]:shadow-none"
          >
            {tr("Entrees / Sorties", "Entries / Exits")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ComparisonStat
              title={tr("Total Qualifications", "Total Qualifications")}
              value={totalQualifications}
              icon={Users}
              iconBg="bg-[#e8f0ff]"
              iconColor="text-[#0f63f2]"
              delay="30ms"
            />
            <ComparisonStat
              title={tr("En cours", "In progress")}
              value={enCoursCount}
              deltaPercent={totalQualifications > 0 ? (enCoursCount / totalQualifications) * 100 : 0}
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
              deltaPercent={totalQualifications > 0 ? (qualifieCount / totalQualifications) * 100 : 0}
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
              deltaPercent={totalQualifications > 0 ? (nonAssocieeCount / totalQualifications) * 100 : 0}
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
              deltaPercent={totalQualifications > 0 ? (depassementCount / totalQualifications) * 100 : 0}
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
              onEditQualification={handleOpenEditQualificationDialog}
              selectedCollaborateur={selectedCollaborateur}
              onCloseDetails={() => setSelectedCollaborateur(null)}
              presenceHistoryByMatricule={presenceHistoryByMatricule}
              canEdit={!isObserver}
              tr={tr}
            />
          </div>

          <div ref={previewCardRef} className="scroll-mt-24">
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
              previewMissingRequirementsCount={previewMissingRequirements.length}
              previewUnmatchedRowsCount={previewUnmatchedRows.length}
              activeAlertFilter={activePreviewAlertFilter}
              canImport={pendingImportRows.length > 0}
              isImporting={isImportingPreview}
              onImport={handleImportPreview}
              onReviewMissingRequirements={() => setIsMissingDataDialogOpen(true)}
              onReviewConflicts={() => setIsConflictDialogOpen(true)}
              onReviewUnmatchedRows={() => setIsUnmatchedRowsDialogOpen(true)}
              onClearAlertFilter={() => setActivePreviewAlertFilter(null)}
              importSummary={importSummary}
              importError={importError}
            />
          </div>
        </TabsContent>

        <TabsContent value="movement">
          <QualificationMovementTab tr={tr} rows={collaborateursData} />
        </TabsContent>
      </Tabs>

      <Suspense fallback={null}>
        {isMissingDataDialogOpen ? (
          <ImportMissingDataDialog
            key={`missing-${isMissingDataDialogOpen}-${previewMissingRequirements.length}-${previewRows.length}`}
            tr={tr}
            isOpen={isMissingDataDialogOpen}
            missingRequirements={previewMissingRequirements}
            rows={previewRows}
            onClose={() => setIsMissingDataDialogOpen(false)}
            onApply={handleApplyMissingDataResolution}
          />
        ) : null}

        {isConflictDialogOpen ? (
          <ImportConflictDialog
            key={`conflict-${isConflictDialogOpen}-${previewConflicts.length}-${previewRows.length}`}
            tr={tr}
            isOpen={isConflictDialogOpen}
            conflicts={previewConflicts}
            rows={previewRows}
            onClose={() => setIsConflictDialogOpen(false)}
            onApply={handleApplyConflictResolution}
          />
        ) : null}

        {isUnmatchedRowsDialogOpen ? (
          <ImportUnmatchedRowsDialog
            key={`unmatched-${isUnmatchedRowsDialogOpen}-${previewUnmatchedRows.length}-${previewRows.length}`}
            tr={tr}
            isOpen={isUnmatchedRowsDialogOpen}
            unmatchedRows={previewUnmatchedRows}
            existingRows={previewRows}
            onClose={() => setIsUnmatchedRowsDialogOpen(false)}
            onApply={handleApplyUnmatchedResolution}
          />
        ) : null}
      </Suspense>

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

      <EditQualificationDialog
        tr={tr}
        isOpen={!isObserver && isEditQualificationOpen}
        onClose={closeEditQualificationDialog}
        row={editingQualification}
        formValues={editQualificationValues}
        onChange={handleEditQualificationFieldChange}
        onSubmit={handleSubmitEditQualification}
        isSubmitting={isSavingQualification}
        error={editQualificationError}
        formations={availableFormations}
        formateurs={availableFormateurs}
        isOptionsLoading={isLoadingQualificationOptions}
        optionsError={qualificationOptionsError}
      />
    </div>
  );
}
