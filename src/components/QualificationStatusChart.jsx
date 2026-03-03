import { Card } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function QualificationStatusChart() {
  const data = [
    { name: "Qualifie", value: 1092, color: "#005ca9" },
    { name: "En cours", value: 94, color: "#f59e0b" },
    { name: "Non associe", value: 32, color: "#ef4444" },
    { name: "Depassement", value: 30, color: "#7c55e8" },
  ];

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">Statut de Qualification</h3>
        <p className="text-[15px] text-[#5f6777]">Etat actuel des qualifications des collaborateurs</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="52%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={124}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
