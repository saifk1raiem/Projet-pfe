import { Filter, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";

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
  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8290]" />
          <Input
            placeholder={tr("Rechercher par nom, matricule, fonction SAP ou centre de cout...", "Search by name, ID, SAP function or cost center...")}
            className="h-12 rounded-xl border-[#d7dde1] pl-11 text-[15px]"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          className="h-10 rounded-xl border-[#ccd4d8] px-5 text-[16px]"
          onClick={onToggleFilters}
        >
          <Filter className="mr-2 h-4 w-4" />
          {tr("Filtres", "Filters")}
        </Button>
      </div>
      {isFiltersOpen ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,260px)_auto]">
          <div className="space-y-2">
            <label htmlFor="qualification-status-filter" className="text-sm font-medium text-[#252930]">
              {tr("Statut", "Status")}
            </label>
            <select
              id="qualification-status-filter"
              className="h-10 w-full rounded-md border border-[#d5dce0] bg-white px-3 text-sm outline-none focus:border-[#0f63f2]"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
            >
              <option value="all">{tr("Tous les statuts", "All statuses")}</option>
              {statutOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="qualification-group-filter" className="text-sm font-medium text-[#252930]">
              {tr("Groupe", "Group")}
            </label>
            <select
              id="qualification-group-filter"
              className="h-10 w-full rounded-md border border-[#d5dce0] bg-white px-3 text-sm outline-none focus:border-[#0f63f2]"
              value={groupFilter}
              onChange={(e) => onGroupFilterChange(e.target.value)}
            >
              <option value="all">{tr("Tous les groupes", "All groups")}</option>
              {availableGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="h-10 rounded-xl border-[#ccd4d8] px-5 text-[16px]"
              onClick={onResetFilters}
            >
              {tr("Reinitialiser", "Reset")}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
