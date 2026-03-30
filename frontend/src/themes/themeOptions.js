import { Moon, Sparkles, Sun } from "lucide-react";

export const defaultThemeId = "day";

export const themeOptions = [
  {
    id: "day",
    icon: Sun,
    nameFr: "Classique",
    nameEn: "Classic",
    shortFr: "Jour",
    shortEn: "Day",
    descriptionFr: "Palette claire, nette et professionnelle.",
    descriptionEn: "Bright, clean, professional palette.",
    preview: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 45%, #ffffff 100%)",
    surface: "rgba(255, 255, 255, 0.88)",
    accent: "#0f63f2",
  },
  {
    id: "night",
    icon: Moon,
    nameFr: "Nocturne",
    nameEn: "Nightfall",
    shortFr: "Nuit",
    shortEn: "Night",
    descriptionFr: "Contraste profond pour les longues sessions.",
    descriptionEn: "Deep contrast for long working sessions.",
    preview: "linear-gradient(135deg, #08192b 0%, #183b5f 55%, #2f7ec9 100%)",
    surface: "rgba(14, 33, 53, 0.84)",
    accent: "#67b8f2",
  },
  {
    id: "aurora",
    icon: Sparkles,
    nameFr: "Aurora",
    nameEn: "Aurora",
    shortFr: "Aurora",
    shortEn: "Aurora",
    descriptionFr: "Atmosphere moderne avec chaleur, profondeur et relief.",
    descriptionEn: "Modern atmosphere with warmth, depth, and layering.",
    preview: "linear-gradient(135deg, #fff5e8 0%, #ffc9ac 55%, #1f3041 100%)",
    surface: "rgba(255, 247, 238, 0.82)",
    accent: "#d76546",
  },
];

export const supportedThemeIds = themeOptions.map((option) => option.id);

export function isSupportedTheme(value) {
  return supportedThemeIds.includes(value);
}

export function getThemeOption(themeId) {
  return themeOptions.find((option) => option.id === themeId) ?? themeOptions[0];
}

export function getNextTheme(themeId) {
  const currentIndex = supportedThemeIds.indexOf(themeId);
  if (currentIndex === -1) {
    return defaultThemeId;
  }

  return supportedThemeIds[(currentIndex + 1) % supportedThemeIds.length];
}
