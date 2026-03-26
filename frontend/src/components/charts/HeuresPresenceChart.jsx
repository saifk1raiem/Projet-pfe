import { useMemo } from "react";
import { Card } from "../ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAppPreferences } from "../../context/AppPreferencesContext";

export function HeuresPresenceChart({ data = [], isLoading = false, loadError = "" }) {
  const { tr } = useAppPreferences();
  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        mois: entry.label,
        associations: entry.associations,
        completions: entry.completions,
      })),
    [data],
  );

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">
          {tr("Activite Mensuelle des Qualifications", "Monthly Qualification Activity")}
        </h3>
        <p className="text-[15px] text-[#5f6777]">
          {tr("Associations et completions reelles par mois", "Live qualification associations and completions by month")}
        </p>
        {loadError ? <p className="mt-2 text-[13px] text-[#b42318]">{loadError}</p> : null}
      </div>

      {isLoading ? (
        <div className="flex h-[320px] items-center justify-center text-[15px] text-[#5f6777]">
          {tr("Chargement...", "Loading...")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorAssociations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#005ca9" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#005ca9" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7a8090" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#7a8090" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9dee2" />
            <XAxis dataKey="mois" stroke="#6b7280" style={{ fontSize: "13px" }} />
            <YAxis stroke="#6b7280" style={{ fontSize: "13px" }} allowDecimals={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="completions"
              stroke="#6f7584"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCompletions)"
              name={tr("Completions", "Completions")}
            />
            <Area
              type="monotone"
              dataKey="associations"
              stroke="#005ca9"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAssociations)"
              name={tr("Associations", "Associations")}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
