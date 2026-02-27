import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { GraduationCap, Star, Calendar, BookOpen } from "lucide-react";

export function FormateursList() {
  const formateurs = [
    {
      id: 1,
      nom: "Ahmed Ben Ali",
      specialites: ["Sécurité", "Qualité"],
      formations: 24,
      disponible: true,
      evaluation: 4.8,
      prochaineCession: "2026-02-20"
    },
    {
      id: 2,
      nom: "Fatima Zahra",
      specialites: ["Qualité", "ISO 9001"],
      formations: 18,
      disponible: true,
      evaluation: 4.9,
      prochaineCession: "2026-02-25"
    },
    {
      id: 3,
      nom: "Mohamed Salhi",
      specialites: ["Maintenance", "Technique"],
      formations: 32,
      disponible: false,
      evaluation: 4.7,
      prochaineCession: "2026-03-05"
    },
    {
      id: 4,
      nom: "Nadia Mansouri",
      specialites: ["Management", "Leadership"],
      formations: 15,
      disponible: true,
      evaluation: 4.9,
      prochaineCession: null
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8faf9' }}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Gestion des Formateurs</h1>
            <p className="text-muted-foreground mt-1">
              Liste et disponibilité des formateurs
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <GraduationCap className="w-4 h-4 mr-2" />
            Nouveau Formateur
          </Button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Formateurs</p>
                <p className="text-xl font-bold text-foreground">24</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponibles</p>
                <p className="text-xl font-bold text-foreground">20</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En formation</p>
                <p className="text-xl font-bold text-foreground">4</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-white border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Note moyenne</p>
                <p className="text-xl font-bold text-foreground">4.8</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Liste des formateurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formateurs.map((formateur) => (
            <Card key={formateur.id} className="p-6 bg-white border-border/40 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {formateur.nom.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{formateur.nom}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-foreground">{formateur.evaluation}</span>
                    </div>
                  </div>
                </div>
                {formateur.disponible ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">Disponible</Badge>
                ) : (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200">Occupé</Badge>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Spécialités</p>
                  <div className="flex flex-wrap gap-2">
                    {formateur.specialites.map((spec, idx) => (
                      <Badge key={idx} variant="outline">{spec}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Formations données</p>
                    <p className="text-sm font-medium text-foreground">{formateur.formations}</p>
                  </div>
                  {formateur.prochaineCession && (
                    <div>
                      <p className="text-xs text-muted-foreground">Prochaine session</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(formateur.prochaineCession).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">Voir détails</Button>
                <Button size="sm" className="flex-1">Planifier</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}