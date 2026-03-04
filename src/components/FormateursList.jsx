import { createElement, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { GraduationCap, Star, BookOpen } from "lucide-react";
import { useAppPreferences } from "../context/AppPreferencesContext";

const formateurs = [
  {
    id: 1,
    nom: "Ahmed Ben Ali",
    initials: "ABA",
    specialites: ["Securite", "Qualite"],
    formations: 24,
    disponible: true,
    evaluation: 4.8,
    prochaineSession: "20/02/2026",
  },
  {
    id: 2,
    nom: "Fatima Zahra",
    initials: "FZ",
    specialites: ["Qualite", "ISO 9001"],
    formations: 18,
    disponible: true,
    evaluation: 4.9,
    prochaineSession: "25/02/2026",
  },
  {
    id: 3,
    nom: "Mohamed Salhi",
    initials: "MS",
    specialites: ["Maintenance", "Technique"],
    formations: 32,
    disponible: false,
    evaluation: 4.7,
    prochaineSession: "05/03/2026",
  },
  {
    id: 4,
    nom: "Nadia Mansouri",
    initials: "NM",
    specialites: ["Management", "Leadership"],
    formations: 15,
    disponible: true,
    evaluation: 4.9,
    prochaineSession: "",
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
        <p className="leoni-metric text-[36px] font-semibold leading-tight text-[#191c20]">{value}</p>
      </div>
    </div>
  </Card>
);

export function FormateursList({ currentUser }) {
  const { tr } = useAppPreferences();
  const [selectedFormateur, setSelectedFormateur] = useState(null);
  const isObserver = currentUser?.role === "observer";

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">{tr("Gestion des Formateurs", "Trainer Management")}</h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">{tr("Liste et disponibilite des formateurs", "Trainer list and availability")}</p>
        </div>
        <Button
          className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]"
          disabled={isObserver}
        >
          <GraduationCap className="mr-2 h-4 w-4" />
          {tr("Nouveau Formateur", "New Trainer")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat icon={GraduationCap} title="Total Formateurs" value="24" color={{ bg: "bg-[#f3edff]", text: "text-[#9029ff]" }} />
        <Stat icon={GraduationCap} title="Disponibles" value="20" color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
        <Stat icon={BookOpen} title="En formation" value="4" color={{ bg: "bg-[#fff2e4]", text: "text-[#fc6200]" }} />
        <Stat icon={Star} title="Note moyenne" value="4.8" color={{ bg: "bg-[#e8f0ff]", text: "text-[#0f63f2]" }} />
      </div>

      {selectedFormateur && (
        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[14px] text-[#5f6777]">{tr("Formateur selectionne", "Selected trainer")}</p>
              <p className="text-[20px] font-semibold text-[#171a1f]">{selectedFormateur.nom}</p>
              <div className="mt-2 flex items-center gap-2">
                <Star className="h-4 w-4 fill-[#e6a800] text-[#e6a800]" />
                <span className="text-[15px] font-medium text-[#191c20]">{selectedFormateur.evaluation}</span>
                <Badge className={selectedFormateur.disponible
                  ? "rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[14px] text-[#005ca9]"
                  : "rounded-lg border border-[#f1c59e] bg-[#fff2e4] px-3 py-1 text-[14px] text-[#fc6200]"}
                >
                  {selectedFormateur.disponible ? tr("Disponible", "Available") : tr("Occupe", "Busy")}
                </Badge>
              </div>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => setSelectedFormateur(null)}>
              {tr("Fermer", "Close")}
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">Nom</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.nom}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">Initiales</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.initials}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">Evaluation</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.evaluation}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">{tr("Disponibilite", "Availability")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">
                {selectedFormateur.disponible ? tr("Disponible", "Available") : tr("Occupe", "Busy")}
              </p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">{tr("Formations donnees", "Delivered trainings")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.formations}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="text-[12px] text-[#64748b]">{tr("Prochaine session", "Next session")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.prochaineSession || "-"}</p>
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-[12px] text-[#64748b]">{tr("Specialites", "Specialties")}</p>
            <div className="flex flex-wrap gap-2">
              {selectedFormateur.specialites.map((specialite) => (
                <Badge key={specialite} variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[13px]">
                  {specialite}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {formateurs.map((formateur) => (
          <Card key={formateur.id} className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#a545f8] to-[#7f2bf2] text-[18px] font-medium text-white">
                  {formateur.initials}
                </div>
                <div>
                  <h3 className="leoni-display-lg text-[40px] font-medium text-[#191c20]">{formateur.nom}</h3>
                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-[#e6a800] text-[#e6a800]" />
                    <span className="leoni-metric text-[28px] font-medium text-[#191c20]">{formateur.evaluation}</span>
                  </div>
                </div>
              </div>

              {formateur.disponible ? (
                  <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[14px] text-[#005ca9]">{tr("Disponible", "Available")}</Badge>
              ) : (
                  <Badge className="rounded-lg border border-[#f1c59e] bg-[#fff2e4] px-3 py-1 text-[14px] text-[#fc6200]">{tr("Occupe", "Busy")}</Badge>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[13px] text-[#5f6777]">{tr("Specialites", "Specialties")}</p>
                <div className="flex flex-wrap gap-2">
                  {formateur.specialites.map((specialite) => (
                    <Badge key={specialite} variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[13px]">
                      {specialite}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[13px] text-[#5f6777]">{tr("Formations donnees", "Delivered trainings")}</p>
                  <p className="leoni-metric text-[32px] font-medium text-[#191c20]">{formateur.formations}</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#5f6777]">{tr("Prochaine session", "Next session")}</p>
                  <p className="leoni-metric text-[32px] font-medium text-[#191c20]">{formateur.prochaineSession || "-"}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="h-9 flex-1 rounded-xl border-[#ccd4d8] text-[16px]"
                onClick={() => setSelectedFormateur(formateur)}
              >
                {tr("Voir details", "View details")}
              </Button>
              <Button
                className="h-9 flex-1 rounded-xl bg-[#005ca9] text-[16px] font-medium text-white hover:bg-[#004a87]"
                disabled={isObserver}
              >
                {tr("Planifier", "Schedule")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
