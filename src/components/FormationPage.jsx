import { createElement, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BookOpen, Calendar, Users, Clock3, CheckCircle2, AlertCircle } from "lucide-react";
import { useAppPreferences } from "../context/AppPreferencesContext";

const formations = [
  {
    id: 1,
    titre: "Securite au Travail - Niveau 1",
    dateDebut: "20/02/2026",
    dateFin: "22/02/2026",
    formateur: "Ahmed Ben Ali",
    participants: 18,
    capacite: 20,
    duree: "3 jours",
    statut: "en_cours",
  },
  {
    id: 2,
    titre: "Qualite Produit - ISO 9001",
    dateDebut: "25/02/2026",
    dateFin: "28/02/2026",
    formateur: "Fatma Zahra",
    participants: 15,
    capacite: 15,
    duree: "4 jours",
    statut: "planifie",
  },
  {
    id: 3,
    titre: "Maintenance Preventive",
    dateDebut: "05/03/2026",
    dateFin: "08/03/2026",
    formateur: "Mohamed Salhi",
    participants: 12,
    capacite: 18,
    duree: "4 jours",
    statut: "planifie",
  },
];

const Stat = ({ icon, title, value, color }) => (
  <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color.bg}`}>
        {createElement(icon, { className: `h-5 w-5 ${color.text}` })}
      </div>
      <div>
        <p className="text-[15px] text-[#5f6777]">{title}</p>
        <p className="text-[36px] font-semibold leading-tight text-[#191c20]">{value}</p>
      </div>
    </div>
  </Card>
);

const statusBadge = {
  en_cours: "bg-[#e6f0ff] text-[#0959ec] border-[#bfccf2]",
  planifie: "bg-[#e8f1fb] text-[#005ca9] border-[#b9d3ea]",
};

export function FormationPage() {
  const { tr } = useAppPreferences();
  const [selectedFormation, setSelectedFormation] = useState(null);

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-tight text-[#171a1f]">{tr("Gestion des Formations", "Training Management")}</h1>
          <p className="mt-1 text-[18px] text-[#5d6574]">{tr("Planification et suivi des sessions de formation", "Planning and tracking of training sessions")}</p>
        </div>
        <Button className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]">
          <BookOpen className="mr-2 h-4 w-4" />
          {tr("Nouvelle Formation", "New Training")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat icon={BookOpen} title="En cours" value="1" color={{ bg: "bg-[#e6f0ff]", text: "text-[#0f63f2]" }} />
        <Stat icon={Calendar} title="Planifiees" value="2" color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
        <Stat icon={Users} title="Participants" value="65" color={{ bg: "bg-[#f3edff]", text: "text-[#9029ff]" }} />
        <Stat icon={CheckCircle2} title="Terminees" value="1" color={{ bg: "bg-[#eff2f5]", text: "text-[#5f6777]" }} />
      </div>

      {selectedFormation && (
        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[14px] text-[#5f6777]">{tr("Formation selectionnee", "Selected training")}</p>
              <p className="text-[20px] font-semibold text-[#171a1f]">{selectedFormation.titre}</p>
              <div className="mt-2">
                <Badge className={`rounded-lg border px-3 py-1 text-[14px] font-medium ${statusBadge[selectedFormation.statut]}`}>
                  {selectedFormation.statut === "en_cours" ? tr("En cours", "Ongoing") : tr("Planifie", "Planned")}
                </Badge>
              </div>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedFormation(null)}>
              {tr("Fermer", "Close")}
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">Titre</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormation.titre}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">{tr("Date de debut", "Start date")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormation.dateDebut}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">{tr("Date de fin", "End date")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormation.dateFin}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">{tr("Duree", "Duration")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormation.duree}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">{tr("Formateur", "Trainer")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormation.formateur}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">Participants</p>
              <p className="text-[15px] font-medium text-[#1d2025]">
                {selectedFormation.participants} / {selectedFormation.capacite}
              </p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">{tr("Places restantes", "Remaining seats")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">
                {Math.max(selectedFormation.capacite - selectedFormation.participants, 0)}
              </p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">{tr("Disponibilite", "Availability")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">
                {selectedFormation.capacite - selectedFormation.participants <= 0 ? tr("Complet", "Full") : tr("Disponible", "Available")}
              </p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">Statut</p>
              <p className="text-[15px] font-medium text-[#1d2025]">
                {selectedFormation.statut === "en_cours" ? tr("En cours", "Ongoing") : tr("Planifie", "Planned")}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {formations.map((formation) => {
          const disponible = formation.capacite - formation.participants;
          const complet = disponible <= 0;

          return (
            <Card key={formation.id} className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-3">
                    <h3 className="text-[36px] font-medium leading-tight text-[#191c20]">{formation.titre}</h3>
                    <Badge className={`rounded-lg border px-3 py-1 text-[14px] font-medium ${statusBadge[formation.statut]}`}>
                      {formation.statut === "en_cours" ? tr("En cours", "Ongoing") : tr("Planifie", "Planned")}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-5 text-[15px] text-[#5f6777]">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formation.dateDebut} - {formation.dateFin}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      {formation.duree}
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
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3edff]">
                    <Users className="h-4 w-4 text-[#9029ff]" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#5f6777]">{tr("Formateur", "Trainer")}</p>
                    <p className="text-[24px] font-medium text-[#191c20]">{formation.formateur}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0ff]">
                    <Users className="h-4 w-4 text-[#0f63f2]" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#5f6777]">{tr("Participants", "Participants")}</p>
                    <p className="text-[24px] font-medium text-[#191c20]">
                      {formation.participants} / {formation.capacite}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${complet ? "bg-[#fff2e4]" : "bg-[#e8f1fb]"}`}>
                    {complet ? (
                      <AlertCircle className="h-4 w-4 text-[#fc6200]" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-[#005ca9]" />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] text-[#5f6777]">{tr("Disponibilite", "Availability")}</p>
                    <p className={`text-[24px] font-medium ${complet ? "text-[#fc6200]" : "text-[#005ca9]"}`}>
                      {complet ? tr("Complet", "Full") : tr(`${disponible} places restantes`, `${disponible} remaining seats`)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
