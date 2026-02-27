import { Card } from "./ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function AnalyseDefautsChart() {
  const data = [
    { mois: "Jan", justifies: 12, injustifies: 8 },
    { mois: "Fév", justifies: 15, injustifies: 5 },
    { mois: "Mar", justifies: 10, injustifies: 7 },
    { mois: "Avr", justifies: 18, injustifies: 6 },
    { mois: "Mai", justifies: 14, injustifies: 9 },
    { mois: "Jun", justifies: 11, injustifies: 4 },
    { mois: "Jul", justifies: 22, injustifies: 3 },
    { mois: "Aoû", justifies: 25, injustifies: 2 },
    { mois: "Sep", justifies: 9, injustifies: 6 },
    { mois: "Oct", justifies: 13, injustifies: 5 },
    { mois: "Nov", justifies: 16, injustifies: 7 },
    { mois: "Déc", justifies: 19, injustifies: 4 },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const total = payload[0].value + payload[1].value;

      return (
        <div className="bg-white p-3 border border-border/40 rounded-lg shadow-md">
          <p className="text-sm font-semibold text-foreground mb-2">
            {payload[0].payload.mois}
          </p>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Justifiés:{" "}
              <span
                className="font-semibold"
                style={{ color: "#f59e0b" }}
              >
                {payload[0].value}
              </span>
            </p>

            <p className="text-sm text-muted-foreground">
              Injustifiés:{" "}
              <span
                className="font-semibold"
                style={{ color: "#ef4444" }}
              >
                {payload[1].value}
              </span>
            </p>

            <p className="text-sm font-semibold text-foreground mt-1">
              Total: {total} défauts
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="p-6 bg-white border-border/40 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Analyse des Absence
        </h3>
        <p className="text-sm text-muted-foreground">
          Évolution mensuelle des absences justifiées et injustifiées
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="mois"
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />

          <YAxis
            stroke="#6b7280"
            style={{ fontSize: "12px" }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend wrapperStyle={{ fontSize: "12px" }} />

          <Bar
            dataKey="justifies"
            fill="#f59e0b"
            radius={[8, 8, 0, 0]}
            name="Justifiés"
            stackId="a"
          />

          <Bar
            dataKey="injustifies"
            fill="#ef4444"
            radius={[8, 8, 0, 0]}
            name="Injustifiés"
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-sm text-muted-foreground">
            Absences justifiées
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm text-muted-foreground">
            Absences injustifiées
          </span>
        </div>
      </div>
    </Card>
  );
}