import { apiUrl } from "../../lib/api";

const DEFAULT_SUMMARY = Object.freeze({
  tracked_rows: 0,
  on_track_count: 0,
  overdue_count: 0,
  presence_rate: 0,
  latest_status: null,
});

const getAuthHeaders = (accessToken, headers = {}) =>
  accessToken ? { ...headers, Authorization: `Bearer ${accessToken}` } : headers;

export function getEmptyPresenceHistoryState(overrides = {}) {
  return {
    loaded: false,
    loading: false,
    error: "",
    period_start: null,
    period_end: null,
    reporting_months: 2,
    history: [],
    summary: { ...DEFAULT_SUMMARY },
    ...overrides,
  };
}

export function normalizePresenceHistoryPayload(data) {
  const summary = data?.summary && typeof data.summary === "object" ? data.summary : {};

  return getEmptyPresenceHistoryState({
    loaded: true,
    period_start: data?.period_start ?? null,
    period_end: data?.period_end ?? null,
    reporting_months: Number.isFinite(data?.reporting_months) ? data.reporting_months : 2,
    history: Array.isArray(data?.history) ? data.history : [],
    summary: {
      tracked_rows: Number.isFinite(summary.tracked_rows) ? summary.tracked_rows : 0,
      on_track_count: Number.isFinite(summary.on_track_count) ? summary.on_track_count : 0,
      overdue_count: Number.isFinite(summary.overdue_count) ? summary.overdue_count : 0,
      presence_rate: typeof summary.presence_rate === "number" ? summary.presence_rate : 0,
      latest_status: summary.latest_status ?? null,
    },
  });
}

export async function fetchCollaborateurPresenceHistory(accessToken, matricule) {
  const response = await fetch(
    apiUrl(`/qualification/${encodeURIComponent(matricule)}/presence-history`),
    {
      headers: getAuthHeaders(accessToken),
    },
  );
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  return { response, data };
}
