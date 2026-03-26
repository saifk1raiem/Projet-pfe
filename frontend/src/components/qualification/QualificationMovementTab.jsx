import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { DashboardMovementSection } from "../dashboard/DashboardMovementSection";
import { Card } from "../ui/card";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";

const EMPTY_MOVEMENT_DATA = {
  overview: {
    latest_association_date: null,
    latest_association_count: 0,
    total_exits: 0,
  },
  filters: {
    available_groups: [],
    available_segments: [],
  },
  movements: {
    selected_date: null,
    entries_count: 0,
    exits_count: 0,
    entries: [],
    exits: [],
  },
};

const buildDashboardUrl = ({
  selectedDate,
  searchTerm,
  groupFilter,
  segmentFilter,
}) => {
  const params = new URLSearchParams();

  if (selectedDate) {
    params.set("date", selectedDate);
  }
  if (searchTerm.trim()) {
    params.set("search", searchTerm.trim());
  }
  if (groupFilter !== "all") {
    params.set("group", groupFilter);
  }
  if (segmentFilter !== "all") {
    params.set("segment", segmentFilter);
  }

  const query = params.toString();
  return apiUrl(query ? `/dashboard?${query}` : "/dashboard");
};

export function QualificationMovementTab({ accessToken }) {
  const { tr } = useAppPreferences();
  const [dashboardData, setDashboardData] = useState(EMPTY_MOVEMENT_DATA);
  const [statsError, setStatsError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedDate, setSelectedDate] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const entriesDescription = useMemo(() => {
    if (!dashboardData.overview.latest_association_date) {
      return tr(
        "Basee sur la derniere date d'association",
        "Based on the latest association date",
      );
    }

    return tr(
      `Derniere association: ${dashboardData.overview.latest_association_date}`,
      `Latest association: ${dashboardData.overview.latest_association_date}`,
    );
  }, [dashboardData.overview.latest_association_date, tr]);

  useEffect(() => {
    let cancelled = false;

    const loadMovementData = async () => {
      if (!accessToken) {
        setDashboardData(EMPTY_MOVEMENT_DATA);
        setStatsError("");
        return;
      }

      try {
        const response = await fetch(
          buildDashboardUrl({
            selectedDate,
            searchTerm: deferredSearchTerm,
            groupFilter,
            segmentFilter,
          }),
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error("Failed to load dashboard movements");
        }

        if (cancelled) {
          return;
        }

        setDashboardData({
          overview: {
            ...EMPTY_MOVEMENT_DATA.overview,
            ...(payload?.overview || {}),
          },
          filters: {
            ...EMPTY_MOVEMENT_DATA.filters,
            ...(payload?.filters || {}),
          },
          movements: {
            ...EMPTY_MOVEMENT_DATA.movements,
            ...(payload?.movements || {}),
          },
        });
        setStatsError("");

        if (!selectedDate && payload?.movements?.selected_date) {
          setSelectedDate(payload.movements.selected_date);
        }
      } catch {
        if (!cancelled) {
          setDashboardData(EMPTY_MOVEMENT_DATA);
          setStatsError(
            tr(
              "Impossible de charger les mouvements collaborateurs.",
              "Failed to load collaborator movements.",
            ),
          );
        }
      }
    };

    loadMovementData();

    return () => {
      cancelled = true;
    };
  }, [accessToken, deferredSearchTerm, groupFilter, segmentFilter, selectedDate, tr]);

  return (
    <div className="space-y-4">
      {statsError ? (
        <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-sm text-[#8a1d1d]">
          {statsError}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[15px] text-[#5f6777]">
                {tr("Entrees", "Entries")}
              </p>
              <p className="mt-1 text-[12px] text-[#8b94a3]">{entriesDescription}</p>
              <h3 className="mt-3 leoni-metric text-[42px] font-semibold leading-none text-[#191c20]">
                {dashboardData.overview.latest_association_count}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff2e4]">
              <ArrowDownRight className="h-6 w-6 text-[#fc6200]" />
            </div>
          </div>
        </Card>

        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[15px] text-[#5f6777]">
                {tr("Sorties", "Exits")}
              </p>
              <p className="mt-1 text-[12px] text-[#8b94a3]">
                {tr(
                  "Motif qualification = Mise en demeure",
                  "Qualification reason = Mise en demeure",
                )}
              </p>
              <h3 className="mt-3 leoni-metric text-[42px] font-semibold leading-none text-[#191c20]">
                {dashboardData.overview.total_exits}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdeeee]">
              <ArrowUpRight className="h-6 w-6 text-[#ea3737]" />
            </div>
          </div>
        </Card>
      </div>

      <DashboardMovementSection
        tr={tr}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        groupFilter={groupFilter}
        onGroupFilterChange={setGroupFilter}
        availableGroups={dashboardData.filters.available_groups}
        segmentFilter={segmentFilter}
        onSegmentFilterChange={setSegmentFilter}
        availableSegments={dashboardData.filters.available_segments}
        isFiltersOpen={isFiltersOpen}
        onToggleFilters={() => setIsFiltersOpen((prev) => !prev)}
        onResetFilters={() => {
          setSearchTerm("");
          setSelectedDate("");
          setGroupFilter("all");
          setSegmentFilter("all");
        }}
        movements={dashboardData.movements}
        showHeading={false}
      />
    </div>
  );
}
