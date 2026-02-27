import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BookOpen, Calendar, Users, Clock3, CheckCircle2, AlertCircle } from "lucide-react";

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

const Stat = ({ icon: Icon, title, value, color }) => (
  <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color.bg}`}>
        <Icon className={`h-5 w-5 ${color.text}`} />
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
  planifie: "bg-[#dcf5e8] text-[#0c8d3e] border-[#b4e2ca]",
};

export function FormationPage() {
  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-tight text-[#171a1f]">Gestion des Formations</h1>
          <p className="mt-1 text-[18px] text-[#5d6574]">Planification et suivi des sessions de formation</p>
        </div>
        <Button className="h-10 rounded-[10px] bg-[#2ac15d] px-5 text-[16px] font-medium text-white hover:bg-[#22ad53]">
          <BookOpen className="mr-2 h-4 w-4" />
          Nouvelle Formation
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat icon={BookOpen} title="En cours" value="1" color={{ bg: "bg-[#e6f0ff]", text: "text-[#0f63f2]" }} />
        <Stat icon={Calendar} title="Planifiees" value="2" color={{ bg: "bg-[#e8f7ee]", text: "text-[#06b64e]" }} />
        <Stat icon={Users} title="Participants" value="65" color={{ bg: "bg-[#f3edff]", text: "text-[#9029ff]" }} />
        <Stat icon={CheckCircle2} title="Terminees" value="1" color={{ bg: "bg-[#eff2f5]", text: "text-[#5f6777]" }} />
      </div>

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
                      {formation.statut === "en_cours" ? "En cours" : "Planifie"}
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
                <Button variant="outline" className="h-10 rounded-xl border-[#ccd4d8] px-5 text-[16px]">Details</Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3edff]">
                    <Users className="h-4 w-4 text-[#9029ff]" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#5f6777]">Formateur</p>
                    <p className="text-[24px] font-medium text-[#191c20]">{formation.formateur}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0ff]">
                    <Users className="h-4 w-4 text-[#0f63f2]" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#5f6777]">Participants</p>
                    <p className="text-[24px] font-medium text-[#191c20]">
                      {formation.participants} / {formation.capacite}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${complet ? "bg-[#fff2e4]" : "bg-[#e8f7ee]"}`}>
                    {complet ? (
                      <AlertCircle className="h-4 w-4 text-[#fc6200]" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-[#06b64e]" />
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] text-[#5f6777]">Disponibilite</p>
                    <p className={`text-[24px] font-medium ${complet ? "text-[#fc6200]" : "text-[#0e9f46]"}`}>
                      {complet ? "Complet" : `${disponible} places restantes`}
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
