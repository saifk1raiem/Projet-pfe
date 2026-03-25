import { createElement, useEffect, useMemo, useState } from "react";
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

const EMPTY_DASHBOARD_STATS = {
  totalCollaborators: 0,
  recruits: 0,
  exits: 0,
  availableTrainers: 0,
  latestRecruitmentDate: null,
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const hasMotif = (motifValue, expectedValue) => {
  const normalizedExpected = normalizeText(expectedValue);
  const motifValues = Array.isArray(motifValue) ? motifValue : [motifValue];
  return motifValues.some((value) => normalizeText(value) === normalizedExpected);
};

const buildDashboardStats = ({ collaborateurs, qualificationRows, formateurs }) => {
  const collaboratorRows = Array.isArray(collaborateurs) ? collaborateurs : [];
  const qualificationData = Array.isArray(qualificationRows) ? qualificationRows : [];
  const trainerRows = Array.isArray(formateurs) ? formateurs : [];

  if (collaboratorRows.length === 0 && qualificationData.length === 0 && trainerRows.length === 0) {
    return EMPTY_DASHBOARD_STATS;
  }

  const latestRecruitmentDate = collaboratorRows.reduce((latest, row) => {
    const recruitmentDate = row?.date_recrutement;
    if (!recruitmentDate) {
      return latest;
    }
    return !latest || recruitmentDate > latest ? recruitmentDate : latest;
  }, null);

  const recruits = latestRecruitmentDate
    ? collaboratorRows.filter((row) => row?.date_recrutement === latestRecruitmentDate).length
    : 0;

  const exits = qualificationData.filter((row) => hasMotif(row?.motif, "mise en demeure")).length;
  const availableTrainers = trainerRows.length;

  return {
    totalCollaborators: collaboratorRows.length,
    recruits,
    exits,
    availableTrainers,
    latestRecruitmentDate,
  };
};

const KPI = ({ title, description, value, icon, trend, suffix = "", iconColor, iconBg }) => (
  <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[15px] text-[#5f6777]">{title}</p>
        {description ? <p className="mt-1 text-[12px] text-[#8b94a3]">{description}</p> : null}
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

export function TrainingDashboard({ accessToken }) {
  const { tr } = useAppPreferences();
  const [stats, setStats] = useState(EMPTY_DASHBOARD_STATS);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDashboardStats = async () => {
      if (!accessToken) {
        setStats(EMPTY_DASHBOARD_STATS);
        setStatsError("");
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
        };
        const [collaborateursResponse, qualificationResponse, formateursResponse] = await Promise.all([
          fetch(apiUrl("/admin/collaborateurs"), { headers }),
          fetch(apiUrl("/qualification"), { headers }),
          fetch(apiUrl("/formateurs"), { headers }),
        ]);
        const [collaborateurs, qualificationRows, formateurs] = await Promise.all([
          collaborateursResponse.json().catch(() => []),
          qualificationResponse.json().catch(() => []),
          formateursResponse.json().catch(() => []),
        ]);

        if (!collaborateursResponse.ok || !qualificationResponse.ok || !formateursResponse.ok) {
          throw new Error("Failed to load dashboard data");
        }

        if (!cancelled) {
          setStats(
            buildDashboardStats({
              collaborateurs,
              qualificationRows,
              formateurs,
            }),
          );
          setStatsError("");
        }
      } catch {
        if (!cancelled) {
          setStats(EMPTY_DASHBOARD_STATS);
          setStatsError(
            tr(
              "Impossible de charger les statistiques des collaborateurs.",
              "Failed to load collaborator statistics.",
            ),
          );
        }
      }
    };

    loadDashboardStats();

    return () => {
      cancelled = true;
    };
  }, [accessToken, tr]);

  const recruitsDescription = useMemo(() => {
    if (!stats.latestRecruitmentDate) {
      return tr("Basee sur la derniere date de recrutement", "Based on the latest recruitment date");
    }

    return tr(
      `Derniere vague: ${stats.latestRecruitmentDate}`,
      `Latest cohort: ${stats.latestRecruitmentDate}`,
    );
  }, [stats.latestRecruitmentDate, tr]);

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">
            {tr("Bonjour, Seef", "Hello, Seef")}
          </h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">
            {tr(
              "Systeme Intelligent de Gestion de Formation",
              "Smart Training Management System",
            )}
          </p>
        </div>
        <Badge className="mt-2 rounded-xl border border-[#b9d3ea] bg-[#e8f1fb] px-4 py-2 text-[14px] font-medium text-[#005ca9]">
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#2e8ad7]" />
          {tr("Donnees mises a jour aujourd'hui", "Data updated today")}
        </Badge>
      </div>
      {statsError ? <p className="text-[13px] text-[#b42318]">{statsError}</p> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <KPI
          title={tr("Total Collaborateurs", "Total Collaborators")}
          description={tr("Tous les collaborateurs en base", "All collaborators in the database")}
          value={stats.totalCollaborators}
          icon={Users}
          iconColor="text-[#0f63f2]"
          iconBg="bg-[#e8f0ff]"
        />
        <KPI
          title={tr("Nouvelles Recrues", "New Recruits")}
          description={recruitsDescription}
          value={stats.recruits}
          icon={UserPlus}
          iconColor="text-[#005ca9]"
          iconBg="bg-[#e8f1fb]"
        />
        <KPI
          title={tr("Sorties", "Exits")}
          description={tr("Motif = Mise en demeure", "Reason = Mise en demeure")}
          value={stats.exits}
          icon={UserMinus}
          iconColor="text-[#ea3737]"
          iconBg="bg-[#fdeeee]"
        />
        <KPI
          title={tr("Formateurs Disponibles", "Available Trainers")}
          description={tr("Formateurs presents en base", "Trainers available in the database")}
          value={stats.availableTrainers}
          icon={GraduationCap}
          iconColor="text-[#9029ff]"
          iconBg="bg-[#f3edff]"
        />
      </div>

      <div className="grid max-w-[52rem] grid-cols-1 gap-4 md:grid-cols-2">
        <KPI
          title={tr("Formations en Cours", "Ongoing Trainings")}
          value="18"
          icon={BookOpen}
          trend={12}
          iconColor="text-[#fc6200]"
          iconBg="bg-[#fff2e4]"
        />
        <KPI
          title={tr("Taux de Presence", "Attendance Rate")}
          value="94.2"
          suffix="%"
          icon={Clock3}
          trend={1.8}
          iconColor="text-[#009a8a]"
          iconBg="bg-[#e6f4f3]"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <CollaborateursGroupeChart />
        <QualificationStatusChart accessToken={accessToken} />
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
