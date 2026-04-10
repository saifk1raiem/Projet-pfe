import { createElement, useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
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
import { EntreesSortiesChart } from "../charts/EntreesSortiesChart";
import { FormateursDisponibiliteChart } from "../charts/FormateursDisponibiliteChart";
import { CollaborateursGroupeChart } from "../charts/CollaborateursGroupeChart";
import { QualificationStatusChart } from "../charts/QualificationStatusChart";
import { HeuresPresenceChart } from "../charts/HeuresPresenceChart";
import { AnalyseDefautsChart } from "../charts/AnalyseDefautsChart";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { formatDisplayDateRange } from "../collaborateurs/helpers";

const DEFAULT_DASHBOARD_METRICS = {
  period_start: null,
  period_end: null,
  comparison_period_start: null,
  comparison_period_end: null,
  total_collaborateurs: { value: null, trend: null },
  nouvelles_recrues: { value: null, trend: null },
  sorties: { value: null, trend: null },
  formateurs_disponibles: { value: null, trend: null },
  formations_en_cours: { value: null, trend: null },
  taux_presence: { value: null, trend: null },
};

const DEFAULT_DASHBOARD_CHARTS = {
  centre_cout_distribution: [],
  qualification_status_distribution: [],
  entries_exits_monthly: [],
  trainer_availability_weekly: [],
  qualification_activity_monthly: [],
  qualification_health_monthly: [],
};

const getAuthHeaders = (accessToken, headers = {}) =>
  accessToken ? { ...headers, Authorization: `Bearer ${accessToken}` } : headers;

function formatMetricValue(value, { decimals = 0 } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

const KPI = ({ title, value, icon, trend, suffix = "", iconColor, iconBg }) => (
  <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[15px] text-[#5f6777]">{title}</p>
        <div className="mt-1 flex items-baseline gap-3">
          <h3 className="leoni-metric text-[42px] font-semibold leading-none text-[#191c20]">
            {value}
            {suffix}
          </h3>
          {typeof trend === "number" && (
            <div
              className={`flex items-center gap-1 text-[14px] ${trend >= 0 ? "text-[#005ca9]" : "text-[#ea3737]"}`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </div>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}
      >
        {createElement(icon, { className: `h-6 w-6 ${iconColor}` })}
      </div>
    </div>
  </Card>
);

export function TrainingDashboard({ accessToken, currentUser }) {
  const { tr } = useAppPreferences();
  const [metrics, setMetrics] = useState(DEFAULT_DASHBOARD_METRICS);
  const [charts, setCharts] = useState(DEFAULT_DASHBOARD_CHARTS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadDashboardOverview() {
      if (!accessToken) {
        if (!isCancelled) {
          setMetrics(DEFAULT_DASHBOARD_METRICS);
          setCharts(DEFAULT_DASHBOARD_CHARTS);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch(apiUrl("/dashboard/overview"), {
          headers: getAuthHeaders(accessToken),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.detail || "Failed to load dashboard metrics.");
        }

        if (!isCancelled) {
          const nextMetrics = data.metrics ?? {};
          const nextCharts = data.charts ?? {};
          setMetrics({
            period_start: nextMetrics.period_start ?? DEFAULT_DASHBOARD_METRICS.period_start,
            period_end: nextMetrics.period_end ?? DEFAULT_DASHBOARD_METRICS.period_end,
            comparison_period_start:
              nextMetrics.comparison_period_start ?? DEFAULT_DASHBOARD_METRICS.comparison_period_start,
            comparison_period_end:
              nextMetrics.comparison_period_end ?? DEFAULT_DASHBOARD_METRICS.comparison_period_end,
            total_collaborateurs:
              nextMetrics.total_collaborateurs ?? DEFAULT_DASHBOARD_METRICS.total_collaborateurs,
            nouvelles_recrues: nextMetrics.nouvelles_recrues ?? DEFAULT_DASHBOARD_METRICS.nouvelles_recrues,
            sorties: nextMetrics.sorties ?? DEFAULT_DASHBOARD_METRICS.sorties,
            formateurs_disponibles:
              nextMetrics.formateurs_disponibles ?? DEFAULT_DASHBOARD_METRICS.formateurs_disponibles,
            formations_en_cours:
              nextMetrics.formations_en_cours ?? DEFAULT_DASHBOARD_METRICS.formations_en_cours,
            taux_presence: nextMetrics.taux_presence ?? DEFAULT_DASHBOARD_METRICS.taux_presence,
          });
          setCharts({
            centre_cout_distribution:
              nextCharts.centre_cout_distribution ?? DEFAULT_DASHBOARD_CHARTS.centre_cout_distribution,
            qualification_status_distribution:
              nextCharts.qualification_status_distribution ??
              DEFAULT_DASHBOARD_CHARTS.qualification_status_distribution,
            entries_exits_monthly:
              nextCharts.entries_exits_monthly ?? DEFAULT_DASHBOARD_CHARTS.entries_exits_monthly,
            trainer_availability_weekly:
              nextCharts.trainer_availability_weekly ??
              DEFAULT_DASHBOARD_CHARTS.trainer_availability_weekly,
            qualification_activity_monthly:
              nextCharts.qualification_activity_monthly ??
              DEFAULT_DASHBOARD_CHARTS.qualification_activity_monthly,
            qualification_health_monthly:
              nextCharts.qualification_health_monthly ??
              DEFAULT_DASHBOARD_CHARTS.qualification_health_monthly,
          });
        }
      } catch {
        if (!isCancelled) {
          setMetrics(DEFAULT_DASHBOARD_METRICS);
          setCharts(DEFAULT_DASHBOARD_CHARTS);
          setLoadError(tr("Impossible de charger les indicateurs.", "Failed to load dashboard metrics."));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardOverview();

    return () => {
      isCancelled = true;
    };
  }, [accessToken, tr]);

  const greetingName =
    currentUser?.username?.trim() ||
    currentUser?.first_name?.trim() ||
    `${currentUser?.first_name ?? ""} ${currentUser?.last_name ?? ""}`.trim() ||
    tr("Utilisateur", "User");

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">
            {tr(`Bonjour, ${greetingName}`, `Hello, ${greetingName}`)}
          </h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">
            {tr(
              "Systeme Intelligent de Gestion de Formation",
              "Smart Training Management System",
            )}
          </p>
        </div>
        <div className="mt-2 flex flex-col items-end gap-2">
          <Badge className="rounded-xl border border-[#b9d3ea] bg-[#e8f1fb] px-4 py-2 text-[14px] font-medium text-[#005ca9]">
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#2e8ad7]" />
            {tr("Donnees mises a jour aujourd'hui", "Data updated today")}
          </Badge>
          {metrics.period_start && metrics.period_end ? (
            <Badge
              variant="outline"
              className="rounded-xl border-[#d5dce0] bg-white px-4 py-2 text-[13px] font-medium text-[#4f5f75]"
            >
              {tr("Periode active", "Active period")}:{" "}
              {formatDisplayDateRange(metrics.period_start, metrics.period_end)}
            </Badge>
          ) : null}
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-[#f6d2d2] bg-[#fff5f5] px-4 py-3 text-[14px] text-[#c53030]">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <KPI
          title={tr("Total Collaborateurs", "Total Collaborators")}
          value={
            isLoading
              ? "..."
              : formatMetricValue(metrics.total_collaborateurs?.value)
          }
          icon={Users}
          trend={metrics.total_collaborateurs?.trend}
          iconColor="text-[#0f63f2]"
          iconBg="bg-[#e8f0ff]"
        />
        <KPI
          title={tr("Nouvelles Recrues", "New Entries")}
          value={
            isLoading ? "..." : formatMetricValue(metrics.nouvelles_recrues?.value)
          }
          icon={UserPlus}
          trend={metrics.nouvelles_recrues?.trend}
          iconColor="text-[#005ca9]"
          iconBg="bg-[#e8f1fb]"
        />
        <KPI
          title={tr("Sorties", "Exits")}
          value={isLoading ? "..." : formatMetricValue(metrics.sorties?.value)}
          icon={UserMinus}
          trend={metrics.sorties?.trend}
          iconColor="text-[#ea3737]"
          iconBg="bg-[#fdeeee]"
        />
        <KPI
          title={tr("Formateurs Disponibles", "Available Trainers")}
          value={
            isLoading
              ? "..."
              : formatMetricValue(metrics.formateurs_disponibles?.value)
          }
          icon={GraduationCap}
          trend={metrics.formateurs_disponibles?.trend}
          iconColor="text-[#9029ff]"
          iconBg="bg-[#f3edff]"
        />
      </div>

      <div className="grid max-w-[52rem] grid-cols-1 gap-4 md:grid-cols-2">
        <KPI
          title={tr("Formations en Cours", "Ongoing Trainings")}
          value={
            isLoading
              ? "..."
              : formatMetricValue(metrics.formations_en_cours?.value)
          }
          icon={BookOpen}
          trend={metrics.formations_en_cours?.trend}
          iconColor="text-[#fc6200]"
          iconBg="bg-[#fff2e4]"
        />
        <KPI
          title={tr("Taux de Presence", "Attendance Rate")}
          value={
            isLoading
              ? "..."
              : formatMetricValue(metrics.taux_presence?.value, { decimals: 1 })
          }
          suffix="%"
          icon={Clock3}
          trend={metrics.taux_presence?.trend}
          iconColor="text-[#009a8a]"
          iconBg="bg-[#e6f4f3]"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <CollaborateursGroupeChart
          data={charts.centre_cout_distribution}
          isLoading={isLoading}
          loadError={loadError}
        />
        <QualificationStatusChart
          data={charts.qualification_status_distribution}
          isLoading={isLoading}
          loadError={loadError}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <EntreesSortiesChart
          data={charts.entries_exits_monthly}
          isLoading={isLoading}
          loadError={loadError}
        />
        <FormateursDisponibiliteChart
          data={charts.trainer_availability_weekly}
          isLoading={isLoading}
          loadError={loadError}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <HeuresPresenceChart
          data={charts.qualification_activity_monthly}
          isLoading={isLoading}
          loadError={loadError}
        />
        <AnalyseDefautsChart
          data={charts.qualification_health_monthly}
          isLoading={isLoading}
          loadError={loadError}
        />
      </div>
    </div>
  );
}
