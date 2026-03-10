export const formatDuration = (durationDays, tr) => {
  if (!durationDays) {
    return tr("Non definie", "Not set");
  }
  return tr(`${durationDays} jours`, `${durationDays} days`);
};
