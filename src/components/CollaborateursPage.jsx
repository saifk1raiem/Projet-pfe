import { useState } from "react";
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
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

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

const getStatusBadge = (statut) => {
  switch (statut) {
    case "Qualifie":
      return (
        <Badge className="w-fit rounded-lg border border-[#b4e2ca] bg-[#dcf5e8] px-3 py-1 text-[14px] font-medium text-[#0c8d3e]">
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

export function CollaborateursPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCollaborateurs = collaborateurs.filter(
    (collab) =>
      collab.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collab.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collab.departement.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-tight text-[#171a1f]">Gestion des Collaborateurs</h1>
          <p className="mt-1 text-[18px] text-[#5d6574]">Liste et suivi des collaborateurs</p>
        </div>
        <Button className="h-10 rounded-[10px] bg-[#2ac15d] px-5 text-[16px] font-medium text-white hover:bg-[#22ad53]">
          <Users className="mr-2 h-4 w-4" />
          Nouveau Collaborateur
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Stat icon={Users} title="Total" value="1,248" color={{ bg: "bg-[#e8f0ff]", text: "text-[#0f63f2]" }} />
        <Stat icon={CheckCircle2} title="Qualifies" value="1,092" color={{ bg: "bg-[#e8f7ee]", text: "text-[#06b64e]" }} />
        <Stat icon={AlertCircle} title="En cours" value="94" color={{ bg: "bg-[#fff2e4]", text: "text-[#fc6200]" }} />
        <Stat icon={XCircle} title="Non associee" value="32" color={{ bg: "bg-[#fdeeee]", text: "text-[#ea3737]" }} />
        <Stat icon={AlertTriangle} title="Depassement" value="30" color={{ bg: "bg-[#f3edff]", text: "text-[#7b35e8]" }} />
      </div>

      <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8290]" />
            <Input
              placeholder="Rechercher par nom, matricule ou departement..."
              className="h-12 rounded-xl border-[#d7dde1] pl-11 text-[15px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-10 rounded-xl border-[#ccd4d8] px-5 text-[16px]">
            <Filter className="mr-2 h-4 w-4" />
            Filtres
          </Button>
        </div>
      </Card>

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
                  <Button variant="ghost" className="h-8 w-8 rounded-lg p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
