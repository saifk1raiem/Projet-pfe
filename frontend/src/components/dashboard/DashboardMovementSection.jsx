import { ArrowDownRight, ArrowUpRight, CalendarDays } from "lucide-react";

import { DashboardFilters } from "./DashboardFilters";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const SUMMARY_CARD_STYLES = {
  entry: {
    accent: "text-[#005ca9]",
    bg: "bg-[#e8f1fb]",
    icon: ArrowDownRight,
  },
  exit: {
    accent: "text-[#ea3737]",
    bg: "bg-[#fdeeee]",
    icon: ArrowUpRight,
  },
};

function MovementSummaryCard({ title, description, value, tone }) {
  const { accent, bg, icon: Icon } = SUMMARY_CARD_STYLES[tone];

  return (
    <Card className="rounded-[18px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] text-[#5f6777]">{title}</p>
          <p className="mt-1 text-[12px] text-[#8b94a3]">{description}</p>
          <p className="mt-3 leoni-metric text-[34px] font-semibold leading-none text-[#191c20]">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${bg}`}>
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
      </div>
    </Card>
  );
}

function MovementTableCard({
  title,
  emptyLabel,
  rows,
  isExitTable = false,
}) {
  return (
    <Card className="rounded-[18px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-[18px] font-semibold text-[#171a1f]">{title}</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matricule</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Groupe</TableHead>
            <TableHead>Segment</TableHead>
            {isExitTable ? <TableHead>Motif</TableHead> : null}
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={`${row.matricule}-${row.movement_date}`}>
                <TableCell className="font-medium text-[#171a1f]">{row.matricule}</TableCell>
                <TableCell>{[row.nom, row.prenom].filter(Boolean).join(" ") || "-"}</TableCell>
                <TableCell>{row.groupe || "-"}</TableCell>
                <TableCell>{row.segment || "-"}</TableCell>
                {isExitTable ? <TableCell>{(row.motifs || []).join(", ") || "-"}</TableCell> : null}
                <TableCell>{row.movement_date || "-"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={isExitTable ? 6 : 5} className="py-6 text-center text-[#7a8290]">
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

export function DashboardMovementSection({
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
  movements,
  showHeading = true,
}) {
  const effectiveDateLabel =
    movements.selected_date ||
    selectedDate ||
    tr("Aucune date selectionnee", "No selected date");

  return (
    <section className="space-y-4">
      <div className={`flex ${showHeading ? "items-start justify-between" : "justify-end"} gap-4`}>
        {showHeading ? (
          <div>
            <h2 className="text-[28px] font-semibold text-[#171a1f]">
              {tr("Mouvements Collaborateurs", "Collaborator movements")}
            </h2>
            <p className="mt-1 text-[15px] text-[#5d6574]">
              {tr(
                "Suivez les entrees et sorties par date, avec recherche et filtres reutilisables.",
                "Track entries and exits by date with reusable search and filters.",
              )}
            </p>
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-2xl border border-[#d9e2ea] bg-[#f7fafc] px-4 py-2 text-[14px] text-[#445064]">
          <CalendarDays className="h-4 w-4" />
          <span>{effectiveDateLabel}</span>
        </div>
      </div>

      <DashboardFilters
        tr={tr}
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        selectedDate={selectedDate}
        onSelectedDateChange={onSelectedDateChange}
        groupFilter={groupFilter}
        onGroupFilterChange={onGroupFilterChange}
        availableGroups={availableGroups}
        segmentFilter={segmentFilter}
        onSegmentFilterChange={onSegmentFilterChange}
        availableSegments={availableSegments}
        isFiltersOpen={isFiltersOpen}
        onToggleFilters={onToggleFilters}
        onResetFilters={onResetFilters}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MovementSummaryCard
          title={tr("Nouvelles Recrues", "New Recruits")}
          description={tr(
            "Collaborateurs associes a la date choisie",
            "Collaborators associated on the selected date",
          )}
          value={movements.entries_count}
          tone="entry"
        />
        <MovementSummaryCard
          title={tr("Sorties du Jour", "Exits for the day")}
          description={tr("Motif qualification = Mise en demeure", "Qualification reason = Mise en demeure")}
          value={movements.exits_count}
          tone="exit"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MovementTableCard
          title={tr("Liste des Entrees", "Entries list")}
          emptyLabel={tr("Aucune nouvelle entree pour cette date.", "No new entries for this date.")}
          rows={movements.entries || []}
        />
        <MovementTableCard
          title={tr("Liste des Sorties", "Exits list")}
          emptyLabel={tr("Aucune sortie pour cette date.", "No exits for this date.")}
          rows={movements.exits || []}
          isExitTable
        />
      </div>
    </section>
  );
}
