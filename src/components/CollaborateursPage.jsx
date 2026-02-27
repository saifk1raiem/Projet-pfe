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
  AlertTriangle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

export function CollaborateursPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const collaborateurs = [
    {
      id: 1,
      matricule: "MAT001",
      nom: "Ahmed Ben Ali",
      prenom: "Ahmed",
      departement: "Production",
      poste: "Opérateur",
      dateEntree: "2024-01-15",
      statut: "Qualifié",
      formations: 5,
      derniereFormation: "2026-01-10",
      competences: ["Soudure", "Assemblage", "Lecture de plans"]
    },
    {
      id: 2,
      matricule: "MAT002",
      nom: "Fatima Zahra",
      prenom: "Fatima",
      departement: "Qualité",
      poste: "Contrôleur Qualité",
      dateEntree: "2023-06-20",
      statut: "Qualifié",
      formations: 8,
      derniereFormation: "2026-02-05",
      competences: ["Contrôle qualité", "Métrologie", "Audit ISO", "Analyse statistique"]
    },
    {
      id: 3,
      matricule: "MAT003",
      nom: "Mohamed Salhi",
      prenom: "Mohamed",
      departement: "Maintenance",
      poste: "Technicien",
      dateEntree: "2025-03-10",
      statut: "En cours",
      formations: 3,
      derniereFormation: "2025-12-15",
      competences: ["Maintenance préventive", "Électricité industrielle", "Pneumatique"]
    },
    {
      id: 4,
      matricule: "MAT004",
      nom: "Nadia Mansouri",
      prenom: "Nadia",
      departement: "Production",
      poste: "Chef d'équipe",
      dateEntree: "2022-09-01",
      statut: "Qualifié",
      formations: 12,
      derniereFormation: "2026-01-28",
      competences: ["Management", "Lean Manufacturing", "Gestion production", "Formation équipe"]
    },
    {
      id: 5,
      matricule: "MAT005",
      nom: "Youssef El Amrani",
      prenom: "Youssef",
      departement: "Logistique",
      poste: "Magasinier",
      dateEntree: "2024-11-05",
      statut: "Non associé",
      formations: 2,
      derniereFormation: "2025-05-20",
      competences: ["Gestion stocks", "CACES"]
    },
    {
      id: 6,
      matricule: "MAT006",
      nom: "Samira Bennani",
      prenom: "Samira",
      departement: "Support",
      poste: "Assistante RH",
      dateEntree: "2023-02-14",
      statut: "Qualifié",
      formations: 6,
      derniereFormation: "2026-01-18",
      competences: ["Recrutement", "Paie", "Formation continue", "Droit du travail"]
    },
    {
      id: 7,
      matricule: "MAT007",
      nom: "Karim Belkacem",
      prenom: "Karim",
      departement: "Production",
      poste: "Opérateur",
      dateEntree: "2024-08-12",
      statut: "Dépassement",
      formations: 4,
      derniereFormation: "2025-08-20",
      competences: ["Usinage", "Contrôle dimensionnel"]
    }
  ];

  const getStatusBadge = (statut) => {
    switch (statut) {
      case "Qualifié":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" />
            Qualifié
          </Badge>
        );
      case "En cours":
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 flex items-center gap-1 w-fit">
            <AlertCircle className="w-3 h-3" />
            En cours
          </Badge>
        );
      case "Non associé":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" />
            Non associé
          </Badge>
        );
      case "Dépassement":
        return (
          <Badge className="bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3 h-3" />
            Dépassement
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredCollaborateurs = collaborateurs.filter((collab) =>
    collab.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collab.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collab.departement.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8faf9' }}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Gestion des Collaborateurs</h1>
            <p className="text-muted-foreground mt-1">
              Liste et suivi des collaborateurs
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Users className="w-4 h-4 mr-2" />
            Nouveau Collaborateur
          </Button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-foreground">1,248</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Qualifiés</p>
                <p className="text-xl font-bold text-foreground">1,092</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-xl font-bold text-foreground">94</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Non associée</p>
                <p className="text-xl font-bold text-foreground">32</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dépassement</p>
                <p className="text-xl font-bold text-foreground">30</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <Card className="p-4 bg-white border-border/40">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, matricule ou département..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>
        </Card>

        {/* Tableau des collaborateurs */}
        <Card className="bg-white border-border/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matricule</TableHead>
                <TableHead>Nom & Prénom</TableHead>
                <TableHead>Département</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Date d'entrée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Formations</TableHead>
                <TableHead>Dernière formation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCollaborateurs.map((collab) => (
                <TableRow key={collab.id}>
                  <TableCell className="font-medium">{collab.matricule}</TableCell>
                  <TableCell>
                    <div className="font-medium">{collab.nom}</div>
                    <div className="text-sm text-muted-foreground">{collab.prenom}</div>
                  </TableCell>
                  <TableCell>{collab.departement}</TableCell>
                  <TableCell>{collab.poste}</TableCell>
                  <TableCell>{new Date(collab.dateEntree).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>{getStatusBadge(collab.statut)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{collab.formations} formations</Badge>
                  </TableCell>
                  <TableCell>{new Date(collab.derniereFormation).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}