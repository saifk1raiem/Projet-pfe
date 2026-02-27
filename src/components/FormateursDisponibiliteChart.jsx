import { Card } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function FormateursDisponibiliteChart() {
  // Mock data pour la disponibilité des formateurs
  const data = [
    { semaine: "S1", disponibles: 22, occupes: 2 },
    { semaine: "S2", disponibles: 20, occupes: 4 },
    { semaine: "S3", disponibles: 18, occupes: 6 },
    { semaine: "S4", disponibles: 21, occupes: 3 },
    { semaine: "S5", disponibles: 19, occupes: 5 },
    { semaine: "S6", disponibles: 23, occupes: 1 },
    { semaine: "S7", disponibles: 20, occupes: 4 },
    { semaine: "S8", disponibles: 24, occupes: 0 }
  ];

  return (
    <Card className="p-6 bg-white border-border/40 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Disponibilité des Formateurs
        </h3>
        <p className="text-sm text-muted-foreground">
          Aperçu hebdomadaire de la disponibilité des formateurs
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="semaine" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Bar 
            dataKey="disponibles" 
            fill="#10b981" 
            radius={[8, 8, 0, 0]}
            name="Disponibles"
          />
          <Bar 
            dataKey="occupes" 
            fill="#f59e0b" 
            radius={[8, 8, 0, 0]}
            name="Occupés"
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}