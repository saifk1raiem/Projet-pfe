import { useMemo } from "react";
import { Card } from "../ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAppPreferences } from "../../context/AppPreferencesContext";

export function EntreesSortiesChart({ data = [], isLoading = false, loadError = "" }) {
  const { tr } = useAppPreferences();
  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        mois: entry.label,
        entrees: entry.entries,
        sorties: entry.exits,
      })),
    [data],
  );

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">
          {tr("Evolution des Entrees/Sorties", "Entries / Exits Trend")}
        </h3>
        <p className="text-[15px] text-[#5f6777]">
          {tr(
            "Nouvelles recrues et sorties du pipeline de qualification par mois",
            "Monthly new recruits and qualification-pipeline exits",
          )}
        </p>
        {loadError ? <p className="mt-2 text-[13px] text-[#b42318]">{loadError}</p> : null}
      </div>

      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center text-[15px] text-[#5f6777]">
          {tr("Chargement...", "Loading...")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9dee2" />
            <XAxis dataKey="mois" stroke="#6b7280" style={{ fontSize: "13px" }} />
            <YAxis stroke="#6b7280" style={{ fontSize: "13px" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #d9dee2",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
            <Line
              type="monotone"
              dataKey="entrees"
              stroke="#005ca9"
              strokeWidth={2.5}
              dot={{ fill: "#005ca9", r: 4 }}
              activeDot={{ r: 6 }}
              name={tr("Entrees", "Entries")}
            />
            <Line
              type="monotone"
              dataKey="sorties"
              stroke="#ef4444"
              strokeWidth={2.5}
              dot={{ fill: "#ef4444", r: 4 }}
              activeDot={{ r: 6 }}
              name={tr("Sorties", "Exits")}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
