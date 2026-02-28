import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import {
  Users,
  UserPlus,
  UserMinus,
  GraduationCap,
  BookOpen,
  Clock3,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { EntreesSortiesChart } from "./EntreesSortiesChart";
import { FormateursDisponibiliteChart } from "./FormateursDisponibiliteChart";
import { CollaborateursGroupeChart } from "./CollaborateursGroupeChart";
import { QualificationStatusChart } from "./QualificationStatusChart";
import { HeuresPresenceChart } from "./HeuresPresenceChart";
import { AnalyseDefautsChart } from "./AnalyseDefautsChart";

const KPI = ({ title, value, icon: Icon, trend, suffix = "", iconColor, iconBg }) => (
  <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[15px] text-[#5f6777]">{title}</p>
        <div className="mt-1 flex items-baseline gap-3">
          <h3 className="text-[42px] font-semibold leading-none text-[#191c20]">
            {value}
            {suffix}
          </h3>
          {typeof trend === "number" && (
            <div className={`flex items-center gap-1 text-[14px] ${trend >= 0 ? "text-[#005ca9]" : "text-[#ea3737]"}`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
    </div>
  </Card>
);

export function TrainingDashboard() {
  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-tight text-[#171a1f]">Bonjour, Seef</h1>
          <p className="mt-1 text-[18px] text-[#5d6574]">Systeme Intelligent de Gestion de Formation</p>
        </div>
        <Badge className="mt-2 rounded-xl border border-[#b9d3ea] bg-[#e8f1fb] px-4 py-2 text-[14px] font-medium text-[#005ca9]">
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#2e8ad7]" />
          Donnees mises a jour aujourd'hui
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <KPI title="Total Collaborateurs" value="1248" icon={Users} trend={3.2} iconColor="text-[#0f63f2]" iconBg="bg-[#e8f0ff]" />
        <KPI title="Nouvelles Entrees" value="47" icon={UserPlus} trend={8.5} iconColor="text-[#005ca9]" iconBg="bg-[#e8f1fb]" />
        <KPI title="Sorties" value="12" icon={UserMinus} trend={-2.1} iconColor="text-[#ea3737]" iconBg="bg-[#fdeeee]" />
        <KPI title="Formateurs Disponibles" value="24" icon={GraduationCap} trend={5} iconColor="text-[#9029ff]" iconBg="bg-[#f3edff]" />
      </div>

      <div className="grid max-w-[52rem] grid-cols-1 gap-4 md:grid-cols-2">
        <KPI title="Formations en Cours" value="18" icon={BookOpen} trend={12} iconColor="text-[#fc6200]" iconBg="bg-[#fff2e4]" />
        <KPI title="Taux de Presence" value="94.2" suffix="%" icon={Clock3} trend={1.8} iconColor="text-[#009a8a]" iconBg="bg-[#e6f4f3]" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <CollaborateursGroupeChart />
        <QualificationStatusChart />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <EntreesSortiesChart />
        <FormateursDisponibiliteChart />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <HeuresPresenceChart />
        <AnalyseDefautsChart />
      </div>
    </div>
  );
}
