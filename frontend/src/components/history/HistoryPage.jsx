import { useMemo, useRef, useState } from "react";
import { Database, FileSpreadsheet, Upload } from "lucide-react";

import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Progress } from "../ui/progress";
import { UploadReportModal } from "../qualification/UploadReportModal";
import { HistoryPreviewCard } from "./HistoryPreviewCard";


const getAuthHeaders = (accessToken, headers = {}) =>
  accessToken ? { ...headers, Authorization: `Bearer ${accessToken}` } : headers;

function getErrorMessage(detail, fallbackMessage) {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string" && detail.message.trim()) {
      const extra = Array.isArray(detail.missing_fields) && detail.missing_fields.length > 0
        ? ` (${detail.missing_fields.join(", ")})`
        : "";
      return `${detail.message}${extra}`;
    }
  }
  return fallbackMessage;
}

function uploadHistoryPreview(accessToken, file, onProgress) {
  const url = apiUrl("/history/preview");
  const headers = getAuthHeaders(accessToken);

  const sendWithXhr = () =>
    new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progressValue = (event.loaded / event.total) * 100;
      onProgress(progressValue);
    };

    xhr.onerror = () => {
      reject(new Error("network_error"));
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = {};
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
      });
    };

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
    });

  const sendWithFetch = async () => {
    const formData = new FormData();
    formData.append("file", file);
    onProgress(90);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    onProgress(100);
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  };

  return sendWithXhr().catch(async () => sendWithFetch());
}

