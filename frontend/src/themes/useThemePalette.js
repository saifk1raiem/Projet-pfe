import { useMemo } from "react";
import { useAppPreferences } from "../context/AppPreferencesContext";

const FALLBACK_PALETTE = {
  background: "#f4f7fb",
  card: "#ffffff",
  foreground: "#13263f",
  mutedForeground: "#5d7088",
  border: "#d4dfeb",
  primary: "#005ca9",
  destructive: "#ef4444",
  chart1: "#005ca9",
  chart2: "#2e8ad7",
  chart3: "#f6a800",
  chart4: "#ef4444",
  chart5: "#1d4d7d",
};

function readCssVariable(styles, name, fallback) {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

export function useThemePalette() {
  const { theme } = useAppPreferences();

  return useMemo(() => {
    const themeName = theme;

    if (typeof window === "undefined" || !themeName) {
      return FALLBACK_PALETTE;
    }

    const styles = getComputedStyle(document.documentElement);

    return {
      background: readCssVariable(styles, "--background", FALLBACK_PALETTE.background),
      card: readCssVariable(styles, "--card", FALLBACK_PALETTE.card),
      foreground: readCssVariable(styles, "--foreground", FALLBACK_PALETTE.foreground),
      mutedForeground: readCssVariable(styles, "--muted-foreground", FALLBACK_PALETTE.mutedForeground),
      border: readCssVariable(styles, "--border", FALLBACK_PALETTE.border),
      primary: readCssVariable(styles, "--primary", FALLBACK_PALETTE.primary),
      destructive: readCssVariable(styles, "--destructive", FALLBACK_PALETTE.destructive),
      chart1: readCssVariable(styles, "--chart-1", FALLBACK_PALETTE.chart1),
      chart2: readCssVariable(styles, "--chart-2", FALLBACK_PALETTE.chart2),
      chart3: readCssVariable(styles, "--chart-3", FALLBACK_PALETTE.chart3),
      chart4: readCssVariable(styles, "--chart-4", FALLBACK_PALETTE.chart4),
      chart5: readCssVariable(styles, "--chart-5", FALLBACK_PALETTE.chart5),
    };
  }, [theme]);
}
