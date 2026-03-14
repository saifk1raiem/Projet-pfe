import { EntityFiltersCard } from "../filters/EntityFiltersCard";

export function QualificationFilters({
  tr,
  searchTerm,
  onSearchTermChange,
  isFiltersOpen,
  onToggleFilters,
  statusFilter,
  onStatusFilterChange,
  groupFilter,
  onGroupFilterChange,
  availableGroups,
  statutOptions,
  onResetFilters,
}) {
  const filters = [
    {
      id: "qualification-status-filter",
      label: tr("Statut", "Status"),
      value: statusFilter,
      onChange: onStatusFilterChange,
      allOptionLabel: tr("Tous les statuts", "All statuses"),
      options: statutOptions.map((status) => ({ value: status, label: status })),
    },
    {
      id: "qualification-group-filter",
      label: tr("Groupe", "Group"),
      value: groupFilter,
      onChange: onGroupFilterChange,
      allOptionLabel: tr("Tous les groupes", "All groups"),
      options: availableGroups.map((group) => ({ value: group, label: group })),
    },
  ];

  return (
    <EntityFiltersCard
      tr={tr}
      searchPlaceholder={tr("Rechercher par nom, matricule, fonction SAP ou centre de cout...", "Search by name, ID, SAP function or cost center...")}
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      isFiltersOpen={isFiltersOpen}
      onToggleFilters={onToggleFilters}
      filters={filters}
      onResetFilters={onResetFilters}
      filtersGridClassName="md:grid-cols-[minmax(0,220px)_minmax(0,260px)_auto]"
    />
  );
}
