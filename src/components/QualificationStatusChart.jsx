import { Card } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function QualificationStatusChart() {
  // Mock data pour le statut de qualification
  const data = [
    { name: "Qualifié", value: 1092, color: "#10b981" },
    { name: "En cours", value: 94, color: "#f59e0b" },
    { name: "Non associé", value: 32, color: "#ef4444" },
    { name: "Dépassement", value: 30, color: "#8b5cf6" }
  ];

  const COLORS = data.map(item => item.color);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white p-3 border border-border/40 rounded-lg shadow-md">
          <p className="text-sm font-semibold text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {item.value} collaborateurs ({((item.value / total) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6 bg-white border-border/40 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Statut de Qualification
        </h3>
        <p className="text-sm text-muted-foreground">
          État actuel des qualifications des collaborateurs
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {data.map((item, index) => (
          <div key={index} className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">{item.name}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}