import { Card } from "./ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function EntreesSortiesChart() {
  // Mock data pour l'évolution mensuelle des entrées/sorties
  const data = [
    { mois: "Jan", entrees: 42, sorties: 15 },
    { mois: "Fév", entrees: 38, sorties: 18 },
    { mois: "Mar", entrees: 51, sorties: 12 },
    { mois: "Avr", entrees: 47, sorties: 20 },
    { mois: "Mai", entrees: 55, sorties: 14 },
    { mois: "Jun", entrees: 49, sorties: 16 },
    { mois: "Jul", entrees: 35, sorties: 22 },
    { mois: "Aoû", entrees: 28, sorties: 19 },
    { mois: "Sep", entrees: 63, sorties: 11 },
    { mois: "Oct", entrees: 58, sorties: 13 },
    { mois: "Nov", entrees: 52, sorties: 17 },
    { mois: "Déc", entrees: 47, sorties: 12 }
  ];

  return (
    <Card className="p-6 bg-white border-border/40 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Évolution des Entrées/Sorties
        </h3>
        <p className="text-sm text-muted-foreground">
          Analyse mensuelle des mouvements de collaborateurs
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="mois" 
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
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="entrees" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Entrées"
          />
          <Line 
            type="monotone" 
            dataKey="sorties" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
            name="Sorties"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}