import { Card } from "./ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function HeuresPresenceChart() {
  const data = [
    { mois: "Jan", heures: 18560, objectif: 19200 },
    { mois: "Fev", heures: 17280, objectif: 17920 },
    { mois: "Mar", heures: 19120, objectif: 19200 },
    { mois: "Avr", heures: 18240, objectif: 18560 },
    { mois: "Mai", heures: 17920, objectif: 19200 },
    { mois: "Jun", heures: 18880, objectif: 18560 },
    { mois: "Jul", heures: 16320, objectif: 19200 },
    { mois: "Aou", heures: 15040, objectif: 19200 },
    { mois: "Sep", heures: 18720, objectif: 18560 },
    { mois: "Oct", heures: 19440, objectif: 19200 },
    { mois: "Nov", heures: 18960, objectif: 18560 },
    { mois: "Dec", heures: 17600, objectif: 19200 },
  ];

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="leoni-display-lg mb-1 text-[38px] font-medium text-[#1b1e23]">Heures de Presence Mensuelles</h3>
        <p className="text-[15px] text-[#5f6777]">Comparaison heures reelles vs objectifs</p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorHeures" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#005ca9" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#005ca9" stopOpacity={0.08} />
            </linearGradient>
            <linearGradient id="colorObjectif" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7a8090" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#7a8090" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9dee2" />
          <XAxis dataKey="mois" stroke="#6b7280" style={{ fontSize: "13px" }} />
          <YAxis stroke="#6b7280" style={{ fontSize: "13px" }} />
          <Tooltip />
          <Area type="monotone" dataKey="objectif" stroke="#6f7584" strokeWidth={2} fillOpacity={1} fill="url(#colorObjectif)" />
          <Area type="monotone" dataKey="heures" stroke="#005ca9" strokeWidth={2} fillOpacity={1} fill="url(#colorHeures)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
