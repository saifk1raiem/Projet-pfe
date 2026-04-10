const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const PREVIEW_ALERT_FILTERS = Object.freeze({
  absence: "absence",
  returnAbsence: "return-absence",
  consecutiveAbsence: "consecutive-absence",
});

export function getPreviewAlertFilterMeta(tr, filter) {
  switch (filter) {
    case PREVIEW_ALERT_FILTERS.absence:
      return {
        label: tr("Absence", "Absence"),
        emptyLabel: tr(
          "Aucune ligne d'absence ne correspond au filtre actif.",
          "No absence rows match the active filter.",
        ),
      };
    case PREVIEW_ALERT_FILTERS.returnAbsence:
      return {
        label: tr("Retour d'absence", "Return from absence"),
        emptyLabel: tr(
          "Aucune ligne de retour d'absence ne correspond au filtre actif.",
          "No return-from-absence rows match the active filter.",
        ),
      };
    case PREVIEW_ALERT_FILTERS.consecutiveAbsence:
      return {
        label: tr("Absence consecutive", "Consecutive absence"),
        emptyLabel: tr(
          "Aucune ligne d'absence consecutive ne correspond au filtre actif.",
          "No consecutive-absence rows match the active filter.",
        ),
      };
    default:
      return {
        label: "",
        emptyLabel: tr(
          "Aucune ligne ne correspond au filtre actif.",
          "No rows match the active filter.",
        ),
      };
  }
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parsePreviewDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getCollaboratorKey(row) {
  if (row?.matricule) {
    return String(row.matricule);
  }

  const fullName = [row?.nom, row?.prenom].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  return row?.__previewRowId || row?.id || "";
}

function getRowKey(row) {
  return row?.__previewRowId || row?.id || `${getCollaboratorKey(row)}-${row?.date_association_systeme || "no-date"}`;
}

function hasReturnAbsenceKeywords(text) {
  return (
    (text.includes("retour") && text.includes("absence")) ||
    (text.includes("reprise") && text.includes("absence")) ||
    text.includes("retour absence") ||
    text.includes("retour dabsence") ||
    text.includes("retour d'absence")
  );
}

function hasAbsenceKeywords(text) {
  return text.includes("absence") || text.includes("absent");
}

function hasConsecutiveAbsenceKeywords(text) {
  return (
    text.includes("absence consecutive") ||
    text.includes("absence consecutif") ||
    text.includes("absences consecutives") ||
    text.includes("absences consecutifs")
  );
}

export function isReturnFromAbsenceRow(row) {
  const motif = normalizeText(row?.motif);
  return Boolean(motif) && hasReturnAbsenceKeywords(motif);
}

export function isAbsenceRow(row) {
  const motif = normalizeText(row?.motif);
  if (!motif || isReturnFromAbsenceRow(row)) {
    return false;
  }

  return hasAbsenceKeywords(motif);
}

export function buildConsecutiveAbsenceRowIdSet(rows) {
  const rowIdSet = new Set();
  const groupedRows = new Map();

  rows.forEach((row) => {
    const rowKey = getRowKey(row);
    const motif = normalizeText(row?.motif);
    if (hasConsecutiveAbsenceKeywords(motif)) {
      rowIdSet.add(rowKey);
    }

    if (!isAbsenceRow(row)) {
      return;
    }

    const collaboratorKey = getCollaboratorKey(row);
    const associationDate = parsePreviewDate(row?.date_association_systeme || row?.date);
    if (!collaboratorKey || !associationDate) {
      return;
    }

    if (!groupedRows.has(collaboratorKey)) {
      groupedRows.set(collaboratorKey, []);
    }

    groupedRows.get(collaboratorKey).push({
      rowKey,
      timestamp: associationDate.getTime(),
    });
  });

  groupedRows.forEach((entries) => {
    const dayMap = new Map();
    entries.forEach((entry) => {
      if (!dayMap.has(entry.timestamp)) {
        dayMap.set(entry.timestamp, []);
      }
      dayMap.get(entry.timestamp).push(entry);
    });

    const orderedDays = Array.from(dayMap.keys()).sort((left, right) => left - right);
    let run = [];

    const flushRun = () => {
      if (run.length >= 2) {
        run.forEach((timestamp) => {
          (dayMap.get(timestamp) || []).forEach((entry) => {
            rowIdSet.add(entry.rowKey);
          });
        });
      }
      run = [];
    };

    orderedDays.forEach((timestamp, index) => {
      if (run.length === 0) {
        run = [timestamp];
        return;
      }

      const previousTimestamp = orderedDays[index - 1];
      if (timestamp - previousTimestamp === DAY_IN_MS) {
        run.push(timestamp);
        return;
      }

      flushRun();
      run = [timestamp];
    });

    flushRun();
  });

  return rowIdSet;
}

export function filterPreviewRowsByAlert(rows, filter) {
  if (!filter) {
    return rows;
  }

  switch (filter) {
    case PREVIEW_ALERT_FILTERS.absence:
      return rows.filter(isAbsenceRow);
    case PREVIEW_ALERT_FILTERS.returnAbsence:
      return rows.filter(isReturnFromAbsenceRow);
    case PREVIEW_ALERT_FILTERS.consecutiveAbsence: {
      const consecutiveRowIds = buildConsecutiveAbsenceRowIdSet(rows);
      return rows.filter((row) => consecutiveRowIds.has(getRowKey(row)));
    }
    default:
      return rows;
  }
}

function countDistinctCollaborators(rows) {
  const keys = new Set(rows.map(getCollaboratorKey).filter(Boolean));
  return keys.size;
}

export function buildUploadNotifications({
  tr,
  previewError,
  previewFileErrors,
  previewMissingRequirements,
  previewConflicts,
  previewUnmatchedRows,
  previewRows,
  onOpenErrors,
  onOpenAbsence,
  onOpenReturnAbsence,
  onOpenConsecutiveAbsence,
}) {
  const notifications = [];
  const absenceRows = filterPreviewRowsByAlert(previewRows, PREVIEW_ALERT_FILTERS.absence);
  const returnAbsenceRows = filterPreviewRowsByAlert(previewRows, PREVIEW_ALERT_FILTERS.returnAbsence);
  const consecutiveAbsenceRows = filterPreviewRowsByAlert(previewRows, PREVIEW_ALERT_FILTERS.consecutiveAbsence);
  const errorCount =
    (previewError ? 1 : 0) +
    previewFileErrors.length +
    previewMissingRequirements.length +
    previewConflicts.length +
    previewUnmatchedRows.length;

  if (errorCount > 0) {
    const parts = [];
    if (previewFileErrors.length > 0) {
      parts.push(
        tr(
          `${previewFileErrors.length} erreurs fichier`,
          `${previewFileErrors.length} file errors`,
        ),
      );
    }
    if (previewMissingRequirements.length > 0) {
      parts.push(
        tr(
          `${previewMissingRequirements.length} donnees manquantes`,
          `${previewMissingRequirements.length} missing-data issues`,
        ),
      );
    }
    if (previewConflicts.length > 0) {
      parts.push(
        tr(
          `${previewConflicts.length} conflits`,
          `${previewConflicts.length} conflicts`,
        ),
      );
    }
    if (previewUnmatchedRows.length > 0) {
      parts.push(
        tr(
          `${previewUnmatchedRows.length} lignes non fusionnees`,
          `${previewUnmatchedRows.length} unmatched rows`,
        ),
      );
    }

    notifications.push({
      id: "upload-errors",
      tone: "error",
      title: tr("Erreurs detectees apres upload", "Errors detected after upload"),
      description: previewError || parts.join(" | "),
      actionLabel: tr("Ouvrir la revue", "Open review"),
      onClick: onOpenErrors,
    });
  }

  if (absenceRows.length > 0) {
    notifications.push({
      id: PREVIEW_ALERT_FILTERS.absence,
      tone: "absence",
      title: tr("Absences detectees", "Absences detected"),
      description: tr(
        `${absenceRows.length} lignes pour ${countDistinctCollaborators(absenceRows)} collaborateurs`,
        `${absenceRows.length} rows across ${countDistinctCollaborators(absenceRows)} collaborators`,
      ),
      actionLabel: tr("Voir les absences", "View absences"),
      onClick: onOpenAbsence,
    });
  }

  if (returnAbsenceRows.length > 0) {
    notifications.push({
      id: PREVIEW_ALERT_FILTERS.returnAbsence,
      tone: "return",
      title: tr("Retours d'absence detectes", "Return-from-absence detected"),
      description: tr(
        `${returnAbsenceRows.length} lignes pour ${countDistinctCollaborators(returnAbsenceRows)} collaborateurs`,
        `${returnAbsenceRows.length} rows across ${countDistinctCollaborators(returnAbsenceRows)} collaborators`,
      ),
      actionLabel: tr("Voir les retours", "View returns"),
      onClick: onOpenReturnAbsence,
    });
  }

  if (consecutiveAbsenceRows.length > 0) {
    notifications.push({
      id: PREVIEW_ALERT_FILTERS.consecutiveAbsence,
      tone: "consecutive",
      title: tr("Absences consecutives detectees", "Consecutive absences detected"),
      description: tr(
        `${consecutiveAbsenceRows.length} lignes pour ${countDistinctCollaborators(consecutiveAbsenceRows)} collaborateurs`,
        `${consecutiveAbsenceRows.length} rows across ${countDistinctCollaborators(consecutiveAbsenceRows)} collaborators`,
      ),
      actionLabel: tr("Voir les cas consecutifs", "View consecutive cases"),
      onClick: onOpenConsecutiveAbsence,
    });
  }

  return notifications;
}
