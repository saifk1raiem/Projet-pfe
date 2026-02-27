import { Card } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function QualificationStatusChart() {
  const data = [
    { name: "Qualifié", value: 1092, color: "#1bb37d" },
    { name: "En cours", value: 94, color: "#f59e0b" },
    { name: "Non associé", value: 32, color: "#ef4444" },
    { name: "Dépassement", value: 30, color: "#7c55e8" },
  ];

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="mb-1 text-[38px] font-medium text-[#1b1e23]">Statut de Qualification</h3>
        <p className="text-[15px] text-[#5f6777]">État actuel des qualifications des collaborateurs</p>
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
