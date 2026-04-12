import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function formatDateLabel(value, locale = "fr-FR") {
  if (!value) {
    return "--";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function getLatestAssociationDate(rows) {
  const datedRows = rows
    .map((row) => row.date_association_systeme)
    .filter((value) => typeof value === "string" && value.length > 0)
    .sort();

  return datedRows.length ? datedRows[datedRows.length - 1] : "";
}

function isExitRow(row) {
  return normalizeText(row.motif).includes("mise en demeure");
}

function getExitDate(row) {
  return row.date_completion || row.date_association_systeme || "";
}

function dedupeRows(rows, getKey) {
  const seen = new Set();
  const uniqueRows = [];

  rows.forEach((row) => {
    const key = getKey(row);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    uniqueRows.push(row);
  });

  return uniqueRows;
}

function MovementStatCard({ title, subtitle, value, icon: Icon, iconBg, iconColor }) {
  return (
    <Card className="rounded-[22px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[22px] font-semibold tracking-[-0.02em] text-[#21314d]">{title}</p>
          <p className="mt-1 text-[14px] text-[#8a93a3]">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-4 leoni-metric text-[54px] font-medium leading-none text-[#171a1f]">{value}</div>
    </Card>
  );
}

function MovementTable({ title, emptyLabel, rows, dateResolver }) {
  const resolveDate = dateResolver || ((row) => row.date_association_systeme);
  return (
    <Card className="rounded-[22px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
      <h3 className="text-[18px] font-semibold text-[#21314d]">{title}</h3>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[14px] font-semibold text-[#253048]">Matricule</TableHead>
              <TableHead className="text-[14px] font-semibold text-[#253048]">Nom</TableHead>
              <TableHead className="text-[14px] font-semibold text-[#253048]">Groupe</TableHead>
              <TableHead className="text-[14px] font-semibold text-[#253048]">Segment</TableHead>
              <TableHead className="text-[14px] font-semibold text-[#253048]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={`${row.id}-movement`} className="h-14">
                  <TableCell className="text-[14px] font-semibold text-[#1d2025]">{row.matricule || "-"}</TableCell>
                  <TableCell className="text-[14px] text-[#1d2025]">
                    {[row.nom, row.prenom].filter(Boolean).join(" ") || "-"}
                  </TableCell>
                  <TableCell className="text-[14px] text-[#445064]">{row.groupe || "-"}</TableCell>
                  <TableCell className="text-[14px] text-[#445064]">{row.segment || "-"}</TableCell>
                  <TableCell className="text-[14px] text-[#445064]">
                    {formatDateLabel(resolveDate(row))}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-20 text-center text-[14px] text-[#8a93a3]"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function QualificationMovementTab({ tr, rows }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  const availableGroups = Array.from(
    new Set(
      rows
        .map((row) => row.groupe)
        .filter((value) => typeof value === "string" && value.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const availableSegments = Array.from(
    new Set(
      rows
        .map((row) => row.segment)
        .filter((value) => typeof value === "string" && value.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const latestAssociationDate = getLatestAssociationDate(rows);
  const effectiveAssociationDate = selectedDate || latestAssociationDate;

  const filteredRows = rows.filter((row) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        row.nom,
        row.prenom,
        row.matricule,
        row.groupe,
        row.segment,
      ]
        .filter((value) => typeof value === "string")
        .some((value) => value.toLowerCase().includes(query));

    const matchesGroup = groupFilter === "all" || row.groupe === groupFilter;
    const matchesSegment = segmentFilter === "all" || row.segment === segmentFilter;

    return matchesSearch && matchesGroup && matchesSegment;
  });

  const associationEntries = effectiveAssociationDate
    ? dedupeRows(
        filteredRows.filter((row) => row.date_association_systeme === effectiveAssociationDate),
        (row) => `${row.matricule}-${row.date_association_systeme}`,
      )
    : [];

  const allExits = dedupeRows(
    filteredRows.filter((row) => isExitRow(row)),
    (row) => `${row.matricule}-${getExitDate(row)}`,
  );

  const selectedExits = effectiveAssociationDate
    ? dedupeRows(
        filteredRows.filter((row) => isExitRow(row) && getExitDate(row) === effectiveAssociationDate),
        (row) => `${row.matricule}-${getExitDate(row)}`,
      )
    : [];

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedDate("");
    setGroupFilter("all");
    setSegmentFilter("all");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MovementStatCard
          title={tr("Entrees", "Entries")}
          subtitle={
            selectedDate
              ? tr("Basee sur la date d'association choisie", "Based on the selected association date")
              : tr("Basee sur la derniere date d'association", "Based on the latest association date")
          }
          value={associationEntries.length}
          icon={ArrowDownRight}
          iconBg="bg-[#fff2e8]"
          iconColor="text-[#fc6200]"
        />
        <MovementStatCard
          title={tr("Sorties", "Exits")}
          subtitle={tr("Motif qualification = Mise en demeure", "Qualification reason = Formal notice")}
          value={allExits.length}
          icon={ArrowUpRight}
          iconBg="bg-[#fdeeee]"
          iconColor="text-[#ea3737]"
        />
      </div>

      <div className="flex justify-end">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e0ea] bg-[#f8fbff] px-4 py-2 text-[14px] font-medium text-[#4f5f75] shadow-sm">
          <CalendarDays className="h-4 w-4" />
          {effectiveAssociationDate
            ? selectedDate
              ? formatDateLabel(selectedDate)
              : tr("Derniere date detectee", "Latest detected date") + `: ${formatDateLabel(effectiveAssociationDate)}`
            : tr("Aucune date d'association detectee", "No association date detected")}
        </div>
      </div>

      <Card className="rounded-[22px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8290]" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={tr(
                "Rechercher par nom, matricule, groupe ou segment...",
                "Search by name, ID, group, or segment...",
              )}
              className="h-12 rounded-xl border-[#d7dde1] pl-11 text-[15px]"
            />
          </div>
          <Button variant="outline" className="h-12 rounded-xl border-[#ccd4d8] px-5 text-[15px]">
            {tr("Filtres", "Filters")}
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <label htmlFor="qualification-movement-date" className="text-sm font-medium text-[#252930]">
              {tr("Date du mouvement", "Movement date")}
            </label>
            <Input
              id="qualification-movement-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-12 rounded-xl border-[#d7dde1] text-[15px]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="qualification-movement-group" className="text-sm font-medium text-[#252930]">
              {tr("Groupe", "Group")}
            </label>
            <select
              id="qualification-movement-group"
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#d7dde1] bg-white px-4 text-[15px] outline-none focus:border-[#0f63f2]"
            >
              <option value="all">{tr("Tous les groupes", "All groups")}</option>
              {availableGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="qualification-movement-segment" className="text-sm font-medium text-[#252930]">
              {tr("Segment", "Segment")}
            </label>
            <select
              id="qualification-movement-segment"
              value={segmentFilter}
              onChange={(event) => setSegmentFilter(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#d7dde1] bg-white px-4 text-[15px] outline-none focus:border-[#0f63f2]"
            >
              <option value="all">{tr("Tous les segments", "All segments")}</option>
              {availableSegments.map((segment) => (
                <option key={segment} value={segment}>
                  {segment}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              className="h-12 rounded-xl border-[#ccd4d8] px-5 text-[15px]"
              onClick={resetFilters}
            >
              {tr("Reinitialiser", "Reset")}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MovementStatCard
          title={tr("Nouvelles Recrues", "New Entries")}
          subtitle={
            selectedDate
              ? tr("Collaborateurs associes a la date choisie", "Collaborators associated on the selected date")
              : tr("Collaborateurs associes sur la derniere date detectee", "Collaborators associated on the latest detected date")
          }
          value={associationEntries.length}
          icon={ArrowDownRight}
          iconBg="bg-[#eaf3ff]"
          iconColor="text-[#0f63f2]"
        />
        <MovementStatCard
          title={tr("Sorties du Jour", "Daily Exits")}
          subtitle={tr("Motif qualification = Mise en demeure", "Qualification reason = Formal notice")}
          value={selectedExits.length}
          icon={ArrowUpRight}
          iconBg="bg-[#fdeeee]"
          iconColor="text-[#ea3737]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MovementTable
          title={tr("Liste des Entrees", "Entries List")}
          emptyLabel={
            effectiveAssociationDate
              ? tr("Aucune nouvelle entree pour cette date.", "No new entries for this date.")
              : tr("Aucune date d'association disponible.", "No association date available.")
          }
          rows={associationEntries}
        />
        <MovementTable
          title={tr("Liste des Sorties", "Exits List")}
          emptyLabel={tr("Aucune sortie pour cette date.", "No exits for this date.")}
          rows={selectedExits}
          dateResolver={getExitDate}
        />
      </div>
    </div>
  );
}
