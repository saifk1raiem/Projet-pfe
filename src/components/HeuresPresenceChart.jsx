import { Card } from "./ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function HeuresPresenceChart() {
  // Mock data pour les heures de présence mensuelles
  const data = [
    { mois: "Jan", heures: 18560, objectif: 19200 },
    { mois: "Fév", heures: 17280, objectif: 17920 },
    { mois: "Mar", heures: 19120, objectif: 19200 },
    { mois: "Avr", heures: 18240, objectif: 18560 },
    { mois: "Mai", heures: 17920, objectif: 19200 },
    { mois: "Jun", heures: 18880, objectif: 18560 },
    { mois: "Jul", heures: 16320, objectif: 19200 },
    { mois: "Aoû", heures: 15040, objectif: 19200 },
    { mois: "Sep", heures: 18720, objectif: 18560 },
    { mois: "Oct", heures: 19440, objectif: 19200 },
    { mois: "Nov", heures: 18960, objectif: 18560 },
    { mois: "Déc", heures: 17600, objectif: 19200 }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-border/40 rounded-lg shadow-md">
          <p className="text-sm font-semibold text-foreground mb-2">{payload[0].payload.mois}</p>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Heures réelles: <span className="font-semibold text-primary">{payload[0].value.toLocaleString()}h</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Objectif: <span className="font-semibold text-gray-600">{payload[1].value.toLocaleString()}h</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Taux: <span className="font-semibold">{((payload[0].value / payload[1].value) * 100).toFixed(1)}%</span>
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
          Heures de Présence Mensuelles
        </h3>
        <p className="text-sm text-muted-foreground">
          Comparaison heures réelles vs objectifs
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorHeures" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorObjectif" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6b7280" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#6b7280" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
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
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="objectif" 
            stroke="#6b7280" 
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorObjectif)" 
            name="Objectif"
          />
          <Area 
            type="monotone" 
            dataKey="heures" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorHeures)" 
            name="Heures réelles"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}