import { useMemo } from "react";
import { Card } from "../ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAppPreferences } from "../../context/AppPreferencesContext";

const COLORS = ["#005ca9", "#3b82f6", "#7c55e8", "#f59e0b", "#19abc8", "#10b981"];

export function CollaborateursGroupeChart({ data = [], isLoading = false, loadError = "" }) {
  const { tr } = useAppPreferences();
  const chartData = useMemo(
    () =>
      data.map((entry, index) => ({
        name: entry.label,
        value: entry.value,
        color: COLORS[index % COLORS.length],
      })),
    [data],
  );
  const total = useMemo(
    () => chartData.reduce((sum, entry) => sum + entry.value, 0),
    [chartData],
  );

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">
          {tr("Repartition par Centre de Cout", "Distribution by Cost Center")}
        </h3>
        <p className="text-[15px] text-[#5f6777]">
          {tr("Distribution reelle des collaborateurs par centre de cout", "Live collaborator distribution by cost center")}
        </p>
        {loadError ? <p className="mt-2 text-[13px] text-[#b42318]">{loadError}</p> : null}
      </div>

      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center text-[15px] text-[#5f6777]">
          {tr("Chargement...", "Loading...")}
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-[15px] text-[#5f6777]">
          {tr("Aucune donnee disponible.", "No data available.")}
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
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value}`, tr("Collaborateurs", "Collaborators")]} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
