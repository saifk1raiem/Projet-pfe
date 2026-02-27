import { Card } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function FormateursDisponibiliteChart() {
  const data = [
    { semaine: "S1", disponibles: 22, occupes: 2 },
    { semaine: "S2", disponibles: 20, occupes: 4 },
    { semaine: "S3", disponibles: 18, occupes: 6 },
    { semaine: "S4", disponibles: 21, occupes: 3 },
    { semaine: "S5", disponibles: 19, occupes: 5 },
    { semaine: "S6", disponibles: 23, occupes: 1 },
    { semaine: "S7", disponibles: 20, occupes: 4 },
    { semaine: "S8", disponibles: 24, occupes: 0 },
  ];

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="mb-1 text-[38px] font-medium text-[#1b1e23]">Disponibilite des Formateurs</h3>
        <p className="text-[15px] text-[#5f6777]">Apercu hebdomadaire de la disponibilite des formateurs</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barGap={5}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9dee2" />
          <XAxis dataKey="semaine" stroke="#6b7280" style={{ fontSize: "13px" }} />
          <YAxis stroke="#6b7280" style={{ fontSize: "13px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #d9dee2",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar dataKey="disponibles" fill="#1bb37d" radius={[8, 8, 0, 0]} name="Disponibles" />
          <Bar dataKey="occupes" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Occupes" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
