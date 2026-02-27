import { Card } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function CollaborateursGroupeChart() {
  // Mock data pour la répartition par centre de coût
  const data = [
    { name: "Production", value: 425, color: "#10b981" },
    { name: "Qualité", value: 198, color: "#3b82f6" },
    { name: "Maintenance", value: 287, color: "#8b5cf6" },
    { name: "Logistique", value: 156, color: "#f59e0b" },
    { name: "Support", value: 182, color: "#06b6d4" },
  ];

  const COLORS = data.map(item => item.color);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-border/40 rounded-lg shadow-md">
          <p className="text-sm font-semibold text-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value} collaborateurs (
            {((payload[0].value / 1248) * 100).toFixed(1)}%)
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
          Répartition par Centre de Coût
        </h3>
        <p className="text-sm text-muted-foreground">
          Distribution des collaborateurs par département
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
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}