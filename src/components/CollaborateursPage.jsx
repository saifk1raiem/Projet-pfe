import { createElement, useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MoreVertical,
  AlertTriangle,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
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

const collaborateurs = [
  {
    id: 1,
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

const statutOptions = ["Non associe", "En cours", "Qualifie", "Depassement"];

export function CollaborateursPage() {
  const { tr } = useAppPreferences();
  const [searchTerm, setSearchTerm] = useState("");
  const [collaborateursData, setCollaborateursData] = useState(collaborateurs);
  const [selectedCollaborateur, setSelectedCollaborateur] = useState(null);
  const [collaborateurToDelete, setCollaborateurToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [collaborateurToUpdateStatus, setCollaborateurToUpdateStatus] = useState(null);
  const [statusDraft, setStatusDraft] = useState(statutOptions[0]);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const filteredCollaborateurs = collaborateursData.filter(
    (collab) =>
      collab.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collab.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collab.departement.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleViewCollaborateur = (collab) => {
    setSelectedCollaborateur(collab);
  };

  const handleOpenStatusDialog = (collab) => {
    setCollaborateurToUpdateStatus(collab);
    setStatusDraft(collab.statut);
    setIsStatusDialogOpen(true);
  };

  const handleUpdateStatus = () => {
    if (!collaborateurToUpdateStatus) return;

    setCollaborateursData((prev) =>
      prev.map((collab) => {
        if (collab.id !== collaborateurToUpdateStatus.id) {
          return collab;
        }
        return { ...collab, statut: statusDraft };
      }),
    );

    setSelectedCollaborateur((prev) => {
      if (!prev || prev.id !== collaborateurToUpdateStatus.id) {
        return prev;
      }
      return { ...prev, statut: statusDraft };
    });

    setIsStatusDialogOpen(false);
    setCollaborateurToUpdateStatus(null);
  };

  const handleAskDeleteCollaborateur = (collab) => {
    setCollaborateurToDelete(collab);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteCollaborateur = () => {
    if (!collaborateurToDelete) return;

    setCollaborateursData((prev) => prev.filter((collab) => collab.id !== collaborateurToDelete.id));
    setSelectedCollaborateur((prev) =>
      prev?.id === collaborateurToDelete.id ? null : prev,
    );
    setIsDeleteDialogOpen(false);
    setCollaborateurToDelete(null);
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-tight text-[#171a1f]">{tr("Gestion des Collaborateurs", "Collaborator Management")}</h1>
          <p className="mt-1 text-[18px] text-[#5d6574]">{tr("Liste et suivi des collaborateurs", "Collaborator list and tracking")}</p>
        </div>
        <Button className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]">
          <Users className="mr-2 h-4 w-4" />
          {tr("Nouveau Collaborateur", "New Collaborator")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Stat icon={Users} title="Total" value="1,248" color={{ bg: "bg-[#e8f0ff]", text: "text-[#0f63f2]" }} />
        <Stat icon={CheckCircle2} title="Qualifies" value="1,092" color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
        <Stat icon={AlertCircle} title="En cours" value="94" color={{ bg: "bg-[#fff2e4]", text: "text-[#fc6200]" }} />
        <Stat icon={XCircle} title="Non associee" value="32" color={{ bg: "bg-[#fdeeee]", text: "text-[#ea3737]" }} />
        <Stat icon={AlertTriangle} title="Depassement" value="30" color={{ bg: "bg-[#f3edff]", text: "text-[#7b35e8]" }} />
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
              <p className="text-[12px] text-[#64748b]">Statut</p>
              <div className="mt-1">{getStatusBadge(selectedCollaborateur.statut)}</div>
            </div>
          </div>
        </Card>
      )}
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
            {filteredCollaborateurs.map((collab) => (
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
                      <DropdownMenuItem onClick={() => handleViewCollaborateur(collab)}>
                        <Eye className="h-4 w-4" />
                        {tr("Voir details", "View details")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenStatusDialog(collab)}>
                        <Pencil className="h-4 w-4" />
                        {tr("Changer statut", "Change status")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleAskDeleteCollaborateur(collab)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {tr("Supprimer", "Delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

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
            <label htmlFor="status-select" className="text-sm font-medium text-[#252930]">
              {tr("Statut", "Status")}
            </label>
            <select
              id="status-select"
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
    </div>
  );
}

