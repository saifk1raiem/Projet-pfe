const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://projet-pfe-production-d47f.up.railway.app/";

export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, "");

export function apiUrl(path) {
  if (!path) {
    return API_BASE_URL;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
