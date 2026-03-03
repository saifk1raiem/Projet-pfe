import { Card } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function AnalyseDefautsChart() {
  const data = [
    { mois: "Jan", justifies: 12, injustifies: 8 },
    { mois: "Fev", justifies: 15, injustifies: 5 },
    { mois: "Mar", justifies: 10, injustifies: 7 },
    { mois: "Avr", justifies: 18, injustifies: 6 },
    { mois: "Mai", justifies: 14, injustifies: 9 },
    { mois: "Jun", justifies: 11, injustifies: 4 },
    { mois: "Jul", justifies: 22, injustifies: 3 },
    { mois: "Aou", justifies: 25, injustifies: 2 },
    { mois: "Sep", justifies: 9, injustifies: 6 },
    { mois: "Oct", justifies: 13, injustifies: 5 },
    { mois: "Nov", justifies: 16, injustifies: 7 },
    { mois: "Dec", justifies: 19, injustifies: 4 },
  ];

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">Analyse des Absences</h3>
        <p className="text-[15px] text-[#5f6777]">Evolution mensuelle des absences justifiees et injustifiees</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9dee2" />
          <XAxis dataKey="mois" stroke="#6b7280" style={{ fontSize: "13px" }} />
          <YAxis stroke="#6b7280" style={{ fontSize: "13px" }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar dataKey="justifies" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Justifies" stackId="a" />
          <Bar dataKey="injustifies" fill="#ef4444" radius={[8, 8, 0, 0]} name="Injustifies" stackId="a" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-orange-500" />
          <span className="text-[14px] text-[#5f6777]">Absences justifiees</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-[14px] text-[#5f6777]">Absences injustifiees</span>
        </div>
      </div>
    </Card>
  );
}
