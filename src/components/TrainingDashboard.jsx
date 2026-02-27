import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  GraduationCap, 
  BookOpen, 
  Clock,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { EntreesSortiesChart } from "./EntreesSortiesChart";
import { FormateursDisponibiliteChart } from "./FormateursDisponibiliteChart";
import { CollaborateursGroupeChart } from "./CollaborateursGroupeChart";
import { QualificationStatusChart } from "./QualificationStatusChart";
import { HeuresPresenceChart } from "./HeuresPresenceChart";
import { AnalyseDefautsChart } from "./AnalyseDefautsChart";

export function TrainingDashboard() {
  // Mock data
  const kpiData = {
    totalCollaborateurs: 1248,
    nouveauxCollaborateurs: 47,
    sorties: 12,
    formateursDisponibles: 24,
    formationsEnCours: 18,
    tauxQualification: 87.5,
    tauxRequalification: 12.3,
    tauxPresence: 94.2
  };

  const trends = {
    collaborateurs: 3.2,
    entrees: 8.5,
    sorties: -2.1,
    formateurs: 5.0,
    formations: 12.0,
    qualification: 2.5,
    requalification: -1.2,
    presence: 1.8
  };

  const KPICard = ({ title, value, icon: Icon, trend, suffix = "", iconColor = "text-primary", iconBg = "bg-primary/10" }) => (
    <Card className="p-5 bg-white border-border/40 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-foreground">{value}{suffix}</h3>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8faf9' }}>
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Bonjour, Seef 👋</h1>
              <p className="text-muted-foreground mt-1">
                Système Intelligent de Gestion de Formation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
                Données mises à jour aujourd'hui
              </Badge>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Collaborateurs"
            value={kpiData.totalCollaborateurs}
            icon={Users}
            trend={trends.collaborateurs}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <KPICard
            title="Nouvelles Entrées"
            value={kpiData.nouveauxCollaborateurs}
            icon={UserPlus}
            trend={trends.entrees}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          <KPICard
            title="Sorties"
            value={kpiData.sorties}
            icon={UserMinus}
            trend={trends.sorties}
            iconColor="text-red-600"
            iconBg="bg-red-50"
          />
          <KPICard
            title="Formateurs Disponibles"
            value={kpiData.formateursDisponibles}
            icon={GraduationCap}
            trend={trends.formateurs}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Formations en Cours"
            value={kpiData.formationsEnCours}
            icon={BookOpen}
            trend={trends.formations}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
          />
          <KPICard
            title="Taux de Présence"
            value={kpiData.tauxPresence}
            suffix="%"
            icon={Clock}
            trend={trends.presence}
            iconColor="text-teal-600"
            iconBg="bg-teal-50"
          />
        </div>

        {/* Répartition par Centre de Coût et Segment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CollaborateursGroupeChart />
          <QualificationStatusChart />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EntreesSortiesChart />
          <FormateursDisponibiliteChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HeuresPresenceChart />
          <AnalyseDefautsChart />
        </div>
      </div>
    </div>
  );
}