async function importHistoryRows(accessToken, rows) {
  const response = await fetch(apiUrl("/history/import"), {
    method: "POST",
    headers: getAuthHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ rows }),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export function HistoryPage({ currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const isObserver = currentUser?.role === "observer";
  const inputRef = useRef(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewRowsCount, setPreviewRowsCount] = useState(0);
  const [validRowsCount, setValidRowsCount] = useState(0);
  const [invalidRowsCount, setInvalidRowsCount] = useState(0);
  const [insertRowsCount, setInsertRowsCount] = useState(0);
  const [updateRowsCount, setUpdateRowsCount] = useState(0);
  const [previewColumnsDetected, setPreviewColumnsDetected] = useState([]);
  const [previewMappingUsed, setPreviewMappingUsed] = useState({});
  const [previewError, setPreviewError] = useState("");
  const [importError, setImportError] = useState("");
  const [importSummary, setImportSummary] = useState(null);

  const selectedFiles = selectedFile ? [selectedFile] : [];
  const validRows = useMemo(
    () => previewRows.filter((item) => item.is_valid).map((item) => item.row),
    [previewRows],
  );

  const resetPreviewState = () => {
    setPreviewRows([]);
    setPreviewRowsCount(0);
    setValidRowsCount(0);
    setInvalidRowsCount(0);
    setInsertRowsCount(0);
    setUpdateRowsCount(0);
    setPreviewColumnsDetected([]);
    setPreviewMappingUsed({});
    setPreviewError("");
    setImportError("");
    setImportSummary(null);
  };

  const closeModal = () => {
    setIsUploadOpen(false);
    setIsDragging(false);
  };

  const handleFileChange = (files) => {
    const nextFile = files?.[0] ?? null;
    setImportSummary(null);
    setImportError("");
    setUploadProgress(null);

    if (!nextFile) {
      setSelectedFile(null);
      return;
    }

    if (!nextFile.name.toLowerCase().endsWith(".xlsx")) {
      setSelectedFile(null);
      setPreviewError(tr("Seuls les fichiers .xlsx sont acceptes.", "Only .xlsx files are accepted."));
      return;
    }

    setPreviewError("");
    resetPreviewState();
    setSelectedFile(nextFile);
  };

  const handlePreviewSubmit = async () => {
    if (!accessToken) {
      setPreviewError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }
    if (!selectedFile) {
      setPreviewError(tr("Choisissez un fichier .xlsx.", "Choose an .xlsx file."));
      return;
    }

    setIsPreviewLoading(true);
    setUploadProgress(0);
    resetPreviewState();

    try {
      const { ok, data } = await uploadHistoryPreview(accessToken, selectedFile, setUploadProgress);
      setUploadProgress(100);

      if (!ok) {
        setPreviewError(
          getErrorMessage(
            data?.detail,
            tr("Echec de lecture du fichier historique.", "Failed to parse history file."),
          ),
        );
        return;
      }

      setPreviewRows(Array.isArray(data?.rows) ? data.rows : []);
      setPreviewRowsCount(Number.isFinite(data?.rows_count) ? data.rows_count : 0);
      setValidRowsCount(Number.isFinite(data?.valid_rows_count) ? data.valid_rows_count : 0);
      setInvalidRowsCount(Number.isFinite(data?.invalid_rows_count) ? data.invalid_rows_count : 0);
      setInsertRowsCount(Number.isFinite(data?.insert_rows_count) ? data.insert_rows_count : 0);
      setUpdateRowsCount(Number.isFinite(data?.update_rows_count) ? data.update_rows_count : 0);
      setPreviewColumnsDetected(Array.isArray(data?.columns_detected) ? data.columns_detected : []);
      setPreviewMappingUsed(data?.mapping_used && typeof data.mapping_used === "object" ? data.mapping_used : {});
      closeModal();
    } catch {
      setPreviewError(
        tr(
          "Erreur reseau lors du televersement. Rechargez la page puis verifiez que l'application est ouverte sur localhost, 127.0.0.1 ou [::1].",
          "Network error while uploading. Reload the page and make sure the app is opened on localhost, 127.0.0.1, or [::1].",
        ),
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!accessToken) {
      setImportError(tr("Token manquant. Reconnectez-vous.", "Missing access token. Please sign in again."));
      return;
    }
    if (validRows.length === 0) {
      setImportError(tr("Aucune ligne valide a importer.", "No valid rows available for import."));
      return;
    }

    setIsImporting(true);
    setImportError("");

    try {
      const { response, data } = await importHistoryRows(accessToken, validRows);
      if (!response.ok) {
        setImportError(
          getErrorMessage(data?.detail, tr("Echec de l'import historique.", "History import failed.")),
        );
        return;
      }

      setImportSummary(data);
      setPreviewRows((currentRows) =>
        currentRows.map((item) =>
          item.is_valid
            ? {
                ...item,
                import_action: item.import_action === "invalid" ? "invalid" : item.import_action,
              }
            : item,
        ),
      );
    } catch {
      setImportError(tr("Erreur reseau lors de l'import.", "Network error while importing."));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">
            {tr("Historique Collaborateurs", "Collaborator History")}
          </h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">
            {tr(
              "Importer et valider l'historique brut des collaborateurs",
              "Upload and validate raw collaborator history",
            )}
          </p>
        </div>

        <Button
          onClick={() => setIsUploadOpen(true)}
          className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]"
          disabled={isObserver}
        >
          <Upload className="mr-2 h-4 w-4" />
          {tr("Importer un fichier", "Upload file")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-semibold text-[#171a1f]">
                {tr("Fichier selectionne", "Selected file")}
              </h2>
              <p className="mt-1 text-sm text-[#5d6574]">
                {tr(
                  "Le fichier doit etre au format .xlsx avec les colonnes d'historique.",
                  "The file must be an .xlsx file with the history columns.",
                )}
              </p>
            </div>
            <Badge variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[13px]">
              .xlsx
            </Badge>
          </div>

          <div className="mt-4 rounded-2xl border border-[#e5eaef] bg-[#f9fbfd] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8f0ff] text-[#0f63f2]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-[#171a1f]">
                  {selectedFile?.name || tr("Aucun fichier choisi", "No file selected")}
                </p>
                <p className="text-sm text-[#5d6574]">
                  {selectedFile
                    ? `${Math.round(selectedFile.size / 1024)} KB`
                    : tr("Choisissez un fichier pour lancer l'aperçu.", "Choose a file to start the preview.")}
                </p>
              </div>
            </div>

            {typeof uploadProgress === "number" ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm text-[#5d6574]">
                  <span>{tr("Progression du televersement", "Upload progress")}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2 bg-[#d8e4f1]" />
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
          <h2 className="text-[22px] font-semibold text-[#171a1f]">
            {tr("Format Excel attendu", "Expected Excel format")}
          </h2>
          <p className="mt-1 text-sm text-[#5d6574]">
            {tr("Utilisez ces colonnes dans votre feuille XLSX.", "Use these columns in your XLSX sheet.")}
          </p>
          <div className="mt-4 rounded-2xl border border-[#e5eaef] bg-[#f9fbfd] p-4 font-mono text-xs text-[#334155]">
            <p>matricule | Nature | Entree_sorie | Heures_de_présences | Motif | Eff_Actif | Eff_Présente</p>
            <p className="mt-1">Eff_MR | Abs_P_par_Per | Abs_NP_par | Nbr_de_retard | HEURS_SUP | Moin | Jour</p>
            <p className="mt-3 text-[#64748b]">EMP001 | Absence | Sortie | 0 | Certificat medical | 1 | 0 | 1 | 0 | 1 | 0 | 0 | Avril | 10</p>
          </div>
        </Card>
      </div>

      <HistoryPreviewCard
        tr={tr}
        previewRows={previewRows}
        previewRowsCount={previewRowsCount}
        validRowsCount={validRowsCount}
        invalidRowsCount={invalidRowsCount}
        insertRowsCount={insertRowsCount}
        updateRowsCount={updateRowsCount}
        previewColumnsDetected={previewColumnsDetected}
        previewMappingUsed={previewMappingUsed}
        previewError={previewError}
        importSummary={importSummary}
        importError={importError}
        isImporting={isImporting}
        canImport={validRows.length > 0}
        onImport={handleImport}
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
        onSubmit={handlePreviewSubmit}
        title={tr("Historique Collaborateurs", "Collaborator History")}
        description={tr(
          "Chargez un fichier XLSX pour valider les lignes d'historique avant l'import.",
          "Upload an XLSX file to validate history rows before importing.",
        )}
        dropLabel={tr("Deposez votre fichier historique ici", "Drop your history file here")}
        chooseFilesLabel={tr("Choisir un fichier XLSX", "Choose XLSX file")}
        submitLabel={tr("Previsualiser", "Preview")}
        accept=".xlsx"
        allowMultiple={false}
        formatsLabel="XLSX"
        uploadProgress={uploadProgress}
        progressLabel={tr("Progression du televersement", "Upload progress")}
      />
    </div>
  );
}
