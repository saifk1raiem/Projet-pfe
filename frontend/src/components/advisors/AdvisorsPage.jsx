import { useEffect, useState } from "react";
import { AlertCircle, ChevronDown, CircleAlert, Info } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";

const severityConfig = {
  error: {
    label: "Errors",
    sublabel: "errors",
    icon: CircleAlert,
    iconColor: "text-[#d92d20]",
    badge: "border-[#f2c4c4] bg-[#fdeeee] text-[#b42318]",
  },
  warning: {
    label: "Warnings",
    sublabel: "warnings",
    icon: AlertCircle,
    iconColor: "text-[#d97706]",
    badge: "border-[#f1c59e] bg-[#fff2e4] text-[#b54708]",
  },
  info: {
    label: "Info",
    sublabel: "suggestions",
    icon: Info,
    iconColor: "text-[#12b76a]",
    badge: "border-[#b7ebcd] bg-[#ecfdf3] text-[#027a48]",
  },
};

function buildAdvisorFindings(collaborateurs, formations) {
  const findings = [];

  const collaboratorsMissingCoreInfo = collaborateurs.filter(
    (collab) => !collab.matricule || !collab.nom || !collab.prenom || !collab.fonction || !collab.groupe,
  );
  collaboratorsMissingCoreInfo.slice(0, 8).forEach((collab) => {
    const missingFields = [
      !collab.nom ? "nom" : null,
      !collab.prenom ? "prenom" : null,
      !collab.fonction ? "fonction" : null,
      !collab.groupe ? "groupe" : null,
    ].filter(Boolean);

    findings.push({
      id: `missing-core-${collab.matricule}`,
      severity: "error",
      source: "collaborateur",
      title: `Collaborateur ${collab.matricule}`,
      description: `Informations incompletes: ${missingFields.join(", ")}.`,
    });
  });

  const inductionCollaborateurs = collaborateurs.filter((collab) => collab.phase === "induction");
  if (inductionCollaborateurs.length > Math.max(formations.length * 5, 10)) {
    findings.push({
      id: "advisor-capacity-warning",
      severity: "warning",
      source: "formation",
      title: "Charge d'integration elevee",
      description: `${inductionCollaborateurs.length} collaborateurs sont en induction. Verifiez si les formateurs disponibles sont suffisants pour absorber ce volume.`,
    });
  }

  const overdueCollaborateurs = collaborateurs.filter((collab) => collab.statut === "Depassement");
  if (overdueCollaborateurs.length > 0) {
    findings.push({
      id: "advisor-overdue-warning",
      severity: "warning",
      source: "qualification",
      title: "Qualifications en depassement",
      description: `${overdueCollaborateurs.length} collaborateurs ont un statut en depassement et doivent etre revus en priorite.`,
    });
  }

  const formationsMissingMetadata = formations.filter((formation) => !formation.field || !formation.duration_days);
  if (formationsMissingMetadata.length > 0) {
    findings.push({
      id: "formations-metadata-warning",
      severity: "warning",
      source: "formation",
      title: "Formations incompletes",
      description: `${formationsMissingMetadata.length} formations n'ont pas de domaine ou de duree configuree dans la base.`,
    });
  }

  findings.push({
    id: "advisor-info-qualification",
    severity: "info",
    source: "qualification",
    title: "Couverture qualification",
    description: `${collaborateurs.filter((collab) => collab.phase === "qualification").length} collaborateurs sont actuellement en phase qualification.`,
  });
  findings.push({
    id: "advisor-info-formations",
    severity: "info",
    source: "formation",
    title: "Catalogue formations",
    description: `${formations.length} formations sont disponibles dans la base pour la qualification.`,
  });

  return findings;
}

function FindingCard({ finding }) {
  const config = severityConfig[finding.severity];

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[18px] font-semibold text-[#171a1f]">{finding.title}</h3>
            <Badge className={`rounded-lg border px-2.5 py-1 text-[12px] font-medium ${config.badge}`}>
              {finding.source}
            </Badge>
          </div>
          <p className="mt-2 text-[14px] text-[#5f6777]">{finding.description}</p>
        </div>
      </div>
    </Card>
  );
}

