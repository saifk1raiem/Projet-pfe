import { EntityFiltersCard } from "../filters/EntityFiltersCard";

export function DashboardFilters({
  tr,
  searchTerm,
  onSearchTermChange,
  selectedDate,
  onSelectedDateChange,
  groupFilter,
  onGroupFilterChange,
  availableGroups,
  segmentFilter,
  onSegmentFilterChange,
  availableSegments,
  isFiltersOpen,
  onToggleFilters,
  onResetFilters,
}) {
  const filters = [
    {
      id: "dashboard-date-filter",
      type: "date",
      label: tr("Date du mouvement", "Movement date"),
      value: selectedDate,
      onChange: onSelectedDateChange,
    },
    {
      id: "dashboard-group-filter",
      label: tr("Groupe", "Group"),
      value: groupFilter,
      onChange: onGroupFilterChange,
      allOptionLabel: tr("Tous les groupes", "All groups"),
      options: availableGroups.map((group) => ({ value: group, label: group })),
    },
    {
      id: "dashboard-segment-filter",
      label: tr("Segment", "Segment"),
      value: segmentFilter,
      onChange: onSegmentFilterChange,
      allOptionLabel: tr("Tous les segments", "All segments"),
      options: availableSegments.map((item) => ({ value: item, label: item })),
    },
  ];

  return (
    <EntityFiltersCard
      tr={tr}
      searchPlaceholder={tr(
        "Rechercher par nom, matricule, groupe, segment ou motif...",
        "Search by name, ID, group, segment, or reason...",
      )}
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      isFiltersOpen={isFiltersOpen}
      onToggleFilters={onToggleFilters}
      filters={filters}
      onResetFilters={onResetFilters}
      filtersGridClassName="md:grid-cols-[minmax(0,220px)_minmax(0,220px)_minmax(0,220px)_auto]"
    />
  );
}
