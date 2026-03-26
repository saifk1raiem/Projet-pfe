import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { Card } from "../ui/card";

const STATUS_DEFINITION = [
  {
    key: "qualifie",
    nameFr: "Qualifie",
    nameEn: "Qualified",
    labels: ["Qualifie", "Qualified"],
    color: "#005ca9",
  },
  {
    key: "en_cours",
    nameFr: "En cours",
    nameEn: "In progress",
    labels: ["En cours", "In progress"],
    color: "#fc6200",
  },
  {
    key: "non_associee",
    nameFr: "Non associee",
    nameEn: "Not associated",
    labels: ["Non associee", "Not associated"],
    color: "#ea3737",
  },
  {
    key: "depassement",
    nameFr: "Depassement",
    nameEn: "Overdue",
    labels: ["Depassement", "Overdue"],
    color: "#7b35e8",
  },
];

const buildChartData = (tr, rows = []) =>
  STATUS_DEFINITION.map((status) => ({
    key: status.key,
    name: tr(status.nameFr, status.nameEn),
    value:
      rows.find((entry) => status.labels.includes(entry.label))?.value ?? 0,
    color: status.color,
  }));

export function QualificationStatusChart({ data = [], isLoading = false, loadError = "" }) {
  const { tr } = useAppPreferences();
  const chartData = useMemo(() => buildChartData(tr, data), [data, tr]);

  const total = useMemo(
    () => chartData.reduce((sum, entry) => sum + entry.value, 0),
    [chartData],
  );

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">Statut de Qualification</h3>
        <p className="text-[15px] text-[#5f6777]">Etat actuel de toutes les lignes de qualification</p>
        {loadError ? <p className="mt-2 text-[13px] text-[#b42318]">{loadError}</p> : null}
      </div>

      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center text-[15px] text-[#5f6777]">
          {tr("Chargement...", "Loading...")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="52%"
              labelLine={false}
              label={({ name, percent }) => {
                const percentage = total > 0 && Number.isFinite(percent) ? (percent * 100).toFixed(0) : "0";
                return `${name} ${percentage}%`;
              }}
              outerRadius={124}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => {
                const statusName = item?.payload?.name ?? "";
                return [`${value}`, statusName];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
