import { createElement, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Upload,
  Paperclip,
  X,
  Search,
  Filter,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useAppPreferences } from "../context/AppPreferencesContext";

const TOTAL_COLLABORATEURS = 1248;
const YESTERDAY_TOTAL_COLLABORATEURS = 1209;
const QUALIFICATION_COUNT = 1092;
const INDECTION_COUNT = TOTAL_COLLABORATEURS - QUALIFICATION_COUNT;
const YESTERDAY_QUALIFICATION_COUNT = 1065;
const YESTERDAY_INDECTION_COUNT = YESTERDAY_TOTAL_COLLABORATEURS - YESTERDAY_QUALIFICATION_COUNT;
const TOTAL_DELTA_PERCENT = ((TOTAL_COLLABORATEURS - YESTERDAY_TOTAL_COLLABORATEURS) / YESTERDAY_TOTAL_COLLABORATEURS) * 100;
const INDECTION_DELTA_PERCENT = ((INDECTION_COUNT - YESTERDAY_INDECTION_COUNT) / YESTERDAY_INDECTION_COUNT) * 100;
const QUALIFICATION_DELTA_PERCENT = ((QUALIFICATION_COUNT - YESTERDAY_QUALIFICATION_COUNT) / YESTERDAY_QUALIFICATION_COUNT) * 100;

const collaborateursQualification = [
  {
    id: 1,
    phase: "qualification",
    matricule: "MAT001",
    nom: "Ahmed Ben Ali",
    prenom: "Ahmed",
    departement: "Production",
    poste: "Operateur",
    dateEntree: "15/01/2024",
    statut: "Qualifie",
    formations: 5,
    derniereFormation: "10/01/2026",
  },
  {
    id: 2,
    phase: "qualification",
    matricule: "MAT002",
    nom: "Fatima Zahra",
    prenom: "Fatima",
    departement: "Qualite",
    poste: "Controleur Qualite",
    dateEntree: "20/06/2023",
    statut: "Qualifie",
    formations: 8,
    derniereFormation: "05/02/2026",
  },
  {
    id: 3,
    phase: "indection",
    matricule: "MAT003",
    nom: "Mohamed Salhi",
    prenom: "Mohamed",
    departement: "Maintenance",
    poste: "Technicien",
    dateEntree: "10/03/2025",
    statut: "En cours",
    formations: 3,
    derniereFormation: "15/12/2025",
  },
  {
    id: 4,
    phase: "qualification",
    matricule: "MAT004",
    nom: "Nadia Mansouri",
    prenom: "Nadia",
    departement: "Production",
    poste: "Chef d'equipe",
    dateEntree: "01/09/2022",
    statut: "Qualifie",
    formations: 12,
    derniereFormation: "28/01/2026",
  },
  {
    id: 5,
    phase: "indection",
    matricule: "MAT005",
    nom: "Youssef El Amrani",
    prenom: "Youssef",
    departement: "Logistique",
    poste: "Magasinier",
    dateEntree: "05/11/2024",
    statut: "Non associe",
    formations: 2,
    derniereFormation: "20/05/2025",
  },
  {
    id: 6,
    phase: "qualification",
    matricule: "MAT006",
    nom: "Samira Bennani",
    prenom: "Samira",
    departement: "Support",
    poste: "Assistante RH",
    dateEntree: "14/02/2023",
    statut: "Qualifie",
    formations: 6,
    derniereFormation: "18/01/2026",
  },
  {
    id: 7,
    phase: "indection",
    matricule: "MAT007",
    nom: "Karim Belkacem",
    prenom: "Karim",
    departement: "Production",
    poste: "Operateur",
    dateEntree: "12/08/2024",
    statut: "Depassement",
    formations: 4,
    derniereFormation: "20/08/2025",
  },
];

