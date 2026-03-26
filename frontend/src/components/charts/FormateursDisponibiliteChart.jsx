import { useMemo } from "react";
import { Card } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAppPreferences } from "../../context/AppPreferencesContext";

export function FormateursDisponibiliteChart({ data = [], isLoading = false, loadError = "" }) {
  const { tr } = useAppPreferences();
  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        semaine: entry.label,
        disponibles: entry.disponibles,
        occupes: entry.occupes,
      })),
    [data],
  );

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">
          {tr("Disponibilite des Formateurs", "Trainer Availability")}
        </h3>
        <p className="text-[15px] text-[#5f6777]">
          {tr(
            "Apercu hebdomadaire calcule depuis les qualifications ouvertes",
            "Weekly snapshot computed from open qualifications",
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
          <BarChart data={chartData} barGap={5}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9dee2" />
            <XAxis dataKey="semaine" stroke="#6b7280" style={{ fontSize: "13px" }} />
            <YAxis stroke="#6b7280" style={{ fontSize: "13px" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #d9dee2",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar
              dataKey="disponibles"
              fill="#005ca9"
              radius={[8, 8, 0, 0]}
              name={tr("Disponibles", "Available")}
            />
            <Bar
              dataKey="occupes"
              fill="#f59e0b"
              radius={[8, 8, 0, 0]}
              name={tr("Occupes", "Busy")}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
