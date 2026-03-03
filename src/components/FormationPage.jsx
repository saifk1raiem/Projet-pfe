import { createElement, useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BookOpen, Calendar, Users, Clock3, CheckCircle2, AlertCircle } from "lucide-react";
import { useAppPreferences } from "../context/AppPreferencesContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

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
    competences: [
      "100-Plan de Formation de base",
      "120-Consignes securite poste",
      "140-Gestion des risques en atelier",
    ],
    membres: [
      { id: 1, matricule: "MAT001", nom: "Ahmed Ben Ali", departement: "Production", statut: "Present" },
      { id: 2, matricule: "MAT004", nom: "Nadia Mansouri", departement: "Production", statut: "Present" },
      { id: 3, matricule: "MAT007", nom: "Karim Belkacem", departement: "Production", statut: "Present" },
      { id: 4, matricule: "MAT009", nom: "Rania Idrissi", departement: "Production", statut: "Absent" },
      { id: 5, matricule: "MAT011", nom: "Sami Othmani", departement: "Maintenance", statut: "Present" },
    ],
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
    competences: [
      "100-Plan de Formation de base",
      "210-Norme ISO 9001",
      "230-Controle qualite produit fini",
    ],
    membres: [
      { id: 1, matricule: "MAT002", nom: "Fatima Zahra", departement: "Qualite", statut: "Planifie" },
      { id: 2, matricule: "MAT013", nom: "Yassine Trabelsi", departement: "Qualite", statut: "Planifie" },
      { id: 3, matricule: "MAT015", nom: "Imane Saidi", departement: "Qualite", statut: "Planifie" },
      { id: 4, matricule: "MAT017", nom: "Amine Boussetta", departement: "Production", statut: "Planifie" },
    ],
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
    competences: [
      "100-Plan de Formation de base",
      "310-Diagnostic machine",
      "320-Plan maintenance preventive",
    ],
    membres: [
      { id: 1, matricule: "MAT003", nom: "Mohamed Salhi", departement: "Maintenance", statut: "Planifie" },
      { id: 2, matricule: "MAT019", nom: "Salma Gharbi", departement: "Maintenance", statut: "Planifie" },
      { id: 3, matricule: "MAT021", nom: "Hatem Jebali", departement: "Maintenance", statut: "Planifie" },
      { id: 4, matricule: "MAT022", nom: "Ilyes Briki", departement: "Production", statut: "Planifie" },
    ],
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

const statusBadge = {
  en_cours: "bg-[#e6f0ff] text-[#0959ec] border-[#bfccf2]",
  planifie: "bg-[#e8f1fb] text-[#005ca9] border-[#b9d3ea]",
};

export function FormationPage({ openFormationId = null }) {
  const { tr } = useAppPreferences();
  const [selectedFormation, setSelectedFormation] = useState(null);

  useEffect(() => {
    if (openFormationId === null) {
      return;
    }
    const targetFormation = formations.find((formation) => formation.id === openFormationId);
    if (targetFormation) {
      setSelectedFormation(targetFormation);
    }
  }, [openFormationId]);
  const selectedDisponibilite = selectedFormation
    ? Math.max(selectedFormation.capacite - selectedFormation.participants, 0)
    : 0;
  const selectedComplet = selectedFormation ? selectedDisponibilite <= 0 : false;

  if (selectedFormation) {
    return (
      <div className="space-y-5 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="leoni-display-lg text-[36px] font-semibold leading-tight text-[#171a1f]">
              {tr("Details de la formation", "Training details")}
            </h1>
            <p className="mt-1 text-[18px] text-[#5d6574]">{selectedFormation.titre}</p>
          </div>
          <Button variant="outline" className="h-10 rounded-xl px-5" onClick={() => setSelectedFormation(null)}>
            {tr("Retour", "Back")}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Stat icon={Calendar} title={tr("Date de debut", "Start date")} value={selectedFormation.dateDebut} color={{ bg: "bg-[#e6f0ff]", text: "text-[#0f63f2]" }} />
          <Stat icon={Calendar} title={tr("Date de fin", "End date")} value={selectedFormation.dateFin} color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
          <Stat icon={Clock3} title={tr("Duree", "Duration")} value={selectedFormation.duree} color={{ bg: "bg-[#f3edff]", text: "text-[#9029ff]" }} />
          <Stat
            icon={Users}
            title={tr("Participants", "Participants")}
            value={`${selectedFormation.participants}/${selectedFormation.capacite}`}
            color={{ bg: "bg-[#eff2f5]", text: "text-[#5f6777]" }}
          />
        </div>

        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-[#5f6777]">{tr("Formateur", "Trainer")}</p>
              <p className="text-[28px] font-semibold text-[#191c20]">{selectedFormation.formateur}</p>
            </div>
            <Badge className={`rounded-lg border px-3 py-1 text-[14px] font-medium ${statusBadge[selectedFormation.statut]}`}>
              {selectedFormation.statut === "en_cours" ? tr("En cours", "Ongoing") : tr("Planifie", "Planned")}
            </Badge>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[14px] text-[#5f6777]">
            {selectedComplet ? <AlertCircle className="h-4 w-4 text-[#fc6200]" /> : <CheckCircle2 className="h-4 w-4 text-[#005ca9]" />}
            <span>
              {selectedComplet
                ? tr("Formation complete", "Training is full")
                : tr(`${selectedDisponibilite} places restantes`, `${selectedDisponibilite} remaining seats`)}
            </span>
          </div>
        </Card>

        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
          <h2 className="text-[22px] font-semibold text-[#171a1f]">{tr("Competences couvertes", "Covered competencies")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedFormation.competences.map((competence) => (
              <Badge key={competence} className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[14px] font-medium text-[#005ca9]">
                {competence}
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white shadow-sm">
          <div className="border-b border-[#e5eaef] px-5 py-4">
            <h2 className="text-[22px] font-semibold text-[#171a1f]">{tr("Liste des membres", "Members list")}</h2>
            <p className="mt-1 text-[14px] text-[#5f6777]">
              {tr("Collaborateurs inscrits dans cette formation", "Collaborators enrolled in this training")}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[15px] font-semibold text-[#252930]">Matricule</TableHead>
                <TableHead className="text-[15px] font-semibold text-[#252930]">{tr("Nom", "Name")}</TableHead>
                <TableHead className="text-[15px] font-semibold text-[#252930]">{tr("Departement", "Department")}</TableHead>
                <TableHead className="text-[15px] font-semibold text-[#252930]">{tr("Statut", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedFormation.membres.map((membre) => (
                <TableRow key={`${selectedFormation.id}-${membre.id}`} className="h-14">
                  <TableCell className="text-[15px] font-semibold text-[#1d2025]">{membre.matricule}</TableCell>
                  <TableCell className="text-[15px]">{membre.nom}</TableCell>
                  <TableCell className="text-[15px]">{membre.departement}</TableCell>
                  <TableCell>
                    <Badge
                      className={`rounded-lg border px-3 py-1 text-[13px] font-medium ${
                        membre.statut === "Present"
                          ? "border-[#b9d3ea] bg-[#e8f1fb] text-[#005ca9]"
                          : membre.statut === "Absent"
                            ? "border-[#f1c59e] bg-[#fff2e4] text-[#fc6200]"
                            : "border-[#d5dce0] bg-[#f7f8f9] text-[#5f6777]"
                      }`}
                    >
                      {membre.statut}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">{tr("Gestion des Formations", "Training Management")}</h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">{tr("Planification et suivi des sessions de formation", "Planning and tracking of training sessions")}</p>
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