function SeverityTab({ severity, count }) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full ${
        severity === "error" ? "bg-[#fdeeee]" : severity === "warning" ? "bg-[#fff2e4]" : "bg-[#ecfdf3]"
      }`}>
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </div>
      <div className="text-left">
        <div className="text-[15px] font-medium text-[#344054]">{config.label}</div>
        <div className="text-[13px] text-[#667085]">
          {count} {config.sublabel}
        </div>
      </div>
    </div>
  );
}

export function AdvisorsPage({ accessToken }) {
  const { tr } = useAppPreferences();
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;

    const loadAdvisorData = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const [qualificationResponse, formationsResponse] = await Promise.all([
          fetch(apiUrl("/api/v1/qualification"), {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(apiUrl("/api/v1/formations"), {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        const qualificationData = await qualificationResponse.json().catch(() => []);
        const formationsData = await formationsResponse.json().catch(() => []);

        if (!qualificationResponse.ok || !formationsResponse.ok) {
          if (!cancelled) {
            setLoadError(tr("Impossible de charger les donnees advisor.", "Failed to load advisor data."));
          }
          return;
        }

        if (!cancelled) {
          setFindings(
            buildAdvisorFindings(
              Array.isArray(qualificationData) ? qualificationData : [],
              Array.isArray(formationsData) ? formationsData : [],
            ),
          );
        }
      } catch {
        if (!cancelled) {
          setLoadError(tr("Impossible de charger les donnees advisor.", "Failed to load advisor data."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAdvisorData();
    return () => {
      cancelled = true;
    };
  }, [accessToken, tr]);

  const counts = {
    error: findings.filter((finding) => finding.severity === "error").length,
    warning: findings.filter((finding) => finding.severity === "warning").length,
    info: findings.filter((finding) => finding.severity === "info").length,
  };

  const getFiltered = (severity) =>
    findings.filter(
      (finding) => finding.severity === severity && (sourceFilter === "all" || finding.source === sourceFilter),
    );

  return (
    <div className="space-y-5 pb-6">
      <div className="leoni-rise-up-soft">
        <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">Advisors</h1>
        <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">
          {tr(
            "Analyse des erreurs, warnings et suggestions sur les donnees collaborateurs et formations.",
            "Analysis of errors, warnings, and suggestions across collaborator and training data.",
          )}
        </p>
      </div>

      <Tabs defaultValue="error" className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-[760px] grid-cols-3 rounded-[22px] border border-[#dfe5e2] bg-white p-2 shadow-sm">
          <TabsTrigger
            value="error"
            className="rounded-[16px] border border-transparent px-5 py-4 data-[state=active]:border-[#f2c4c4] data-[state=active]:bg-[#fff7f7] data-[state=active]:shadow-none"
          >
            <SeverityTab severity="error" count={counts.error} />
          </TabsTrigger>
          <TabsTrigger
            value="warning"
            className="rounded-[16px] border border-transparent px-5 py-4 data-[state=active]:border-[#f1c59e] data-[state=active]:bg-[#fffaf3] data-[state=active]:shadow-none"
          >
            <SeverityTab severity="warning" count={counts.warning} />
          </TabsTrigger>
          <TabsTrigger
            value="info"
            className="rounded-[16px] border border-transparent px-5 py-4 data-[state=active]:border-[#b7ebcd] data-[state=active]:bg-[#f3fcf6] data-[state=active]:shadow-none"
          >
            <SeverityTab severity="info" count={counts.info} />
          </TabsTrigger>
        </TabsList>

        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
          <div className="relative inline-block">
            <Button
              variant="outline"
              className="h-10 rounded-xl border-[#ccd4d8] bg-white px-4 text-[14px] text-[#344054]"
              onClick={() => setIsFilterOpen((prev) => !prev)}
            >
              Filter
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>

            {isFilterOpen ? (
              <Card className="absolute left-0 top-12 z-20 min-w-[190px] rounded-2xl border border-[#dfe5e2] bg-white p-2 shadow-lg">
                {[
                  { value: "all", label: "All" },
                  { value: "collaborateur", label: "Collaborateurs" },
                  { value: "formation", label: "Formations" },
                  { value: "qualification", label: "Qualification" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full rounded-xl px-3 py-2 text-left text-[14px] ${
                      sourceFilter === option.value ? "bg-[#eef4ff] text-[#155eef]" : "text-[#344054] hover:bg-[#f9fafb]"
                    }`}
                    onClick={() => {
                      setSourceFilter(option.value);
                      setIsFilterOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </Card>
            ) : null}
          </div>
        </Card>

        <TabsContent value="error" className="mt-4 space-y-3">
          {loadError ? <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-[#8a1d1d]">{loadError}</Card> : null}
          {loading ? <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4">{tr("Chargement...", "Loading...")}</Card> : null}
          {!loading && !loadError && getFiltered("error").length === 0 ? <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4">No errors</Card> : null}
          {!loading && !loadError ? getFiltered("error").map((finding) => <FindingCard key={finding.id} finding={finding} />) : null}
        </TabsContent>

        <TabsContent value="warning" className="mt-4 space-y-3">
          {loadError ? <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-[#8a1d1d]">{loadError}</Card> : null}
          {loading ? <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4">{tr("Chargement...", "Loading...")}</Card> : null}
          {!loading && !loadError && getFiltered("warning").length === 0 ? <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4">No warnings</Card> : null}
          {!loading && !loadError ? getFiltered("warning").map((finding) => <FindingCard key={finding.id} finding={finding} />) : null}
        </TabsContent>

        <TabsContent value="info" className="mt-4 space-y-3">
          {loadError ? <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-[#8a1d1d]">{loadError}</Card> : null}
          {loading ? <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4">{tr("Chargement...", "Loading...")}</Card> : null}
          {!loading && !loadError && getFiltered("info").length === 0 ? <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4">No suggestions</Card> : null}
          {!loading && !loadError ? getFiltered("info").map((finding) => <FindingCard key={finding.id} finding={finding} />) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

