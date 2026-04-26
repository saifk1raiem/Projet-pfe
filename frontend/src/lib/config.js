function readEnv(name, fallback) {
  const value = import.meta.env[name];
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
}

export const appConfig = {
  apiBaseUrl: readEnv("VITE_API_BASE_URL", "/"),
  apiPrefix: readEnv("VITE_API_PREFIX", "/api/v1"),
  companyName: readEnv("VITE_COMPANY_NAME", "ASM"),
  applicationName: readEnv("VITE_APPLICATION_NAME", "ASM Training"),
  adminEmail: readEnv("VITE_ADMIN_EMAIL", "admin@asm.example"),
  defaultTimezone: readEnv("VITE_DEFAULT_TIMEZONE", "Africa/Tunis"),
};
