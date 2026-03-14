export const getInitials = (name) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "FM";

export const getSpecialites = (specialite) =>
  typeof specialite === "string" && specialite.trim()
    ? specialite.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
