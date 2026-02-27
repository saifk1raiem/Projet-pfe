import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BookOpen, Calendar, Users, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export function FormationPage() {
  const formations = [
    {
      id: 1,
      titre: "Sécurité au Travail - Niveau 1",
      dateDebut: "2026-02-20",
      dateFin: "2026-02-22",
      formateur: "Ahmed Ben Ali",
      participants: 18,
      capacite: 20,
      duree: "3 jours",
      statut: "en_cours"
    },
    {
      id: 2,
      titre: "Qualité Produit - ISO 9001",
      dateDebut: "2026-02-25",
      dateFin: "2026-02-28",
      formateur: "Fatima Zahra",
      participants: 15,
      capacite: 15,
      duree: "4 jours",
      statut: "planifie"
    },
    {
      id: 3,
      titre: "Maintenance Préventive",
      dateDebut: "2026-03-05",
      dateFin: "2026-03-08",
      formateur: "Mohamed Salhi",
      participants: 12,
      capacite: 18,
      duree: "4 jours",
      statut: "planifie"
    },
    {
      id: 4,
      titre: "Leadership et Management",
      dateDebut: "2026-02-10",
      dateFin: "2026-02-14",
      formateur: "Nadia Mansouri",
      participants: 20,
      capacite: 20,
      duree: "5 jours",
      statut: "termine"
    }
  ];

  const getStatusBadge = (statut) => {
    switch (statut) {
      case "en_cours":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">En cours</Badge>;
      case "planifie":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Planifié</Badge>;
      case "termine":
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Terminé</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8faf9' }}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Gestion des Formations</h1>
            <p className="text-muted-foreground mt-1">
              Planification et suivi des sessions de formation
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <BookOpen className="w-4 h-4 mr-2" />
            Nouvelle Formation
          </Button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-xl font-bold text-foreground">1</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planifiées</p>
                <p className="text-xl font-bold text-foreground">2</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participants</p>
                <p className="text-xl font-bold text-foreground">65</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Terminées</p>
                <p className="text-xl font-bold text-foreground">1</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Liste des formations */}
        <div className="space-y-4">
          {formations.map((formation) => (
            <Card key={formation.id} className="p-6 bg-white border-border/40 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{formation.titre}</h3>
                    {getStatusBadge(formation.statut)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(formation.dateDebut).toLocaleDateString('fr-FR')} -{" "}
                        {new Date(formation.dateFin).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formation.duree}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Détails</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Formateur</p>
                    <p className="text-sm font-medium text-foreground">{formation.formateur}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Participants</p>
                    <p className="text-sm font-medium text-foreground">{formation.participants} / {formation.capacite}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {formation.participants < formation.capacite ? (
                    <>
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Disponibilité</p>
                        <p className="text-sm font-medium text-green-600">
                          {formation.capacite - formation.participants} places restantes
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Disponibilité</p>
                        <p className="text-sm font-medium text-orange-600">Complet</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}