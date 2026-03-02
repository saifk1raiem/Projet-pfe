/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";

const AppPreferencesContext = createContext(null);

export function AppPreferencesProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("app_language") || "fr");
  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "day");

  useEffect(() => {
    localStorage.setItem("app_language", language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem("app_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "night");
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "day" ? "night" : "day"));
  };

  const tr = (frText, enText) => (language === "en" ? enText : frText);

  const value = {
    language,
    setLanguage,
    theme,
    setTheme,
    toggleTheme,
    tr,
  };

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  }
  return context;
}
