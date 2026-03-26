import { useMemo } from "react";
import { Card } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAppPreferences } from "../../context/AppPreferencesContext";

export function AnalyseDefautsChart({ data = [], isLoading = false, loadError = "" }) {
  const { tr } = useAppPreferences();
  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        mois: entry.label,
        dans_les_delais: entry.on_track,
        depassement: entry.overdue,
      })),
    [data],
  );

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">
          {tr("Analyse des Retards", "Delay Analysis")}
        </h3>
        <p className="text-[15px] text-[#5f6777]">
          {tr(
            "Qualifications dans les delais vs en depassement par mois",
            "Monthly qualifications on track versus overdue",
          )}
        </p>
        {loadError ? <p className="mt-2 text-[13px] text-[#b42318]">{loadError}</p> : null}
      </div>

      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center text-[15px] text-[#5f6777]">
          {tr("Chargement...", "Loading...")}
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9dee2" />
              <XAxis dataKey="mois" stroke="#6b7280" style={{ fontSize: "13px" }} />
              <YAxis stroke="#6b7280" style={{ fontSize: "13px" }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar
                dataKey="dans_les_delais"
                fill="#f59e0b"
                radius={[8, 8, 0, 0]}
                name={tr("Dans les delais", "On track")}
                stackId="a"
              />
              <Bar
                dataKey="depassement"
                fill="#ef4444"
                radius={[8, 8, 0, 0]}
                name={tr("Depassement", "Overdue")}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="text-[14px] text-[#5f6777]">{tr("Dans les delais", "On track")}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-[14px] text-[#5f6777]">{tr("Depassement", "Overdue")}</span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
