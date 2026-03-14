import { appConfig } from "./config";

function normalizePrefix(prefix) {
  if (!prefix || prefix === "/") {
    return "";
  }

  const trimmedPrefix = prefix.replace(/\/$/, "");
  return trimmedPrefix.startsWith("/") ? trimmedPrefix : `/${trimmedPrefix}`;
}

export const API_BASE_URL = appConfig.apiBaseUrl.replace(/\/$/, "");
export const API_PREFIX = normalizePrefix(appConfig.apiPrefix);

export function apiUrl(path) {
  if (!path) {
    return `${API_BASE_URL}${API_PREFIX}`;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath =
    API_PREFIX && normalizedPath !== API_PREFIX && !normalizedPath.startsWith(`${API_PREFIX}/`)
      ? `${API_PREFIX}${normalizedPath}`
      : normalizedPath;

  return `${API_BASE_URL}${apiPath}`;
}
