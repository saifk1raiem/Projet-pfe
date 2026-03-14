import { Card } from "../ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function EntreesSortiesChart() {
  const data = [
    { mois: "Jan", entrees: 42, sorties: 15 },
    { mois: "Fev", entrees: 38, sorties: 18 },
    { mois: "Mar", entrees: 51, sorties: 12 },
    { mois: "Avr", entrees: 47, sorties: 20 },
    { mois: "Mai", entrees: 55, sorties: 14 },
    { mois: "Jun", entrees: 49, sorties: 16 },
    { mois: "Jul", entrees: 35, sorties: 22 },
    { mois: "Aou", entrees: 28, sorties: 19 },
    { mois: "Sep", entrees: 63, sorties: 11 },
    { mois: "Oct", entrees: 58, sorties: 13 },
    { mois: "Nov", entrees: 52, sorties: 17 },
    { mois: "Dec", entrees: 47, sorties: 12 },
  ];

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">Evolution des Entrees/Sorties</h3>
        <p className="text-[15px] text-[#5f6777]">Analyse mensuelle des mouvements de collaborateurs</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9dee2" />
          <XAxis dataKey="mois" stroke="#6b7280" style={{ fontSize: "13px" }} />
          <YAxis stroke="#6b7280" style={{ fontSize: "13px" }} />
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
            name="Entrees"
          />
          <Line
            type="monotone"
            dataKey="sorties"
            stroke="#ef4444"
            strokeWidth={2.5}
            dot={{ fill: "#ef4444", r: 4 }}
            activeDot={{ r: 6 }}
            name="Sorties"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