const collaborateursFormationHistory = {
  1: [
    { id: "f-101", titre: "Securite machine", type: "Technique", date: "10/01/2026", duree: "6h", resultat: "Valide" },
    { id: "f-102", titre: "Qualite cablage", type: "Qualite", date: "22/11/2025", duree: "4h", resultat: "Valide" },
    { id: "f-103", titre: "5S atelier", type: "Lean", date: "09/08/2025", duree: "3h", resultat: "Valide" },
  ],
  2: [
    { id: "f-201", titre: "Audit produit", type: "Qualite", date: "05/02/2026", duree: "5h", resultat: "Valide" },
    { id: "f-202", titre: "Metrologie avancee", type: "Technique", date: "16/12/2025", duree: "7h", resultat: "Valide" },
    { id: "f-203", titre: "SPC niveau 2", type: "Qualite", date: "24/09/2025", duree: "4h", resultat: "Valide" },
  ],
  3: [
    { id: "f-301", titre: "Diagnostic maintenance", type: "Technique", date: "15/12/2025", duree: "6h", resultat: "En cours" },
    { id: "f-302", titre: "Consignation LOTOTO", type: "Securite", date: "03/07/2025", duree: "4h", resultat: "Valide" },
  ],
  4: [
    { id: "f-401", titre: "Leadership terrain", type: "Soft skills", date: "28/01/2026", duree: "8h", resultat: "Valide" },
    { id: "f-402", titre: "Pilotage KPI", type: "Management", date: "19/10/2025", duree: "5h", resultat: "Valide" },
    { id: "f-403", titre: "Resolution probleme", type: "Lean", date: "06/06/2025", duree: "4h", resultat: "Valide" },
  ],
  5: [
    { id: "f-501", titre: "Flux logistique", type: "Logistique", date: "20/05/2025", duree: "4h", resultat: "En cours" },
    { id: "f-502", titre: "Inventaire digital", type: "Logistique", date: "02/03/2025", duree: "3h", resultat: "Valide" },
  ],
  6: [
    { id: "f-601", titre: "SIRH operationnel", type: "RH", date: "18/01/2026", duree: "5h", resultat: "Valide" },
    { id: "f-602", titre: "Onboarding process", type: "RH", date: "30/11/2025", duree: "4h", resultat: "Valide" },
    { id: "f-603", titre: "Communication interne", type: "Soft skills", date: "11/08/2025", duree: "3h", resultat: "Valide" },
  ],
  7: [
    { id: "f-701", titre: "Requalification poste", type: "Qualification", date: "20/08/2025", duree: "6h", resultat: "Expire" },
    { id: "f-702", titre: "Ergonomie poste", type: "Securite", date: "28/04/2025", duree: "3h", resultat: "Valide" },
  ],
};

const getFormationHistory = (collabId) => collaborateursFormationHistory[collabId] ?? [];
const getFormationPageId = (formation) => {
  const title = formation?.titre?.toLowerCase() ?? "";
  if (title.includes("qualite") || title.includes("audit") || title.includes("spc") || title.includes("metrologie")) {
    return 2;
  }
  if (title.includes("maintenance") || title.includes("diagnostic") || title.includes("requalification")) {
    return 3;
  }
  return 1;
};

const statutOptions = ["Non associe", "En cours", "Qualifie", "Depassement"];

