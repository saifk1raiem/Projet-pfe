import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { GraduationCap, Mail, Phone, BookOpen, AlertCircle } from "lucide-react";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { FormateursStat } from "./FormateursStat";
import { getInitials, getSpecialites } from "./formateursUtils";

export function FormateursList({ onNavigateToPage, currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const [selectedFormateur, setSelectedFormateur] = useState(null);
  const [formateurs, setFormateurs] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [formateurFormations, setFormateurFormations] = useState([]);
  const [formationsLoading, setFormationsLoading] = useState(false);
  const [formationsError, setFormationsError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newFormateur, setNewFormateur] = useState({
    nom_formateur: "",
    telephone: "",
    email: "",
    specialite: "",
  });
  const isObserver = currentUser?.role === "observer";

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;

    const loadFormateurs = async () => {
      try {
        const response = await fetch(apiUrl("/formateurs"), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await response.json().catch(() => []);
        if (!response.ok) {
          if (!cancelled) {
            setLoadError(tr("Impossible de charger les formateurs.", "Failed to load trainers."));
          }
          return;
        }

        if (!cancelled) {
          setFormateurs(Array.isArray(data) ? data : []);
          setLoadError("");
        }
      } catch {
        if (!cancelled) {
          setLoadError(tr("Impossible de charger les formateurs.", "Failed to load trainers."));
        }
      }
    };

    loadFormateurs();
    return () => {
      cancelled = true;
    };
  }, [accessToken, tr]);

  const totalFormateurs = formateurs.length;
  const activeFormateurs = formateurs.filter((formateur) => formateur.formations > 0).length;
  const totalAssignedFormations = formateurs.reduce((sum, formateur) => sum + (formateur.formations || 0), 0);
  const withContactInfo = formateurs.filter((formateur) => formateur.telephone || formateur.email).length;

  const resetCreateForm = () => {
    setNewFormateur({
      nom_formateur: "",
      telephone: "",
      email: "",
      specialite: "",
    });
    setCreateError("");
  };

  const handleCreateFormateur = async () => {
    if (!accessToken) return;

    setIsSubmitting(true);
    setCreateError("");
    try {
      const response = await fetch(apiUrl("/formateurs"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newFormateur),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCreateError(data?.detail || tr("Impossible de creer le formateur.", "Failed to create trainer."));
        return;
      }

      setFormateurs((prev) => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)));
      setIsCreateOpen(false);
      resetCreateForm();
    } catch {
      setCreateError(tr("Impossible de creer le formateur.", "Failed to create trainer."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetailsDialog = async (formateur) => {
    setSelectedFormateur(formateur);
    setIsDetailsDialogOpen(true);
    setFormateurFormations([]);
    setFormationsError("");

    if (!accessToken || !formateur?.id) {
      setFormationsError(tr("Impossible de charger les formations.", "Failed to load trainings."));
      return;
    }

    setFormationsLoading(true);
    try {
      const response = await fetch(apiUrl(`/formateurs/${formateur.id}/formations`), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setFormationsError(tr("Impossible de charger les formations.", "Failed to load trainings."));
        return;
      }
      setFormateurFormations(Array.isArray(data) ? data : []);
    } catch {
      setFormationsError(tr("Impossible de charger les formations.", "Failed to load trainings."));
    } finally {
      setFormationsLoading(false);
    }
  };

  const closeDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedFormateur(null);
    setFormateurFormations([]);
    setFormationsError("");
  };

  const handleGoToFormationSection = (formation) => {
    closeDetailsDialog();
    onNavigateToPage?.("formation", { formationId: formation.formation_id });
  };

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
          onClick={() => {
            resetCreateForm();
            setIsCreateOpen(true);
          }}
        >
          <GraduationCap className="mr-2 h-4 w-4" />
          {tr("Nouveau Formateur", "New Trainer")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <FormateursStat icon={GraduationCap} title="Total Formateurs" value={totalFormateurs} color={{ bg: "bg-[#f3edff]", text: "text-[#9029ff]" }} />
        <FormateursStat icon={GraduationCap} title="Actifs" value={activeFormateurs} color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
        <FormateursStat icon={BookOpen} title="Formations assignees" value={totalAssignedFormations} color={{ bg: "bg-[#fff2e4]", text: "text-[#fc6200]" }} />
        <FormateursStat icon={Mail} title="Avec contact" value={withContactInfo} color={{ bg: "bg-[#e8f0ff]", text: "text-[#0f63f2]" }} />
      </div>

      {loadError ? (
        <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-[#8a1d1d] shadow-sm">
          {loadError}
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {formateurs.map((formateur) => {
          const specialites = getSpecialites(formateur.specialite);

          return (
            <Card key={formateur.id} className="rounded-[20px] border border-[#dfe5e2] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#0f63f2] to-[#005ca9] text-[18px] font-medium text-white">
                    {getInitials(formateur.nom)}
                  </div>
                  <div>
                    <h3 className="leoni-display-lg text-[34px] font-medium text-[#191c20]">{formateur.nom}</h3>
                    <p className="mt-1 text-[15px] text-[#5f6777]">{formateur.specialite || tr("Specialite non definie", "Specialty not set")}</p>
                  </div>
                </div>

                <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[14px] text-[#005ca9]">
                  {tr("Formateur", "Trainer")}
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[13px] text-[#5f6777]">{tr("Specialites", "Specialties")}</p>
                  <div className="flex flex-wrap gap-2">
                    {specialites.length > 0 ? specialites.map((specialite) => (
                      <Badge key={specialite} variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[13px]">
                        {specialite}
                      </Badge>
                    )) : (
                      <Badge variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[13px]">
                        {tr("Non definie", "Not set")}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[13px] text-[#5f6777]">{tr("Formations donnees", "Delivered trainings")}</p>
                    <p className="leoni-metric text-[32px] font-medium text-[#191c20]">{formateur.formations}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#5f6777]">{tr("Collaborateurs formes", "Taught collaborators")}</p>
                    <p className="leoni-metric text-[32px] font-medium text-[#191c20]">{formateur.collaborateurs ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  className="h-9 flex-1 rounded-xl border-[#ccd4d8] text-[16px]"
                  onClick={() => handleOpenDetailsDialog(formateur)}
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
          );
        })}
      </div>

      {isDetailsDialogOpen && selectedFormateur ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeDetailsDialog}>
          <div
            className="leoni-rise-up flex h-[88vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-[24px] border border-[#dfe5e2] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#e2e8f0] px-7 py-5">
              <div>
                <h2 className="leoni-display-lg text-[30px] font-semibold leading-tight text-[#171a1f]">
                  {tr("Details du formateur", "Trainer details")}
                </h2>
                <p className="mt-1 text-[15px] text-[#64748b]">{selectedFormateur.nom}</p>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={closeDetailsDialog}>
                {tr("Fermer", "Close")}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-6">
              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Nom</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.nom}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Telephone</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.telephone || "-"}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Email</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.email || "-"}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">{tr("Specialite", "Specialty")}</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.specialite || "-"}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">{tr("Formations donnees", "Delivered trainings")}</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.formations}</p></div>
                <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">{tr("Collaborateurs formes", "Taught collaborators")}</p><p className="text-[15px] font-medium text-[#1d2025]">{selectedFormateur.collaborateurs ?? 0}</p></div>
              </div>

              <h3 className="mb-3 text-[22px] font-semibold text-[#171a1f]">{tr("Formations enseignees", "Taught trainings")}</h3>

              {formationsError ? (
                <div className="mb-4 rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
                  {formationsError}
                </div>
              ) : null}

              {formationsLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#5f6777]">
                  <AlertCircle className="h-4 w-4" />
                  {tr("Chargement des formations...", "Loading trainings...")}
                </div>
              ) : null}

              {!formationsLoading && !formationsError && formateurFormations.length === 0 ? (
                <p className="text-sm text-[#5f6777]">{tr("Aucune formation trouvee pour ce formateur.", "No trainings found for this trainer.")}</p>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {formateurFormations.map((formation) => (
                  <Card key={`${selectedFormateur.id}-${formation.formation_id}`} className="rounded-2xl border border-[#dfe5e2] bg-[#fbfdff] p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[20px] font-semibold text-[#191c20]">
                          {formation.code} - {formation.titre}
                        </h3>
                        <p className="mt-1 text-[14px] text-[#64748b]">{formation.domaine}</p>
                      </div>
                      <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[13px] font-medium text-[#005ca9]">
                        {formation.collaborateurs} {tr("collaborateurs", "collaborators")}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <p className="text-[12px] text-[#64748b]">{tr("Duree", "Duration")}</p>
                        <p className="text-[14px] font-medium text-[#1d2025]">
                          {formation.duree ? tr(`${formation.duree} jours`, `${formation.duree} days`) : "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <p className="text-[12px] text-[#64748b]">{tr("Derniere date", "Last date")}</p>
                        <p className="text-[14px] font-medium text-[#1d2025]">{formation.last_date || "-"}</p>
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
      ) : null}

      {!isObserver && isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setIsCreateOpen(false)}>
          <div
            className="w-full max-w-[640px] rounded-[24px] border border-[#dfe5e2] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[28px] font-semibold text-[#171a1f]">{tr("Nouveau Formateur", "New Trainer")}</h2>
                <p className="mt-1 text-[15px] text-[#5d6574]">{tr("Ajoutez un formateur manuellement.", "Add a trainer manually.")}</p>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>
                {tr("Fermer", "Close")}
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-[#252930]">Nom</label>
                <input
                  className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
                  value={newFormateur.nom_formateur}
                  onChange={(e) => setNewFormateur((prev) => ({ ...prev, nom_formateur: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#252930]">Telephone</label>
                <input
                  className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
                  value={newFormateur.telephone}
                  onChange={(e) => setNewFormateur((prev) => ({ ...prev, telephone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#252930]">Email</label>
                <input
                  className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
                  value={newFormateur.email}
                  onChange={(e) => setNewFormateur((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-[#252930]">{tr("Specialite", "Specialty")}</label>
                <input
                  className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
                  value={newFormateur.specialite}
                  onChange={(e) => setNewFormateur((prev) => ({ ...prev, specialite: e.target.value }))}
                />
              </div>
            </div>

            {createError ? (
              <div className="mt-4 rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
                {createError}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>
                {tr("Annuler", "Cancel")}
              </Button>
              <Button
                className="rounded-xl bg-[#005ca9] text-white hover:bg-[#004a87]"
                onClick={handleCreateFormateur}
                disabled={isSubmitting}
              >
                {isSubmitting ? tr("Enregistrement...", "Saving...") : tr("Enregistrer", "Save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


