import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BookOpen, Calendar, Clock3, CheckCircle2, Layers3, AlertCircle } from "lucide-react";
import { useAppPreferences } from "../context/AppPreferencesContext";

const Stat = ({ icon: Icon, title, value, color }) => (
  <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color.bg}`}>
        <Icon className={`h-5 w-5 ${color.text}`} />
      </div>
      <div>
        <p className="text-[15px] text-[#5f6777]">{title}</p>
        <p className="leoni-metric text-[36px] font-semibold leading-tight text-[#191c20]">{value}</p>
      </div>
    </div>
  </Card>
);

const formatDuration = (durationDays, tr) => {
  if (!durationDays) {
    return tr("Non definie", "Not set");
  }
  return tr(`${durationDays} jours`, `${durationDays} days`);
};

export function FormationPage({ openFormationId = null, currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const isObserver = currentUser?.role === "observer";
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;

    const loadFormations = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/formations", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (!cancelled) {
            setLoadError(tr("Impossible de charger les formations.", "Failed to load formations."));
          }
          return;
        }

        const data = await response.json().catch(() => []);
        if (!cancelled && Array.isArray(data)) {
          setFormations(data);
          setLoadError("");
        }
      } catch {
        if (!cancelled) {
          setLoadError(tr("Impossible de charger les formations.", "Failed to load formations."));
        }
      }
    };

    loadFormations();
    return () => {
      cancelled = true;
    };
  }, [accessToken, tr]);

  useEffect(() => {
    if (openFormationId === null) {
      return;
    }
    const targetFormation = formations.find((formation) => formation.id === openFormationId);
    if (targetFormation) {
      setSelectedFormation(targetFormation);
    }
  }, [openFormationId, formations]);

  const totalFormations = formations.length;
  const configuredDurations = formations.filter((formation) => Number.isFinite(formation.duration_days));
  const averageDuration = configuredDurations.length
    ? (configuredDurations.reduce((sum, formation) => sum + formation.duration_days, 0) / configuredDurations.length).toFixed(1)
    : "0";
  const domainesCount = new Set(formations.map((formation) => formation.field).filter(Boolean)).size;

  if (selectedFormation) {
    return (
      <div className="space-y-5 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="leoni-display-lg text-[36px] font-semibold leading-tight text-[#171a1f]">
              {tr("Details de la formation", "Training details")}
            </h1>
            <p className="mt-1 text-[18px] text-[#5d6574]">{selectedFormation.name}</p>
          </div>
          <Button variant="outline" className="h-10 rounded-xl px-5" onClick={() => setSelectedFormation(null)}>
            {tr("Retour", "Back")}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Stat icon={BookOpen} title={tr("Code", "Code")} value={selectedFormation.code} color={{ bg: "bg-[#e6f0ff]", text: "text-[#0f63f2]" }} />
          <Stat icon={Clock3} title={tr("Duree", "Duration")} value={formatDuration(selectedFormation.duration_days, tr)} color={{ bg: "bg-[#f3edff]", text: "text-[#9029ff]" }} />
          <Stat icon={Layers3} title={tr("Domaine", "Domain")} value={selectedFormation.field || tr("Non defini", "Not set")} color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
          <Stat icon={CheckCircle2} title={tr("Statut", "Status")} value={tr("Disponible", "Available")} color={{ bg: "bg-[#eff2f5]", text: "text-[#5f6777]" }} />
        </div>

        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-[#5f6777]">{tr("Nom de la formation", "Training name")}</p>
              <p className="text-[28px] font-semibold text-[#191c20]">{selectedFormation.name}</p>
            </div>
            <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[14px] font-medium text-[#005ca9]">
              {tr("Formation reference", "Reference training")}
            </Badge>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[14px] text-[#5f6777]">
            <Calendar className="h-4 w-4 text-[#005ca9]" />
            <span>
              {tr(
                "Cette fiche est alimentee depuis la table des formations.",
                "This card is populated from the formations table.",
              )}
            </span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">{tr("Gestion des Formations", "Training Management")}</h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">{tr("Catalogue et parametres des formations", "Training catalog and settings")}</p>
        </div>
        <Button
          className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]"
          disabled={isObserver}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          {tr("Nouvelle Formation", "New Training")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat icon={BookOpen} title={tr("Formations", "Trainings")} value={totalFormations} color={{ bg: "bg-[#e6f0ff]", text: "text-[#0f63f2]" }} />
        <Stat icon={Clock3} title={tr("Duree moyenne", "Average duration")} value={tr(`${averageDuration} jours`, `${averageDuration} days`)} color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
        <Stat icon={Layers3} title={tr("Domaines", "Domains")} value={domainesCount} color={{ bg: "bg-[#f3edff]", text: "text-[#9029ff]" }} />
        <Stat icon={CheckCircle2} title={tr("Avec duree", "With duration")} value={configuredDurations.length} color={{ bg: "bg-[#eff2f5]", text: "text-[#5f6777]" }} />
      </div>

      {loadError ? (
        <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-[#8a1d1d] shadow-sm">
          {loadError}
        </Card>
      ) : null}

      <div className="space-y-4">
        {formations.map((formation) => (
          <Card key={formation.id} className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <h3 className="text-[36px] font-medium leading-tight text-[#191c20]">{formation.name}</h3>
                  <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[14px] font-medium text-[#005ca9]">
                    {formation.code}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-5 text-[15px] text-[#5f6777]">
                  <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {formatDuration(formation.duration_days, tr)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Layers3 className="h-4 w-4" />
                    {formation.field || tr("Domaine non defini", "No domain set")}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-[#ccd4d8] px-5 text-[16px]"
                onClick={() => setSelectedFormation(formation)}
              >
                {tr("Details", "Details")}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0ff]">
                  <BookOpen className="h-4 w-4 text-[#0f63f2]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#5f6777]">{tr("Code", "Code")}</p>
                  <p className="text-[24px] font-medium text-[#191c20]">{formation.code}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3edff]">
                  <Clock3 className="h-4 w-4 text-[#9029ff]" />
                </div>
                <div>
                  <p className="text-[13px] text-[#5f6777]">{tr("Duree", "Duration")}</p>
                  <p className="text-[24px] font-medium text-[#191c20]">{formatDuration(formation.duration_days, tr)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f1fb]">
                  {formation.field ? (
                    <CheckCircle2 className="h-4 w-4 text-[#005ca9]" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[#fc6200]" />
                  )}
                </div>
                <div>
                  <p className="text-[13px] text-[#5f6777]">{tr("Domaine", "Domain")}</p>
                  <p className={`text-[24px] font-medium ${formation.field ? "text-[#005ca9]" : "text-[#fc6200]"}`}>
                    {formation.field || tr("A completer", "To complete")}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
