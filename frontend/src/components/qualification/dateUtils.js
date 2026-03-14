const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const parseFormationDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;

  const trimmedValue = value.trim();
  const parsedDate = new Date(trimmedValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  const match = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  const fallbackDate = new Date(year, month - 1, day);

  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

export const hasRecentFormation = (derniereFormation, maxAgeDays) => {
  const lastFormationDate = parseFormationDate(derniereFormation);
  if (!lastFormationDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastFormationDate.setHours(0, 0, 0, 0);

  const ageInDays = Math.floor((today.getTime() - lastFormationDate.getTime()) / DAY_IN_MS);
  return ageInDays <= maxAgeDays;
};