const Stat = ({ icon, title, value, color, delay }) => (
  <Card
    className="leoni-rise-up rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm"
    style={{ animationDelay: delay }}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[15px] text-[#5f6777]">{title}</p>
        <h3 className="mt-1 text-[42px] font-semibold leading-none text-[#191c20]">{value}</h3>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color.bg}`}>
        {createElement(icon, { className: `h-6 w-6 ${color.text}` })}
      </div>
    </div>
  </Card>
);

const ComparisonStat = ({ title, value, deltaPercent, delay, icon = Users, iconBg = "bg-[#e8f0ff]", iconColor = "text-[#0f63f2]" }) => (
  <Card
    className="leoni-rise-up rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm"
    style={{ animationDelay: delay }}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[15px] text-[#5f6777]">{title}</p>
        <div className="mt-1 flex items-baseline gap-3">
          <h3 className="text-[42px] font-semibold leading-none text-[#191c20]">{value}</h3>
          <div className={`flex items-center gap-1 text-[14px] ${deltaPercent >= 0 ? "text-[#005ca9]" : "text-[#ea3737]"}`}>
            {deltaPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(deltaPercent).toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
        {createElement(icon, { className: `h-6 w-6 ${iconColor}` })}
      </div>
    </div>
  </Card>
);

const getStatusBadge = (statut) => {
  switch (statut) {
    case "Qualifie":
      return (
        <Badge className="w-fit rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[14px] font-medium text-[#005ca9]">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Qualifie
        </Badge>
      );
    case "En cours":
      return (
        <Badge className="w-fit rounded-lg border border-[#f1c59e] bg-[#fff2e4] px-3 py-1 text-[14px] font-medium text-[#fc6200]">
          <AlertCircle className="mr-1 h-3.5 w-3.5" />
          En cours
        </Badge>
      );
    case "Non associe":
      return (
        <Badge className="w-fit rounded-lg border border-[#f2c4c4] bg-[#fdeeee] px-3 py-1 text-[14px] font-medium text-[#ea3737]">
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Non associe
        </Badge>
      );
    case "Depassement":
      return (
        <Badge className="w-fit rounded-lg border border-[#d9c2ff] bg-[#f3edff] px-3 py-1 text-[14px] font-medium text-[#7b35e8]">
          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          Depassement
        </Badge>
      );
    default:
      return null;
  }
};

function CollaborateursTable({ rows, onViewDetails, onViewFormations, onOpenStatusDialog, onAskDelete, labels }) {
  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[15px] font-semibold text-[#252930]">Matricule</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Nom & Prenom</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Departement</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Poste</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Date d'entree</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Statut</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Formations</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Derniere formation</TableHead>
            <TableHead className="text-right text-[15px] font-semibold text-[#252930]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((collab) => (
            <TableRow key={collab.id} className="h-16">
              <TableCell className="text-[15px] font-semibold text-[#1d2025]">{collab.matricule}</TableCell>
              <TableCell>
                <div className="text-[15px] font-medium text-[#1d2025]">{collab.nom}</div>
                <div className="text-[13px] text-[#6b7280]">{collab.prenom}</div>
              </TableCell>
              <TableCell className="text-[15px]">{collab.departement}</TableCell>
              <TableCell className="text-[15px]">{collab.poste}</TableCell>
              <TableCell className="text-[15px]">{collab.dateEntree}</TableCell>
              <TableCell>{getStatusBadge(collab.statut)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[14px]">
                  {collab.formations} formations
                </Badge>
              </TableCell>
              <TableCell className="text-[15px]">{collab.derniereFormation}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 rounded-lg p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onViewDetails(collab)}>
                      <Eye className="h-4 w-4" />
                      {labels.viewDetails}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewFormations(collab)}>
                      <BookOpen className="h-4 w-4" />
                      {labels.viewFormations}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onOpenStatusDialog(collab)}>
                      <Pencil className="h-4 w-4" />
                      {labels.changeStatus}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onAskDelete(collab)}>
                      <Trash2 className="h-4 w-4" />
                      {labels.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function QualificationPage({ onNavigateToPage }) {
  const { tr } = useAppPreferences();
  const [activeTab, setActiveTab] = useState("indection");
  const [searchTerm, setSearchTerm] = useState("");
  const [collaborateursData, setCollaborateursData] = useState(collaborateursQualification);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState(null);
  const [collaborateurToDelete, setCollaborateurToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [collaborateurToUpdateStatus, setCollaborateurToUpdateStatus] = useState(null);
  const [statusDraft, setStatusDraft] = useState(statutOptions[0]);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isFormationsDialogOpen, setIsFormationsDialogOpen] = useState(false);
  const [formationsCollaborateur, setFormationsCollaborateur] = useState(null);
  const inputRef = useRef(null);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    setSelectedFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const merged = [...prev];

      incoming.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      });

      return merged;
    });
  };

  const closeModal = () => {
    setIsUploadOpen(false);
    setIsDragging(false);
  };

  const handleSubmit = () => {
    if (!selectedFiles.length) return;
    closeModal();
    setSelectedFiles([]);
  };

  const handleViewCollaborateur = (collab) => {
    setSelectedCollaborateur(collab);
  };

  const handleOpenFormationsDialog = (collab) => {
    setFormationsCollaborateur(collab);
    setIsFormationsDialogOpen(true);
  };

  const closeFormationsDialog = () => {
    setIsFormationsDialogOpen(false);
    setFormationsCollaborateur(null);
  };

  const handleGoToFormationSection = (formation) => {
    closeFormationsDialog();
    onNavigateToPage?.("formation", { formationId: getFormationPageId(formation) });
  };

  const handleOpenStatusDialog = (collab) => {
    setCollaborateurToUpdateStatus(collab);
    setStatusDraft(collab.statut);
    setIsStatusDialogOpen(true);
  };

  const handleUpdateStatus = () => {
    if (!collaborateurToUpdateStatus) return;

    setCollaborateursData((prev) =>
      prev.map((collab) =>
        collab.id === collaborateurToUpdateStatus.id
          ? { ...collab, statut: statusDraft }
          : collab,
      ),
    );

    setSelectedCollaborateur((prev) =>
      prev?.id === collaborateurToUpdateStatus.id
        ? { ...prev, statut: statusDraft }
        : prev,
    );

    setIsStatusDialogOpen(false);
    setCollaborateurToUpdateStatus(null);
  };

  const handleAskDeleteCollaborateur = (collab) => {
    setCollaborateurToDelete(collab);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCollaborateur = () => {
    if (!collaborateurToDelete) return;

    setCollaborateursData((prev) =>
      prev.filter((collab) => collab.id !== collaborateurToDelete.id),
    );
    setSelectedCollaborateur((prev) =>
      prev?.id === collaborateurToDelete.id ? null : prev,
    );
    setIsDeleteDialogOpen(false);
    setCollaborateurToDelete(null);
  };

  const filteredCollaborateurs = collaborateursData.filter(
    (collab) =>
      collab.phase === activeTab &&
      (collab.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collab.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collab.departement.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="leoni-rise-up-soft">
          <h1 className="text-[40px] font-semibold leading-tight text-[#171a1f]">{tr("Gestion des Qualifications", "Qualification Management")}</h1>
          <p className="mt-1 text-[18px] text-[#5d6574]">{tr("Suivi et validation des qualifications des collaborateurs", "Tracking and validation of collaborator qualifications")}</p>
        </div>

        <Button
          onClick={() => setIsUploadOpen(true)}
          className="leoni-rise-up-soft h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]"
        >
          <FileText className="mr-2 h-4 w-4" />
          {tr("Donner le rapport du jour", "Submit today's report")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ComparisonStat
          title="Total Collaborateurs"
          value={TOTAL_COLLABORATEURS}
          deltaPercent={TOTAL_DELTA_PERCENT}
          icon={Users}
          iconBg="bg-[#e8f0ff]"
          iconColor="text-[#0f63f2]"
          delay="30ms"
        />
        <ComparisonStat
          title="Indection"
          value={INDECTION_COUNT}
          deltaPercent={INDECTION_DELTA_PERCENT}
          icon={AlertCircle}
          iconBg="bg-[#fff2e4]"
          iconColor="text-[#fc6200]"
          delay="60ms"
        />
        <ComparisonStat
          title="Qualification"
          value={QUALIFICATION_COUNT}
          deltaPercent={QUALIFICATION_DELTA_PERCENT}
          icon={CheckCircle2}
          iconBg="bg-[#e8f1fb]"
          iconColor="text-[#005ca9]"
          delay="120ms"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[30px] font-semibold leading-tight text-[#171a1f]">{tr("Repartition Collaborateurs", "Collaborator Distribution")}</h2>
          <TabsList className="h-11 rounded-xl bg-[#e8eef6] p-1">
            <TabsTrigger value="indection" className="rounded-lg px-5 text-[15px]">Indection</TabsTrigger>
            <TabsTrigger value="qualification" className="rounded-lg px-5 text-[15px]">Qualification</TabsTrigger>
          </TabsList>
        </div>

        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8290]" />
              <Input
                placeholder={tr("Rechercher par nom, matricule ou departement...", "Search by name, ID, or department...")}
                className="h-12 rounded-xl border-[#d7dde1] pl-11 text-[15px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-10 rounded-xl border-[#ccd4d8] px-5 text-[16px]">
              <Filter className="mr-2 h-4 w-4" />
              {tr("Filtres", "Filters")}
            </Button>
          </div>
        </Card>

        {selectedCollaborateur && (
          <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[14px] text-[#5f6777]">{tr("Collaborateur selectionne", "Selected collaborator")}</p>
                <p className="text-[18px] font-semibold text-[#171a1f]">
                  {selectedCollaborateur.nom} ({selectedCollaborateur.matricule})
                </p>
                <div className="mt-2">{getStatusBadge(selectedCollaborateur.statut)}</div>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => setSelectedCollaborateur(null)}>
                {tr("Fermer", "Close")}
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-[12px] text-[#64748b]">Matricule</p>
                <p className="text-[15px] font-medium text-[#1d2025]">{selectedCollaborateur.matricule}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-[12px] text-[#64748b]">Nom</p>
                <p className="text-[15px] font-medium text-[#1d2025]">{selectedCollaborateur.nom}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-[12px] text-[#64748b]">Prenom</p>
                <p className="text-[15px] font-medium text-[#1d2025]">{selectedCollaborateur.prenom}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-[12px] text-[#64748b]">Departement</p>
                <p className="text-[15px] font-medium text-[#1d2025]">{selectedCollaborateur.departement}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-[12px] text-[#64748b]">Poste</p>
                <p className="text-[15px] font-medium text-[#1d2025]">{selectedCollaborateur.poste}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-[12px] text-[#64748b]">Date d'entree</p>
                <p className="text-[15px] font-medium text-[#1d2025]">{selectedCollaborateur.dateEntree}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-[12px] text-[#64748b]">Formations</p>
                <p className="text-[15px] font-medium text-[#1d2025]">{selectedCollaborateur.formations}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-[12px] text-[#64748b]">Derniere formation</p>
                <p className="text-[15px] font-medium text-[#1d2025]">{selectedCollaborateur.derniereFormation}</p>
              </div>
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-[12px] text-[#64748b]">Phase</p>
                <p className="text-[15px] font-medium text-[#1d2025]">
                  {selectedCollaborateur.phase === "indection" ? "Indection" : "Qualification"}
                </p>
              </div>
            </div>
          </Card>
        )}

        <TabsContent value="indection" className="m-0">
          <CollaborateursTable
            rows={filteredCollaborateurs}
            onViewDetails={handleViewCollaborateur}
            onViewFormations={handleOpenFormationsDialog}
            onOpenStatusDialog={handleOpenStatusDialog}
            onAskDelete={handleAskDeleteCollaborateur}
            labels={{
              viewDetails: tr("Voir details", "View details"),
              viewFormations: tr("Voir formations", "View trainings"),
              changeStatus: tr("Changer statut", "Change status"),
              delete: tr("Supprimer", "Delete"),
            }}
          />
        </TabsContent>

        <TabsContent value="qualification" className="m-0">
          <CollaborateursTable
            rows={filteredCollaborateurs}
            onViewDetails={handleViewCollaborateur}
            onViewFormations={handleOpenFormationsDialog}
            onOpenStatusDialog={handleOpenStatusDialog}
            onAskDelete={handleAskDeleteCollaborateur}
            labels={{
              viewDetails: tr("Voir details", "View details"),
              viewFormations: tr("Voir formations", "View trainings"),
              changeStatus: tr("Changer statut", "Change status"),
              delete: tr("Supprimer", "Delete"),
            }}
          />
        </TabsContent>
      </Tabs>

      {isFormationsDialogOpen && formationsCollaborateur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeFormationsDialog}>
          <div
            className="leoni-rise-up flex h-[88vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-[24px] border border-[#dfe5e2] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#e2e8f0] px-7 py-5">
              <div>
                <h2 className="text-[30px] font-semibold leading-tight text-[#171a1f]">
                  {tr("Formations du collaborateur", "Collaborator training history")}
                </h2>
                <p className="mt-1 text-[15px] text-[#64748b]">
                  {formationsCollaborateur.nom} ({formationsCollaborateur.matricule}) • {formationsCollaborateur.formations} formations
                </p>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={closeFormationsDialog}>
                {tr("Fermer", "Close")}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {getFormationHistory(formationsCollaborateur.id).map((formation) => (
                  <Card key={formation.id} className="rounded-2xl border border-[#dfe5e2] bg-[#fbfdff] p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[20px] font-semibold text-[#191c20]">{formation.titre}</h3>
                        <p className="mt-1 text-[14px] text-[#64748b]">{formation.type}</p>
                      </div>
                      <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[13px] font-medium text-[#005ca9]">
                        {formation.resultat}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <p className="text-[12px] text-[#64748b]">{tr("Date", "Date")}</p>
                        <p className="text-[14px] font-medium text-[#1d2025]">{formation.date}</p>
                      </div>
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <p className="text-[12px] text-[#64748b]">{tr("Duree", "Duration")}</p>
                        <p className="text-[14px] font-medium text-[#1d2025]">{formation.duree}</p>
                      </div>
                    </div>
                    <Button className="mt-4 h-10 rounded-xl bg-[#005ca9] text-white hover:bg-[#004a87]" onClick={() => handleGoToFormationSection(formation)}>
                      {tr("Voir details formation", "Open training details")}
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={isStatusDialogOpen}
        onOpenChange={(open) => {
          setIsStatusDialogOpen(open);
          if (!open) {
            setCollaborateurToUpdateStatus(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Changer le statut", "Change status")}</AlertDialogTitle>
            <AlertDialogDescription>
              {collaborateurToUpdateStatus
                ? `Selectionnez le nouveau statut pour ${collaborateurToUpdateStatus.nom}.`
                : tr("Selectionnez un statut.", "Select a status.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label htmlFor="status-select-qualification" className="text-sm font-medium text-[#252930]">
              {tr("Statut", "Status")}
            </label>
            <select
              id="status-select-qualification"
              className="h-10 w-full rounded-md border border-[#d5dce0] bg-white px-3 text-sm outline-none focus:border-[#0f63f2]"
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value)}
            >
              {statutOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Annuler", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateStatus}>{tr("Enregistrer", "Save")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setCollaborateurToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Supprimer ce collaborateur ?", "Delete this collaborator?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {collaborateurToDelete
                ? `Cette action supprimera ${collaborateurToDelete.nom} de la liste.`
                : tr("Cette action est irreversible.", "This action is irreversible.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Annuler", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-[#ea3737] hover:bg-[#d12f2f]" onClick={handleDeleteCollaborateur}>
              {tr("Supprimer", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeModal}>
          <div
            className="leoni-rise-up w-full max-w-[760px] rounded-[28px] border border-[#2b3340] bg-[#11151b] p-0 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2b3340] px-8 py-6">
              <div>
                <h2 className="text-[44px] font-semibold leading-tight">Upload Report</h2>
                <p className="mt-2 text-[16px] text-[#9aabbe]">Drag and drop today's report, or choose files manually.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeModal}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#4a5568] text-[#d6deea] hover:bg-[#1b212b]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-8 py-6">
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                  isDragging ? "border-[#4f99d9] bg-[#182a3d]" : "border-[#3a4554] bg-[#171c24]"
                }`}
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e2631]">
                  <Upload className="h-7 w-7 text-[#7ec1f2]" />
                </div>
                <p className="text-[22px] font-medium text-white">Drag and drop your report here</p>
                <p className="mt-2 text-[15px] text-[#9aabbe]">PDF, DOCX, XLSX, CSV, PNG, JPG</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="rounded-2xl border border-[#2f3a48] bg-[#161b23] p-4">
                  <p className="mb-3 text-sm font-medium text-[#cfe1f4]">Selected files ({selectedFiles.length})</p>
                  <div className="space-y-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex items-center gap-2 text-sm text-[#d4e2f0]">
                        <Paperclip className="h-4 w-4 text-[#7ec1f2]" />
                        <span className="truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-[#3a4554] bg-transparent px-6 text-white hover:bg-[#1a2029]"
                  onClick={() => inputRef.current?.click()}
                >
                  Choose files
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-[#005ca9] px-6 text-white hover:bg-[#004a87] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleSubmit}
                  disabled={!selectedFiles.length}
                >
                  Submit files
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
