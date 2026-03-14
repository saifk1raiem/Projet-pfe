import { Filter, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";

export function EntityFiltersCard({
  tr,
  searchPlaceholder,
  searchTerm,
  onSearchTermChange,
  isFiltersOpen,
  onToggleFilters,
  filters,
  onResetFilters,
  filtersGridClassName = "md:grid-cols-3",
}) {
  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8290]" />
          <Input
            placeholder={searchPlaceholder}
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
        <div className={`mt-4 grid grid-cols-1 gap-4 ${filtersGridClassName}`}>
          {filters.map((filterItem) => (
            <div key={filterItem.id} className="space-y-2">
              <label htmlFor={filterItem.id} className="text-sm font-medium text-[#252930]">
                {filterItem.label}
              </label>
              <select
                id={filterItem.id}
                className="h-10 w-full rounded-md border border-[#d5dce0] bg-white px-3 text-sm outline-none focus:border-[#0f63f2]"
                value={filterItem.value}
                onChange={(e) => filterItem.onChange(e.target.value)}
              >
                <option value="all">{filterItem.allOptionLabel}</option>
                {filterItem.options.map((option) => (
                  <option key={`${filterItem.id}-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

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
