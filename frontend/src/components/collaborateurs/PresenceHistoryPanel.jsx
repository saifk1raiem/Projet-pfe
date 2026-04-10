import { Loader2 } from "lucide-react";

import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { formatDisplayDate, formatDisplayDateRange } from "./helpers";
import { getStatusBadge } from "./statusBadge";

function formatPresenceRate(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0%";
  }

  return `${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
      <p className="text-[12px] text-[#64748b]">{label}</p>
      <p className="mt-1 text-[18px] font-semibold text-[#1d2025]">{value}</p>
    </div>
  );
}

export function PresenceHistoryPanel({ tr, historyState }) {
  const normalizedState = historyState ?? {};
  const summary =
    normalizedState.summary && typeof normalizedState.summary === "object"
      ? normalizedState.summary
      : {};
  const history = Array.isArray(normalizedState.history) ? normalizedState.history : [];
  const isLoading = Boolean(normalizedState.loading);
  const error = normalizedState.error || "";
  const reportingMonths = normalizedState.reporting_months ?? 2;

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#dfe5e2] bg-[#fbfdff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-semibold text-[#171a1f]">
            {tr("Historique de presence", "Attendance history")}
          </p>
          <p className="mt-1 text-[13px] text-[#64748b]">
            {tr("Periode analysee", "Tracked period")}:{" "}
            {formatDisplayDateRange(normalizedState.period_start, normalizedState.period_end)}
          </p>
        </div>
        <Badge
          variant="outline"
          className="rounded-xl border-[#d5dce0] bg-white px-3 py-1 text-[13px] text-[#4f5f75]"
        >
          {tr(`${reportingMonths} mois`, `${reportingMonths} months`)}
        </Badge>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[#5f6777]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("Chargement de l'historique...", "Loading history...")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={tr("Taux de presence", "Attendance rate")}
          value={formatPresenceRate(summary.presence_rate)}
        />
        <SummaryCard
          label={tr("Lignes suivies", "Tracked records")}
          value={summary.tracked_rows ?? 0}
        />
        <SummaryCard
          label={tr("Dans les delais", "On track")}
          value={summary.on_track_count ?? 0}
        />
        <SummaryCard
          label={tr("Depassements", "Overdue")}
          value={summary.overdue_count ?? 0}
        />
      </div>

      {summary.latest_status ? (
        <div className="flex items-center gap-2">
          <p className="text-[13px] text-[#64748b]">{tr("Dernier etat", "Latest status")}:</p>
          {getStatusBadge(summary.latest_status) || (
            <span className="text-[13px] font-medium text-[#1d2025]">{summary.latest_status}</span>
          )}
        </div>
      ) : null}

      {!isLoading && !error && history.length === 0 ? (
        <Card className="rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm text-[#5f6777] shadow-none">
          {tr(
            "Aucune presence ou qualification detectee sur cette periode de 2 mois.",
            "No attendance or qualification activity was detected in this 2-month period.",
          )}
        </Card>
      ) : null}

      {!isLoading && !error && history.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[14px] font-semibold text-[#252930]">
                  {tr("Date", "Date")}
                </TableHead>
                <TableHead className="text-[14px] font-semibold text-[#252930]">
                  {tr("Formation", "Training")}
                </TableHead>
                <TableHead className="text-[14px] font-semibold text-[#252930]">
                  {tr("Formateur", "Trainer")}
                </TableHead>
                <TableHead className="text-[14px] font-semibold text-[#252930]">
                  {tr("Etat", "Status")}
                </TableHead>
                <TableHead className="text-[14px] font-semibold text-[#252930]">
                  {tr("Motif", "Reason")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id} className="h-14">
                  <TableCell className="text-[14px] text-[#445064]">
                    {formatDisplayDate(item.date)}
                  </TableCell>
                  <TableCell className="text-[14px] text-[#1d2025]">
                    <div className="font-medium">{item.titre || "-"}</div>
                    <div className="text-[12px] text-[#64748b]">{item.code || "-"}</div>
                  </TableCell>
                  <TableCell className="text-[14px] text-[#445064]">{item.formateur || "-"}</TableCell>
                  <TableCell>
                    {getStatusBadge(item.etat) || (
                      <span className="text-[13px] font-medium text-[#1d2025]">{item.etat || "-"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[14px] text-[#445064]">{item.motif || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
