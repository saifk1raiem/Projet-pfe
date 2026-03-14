import { Fragment, useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MoreVertical,
  AlertTriangle,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { EntityFiltersCard } from "../filters/EntityFiltersCard";
import { CollaborateursStat } from "./CollaborateursStat";
import { getStatusBadge } from "./statusBadge";

const statutOptions = ["Non associe", "En cours", "Qualifie", "Depassement"];

export function CollaborateursPage({ onNavigateToPage, currentUser, accessToken }) {
  const { tr } = useAppPreferences();
  const isObserver = currentUser?.role === "observer";
  const [searchTerm, setSearchTerm] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [collaborateursData, setCollaborateursData] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [selectedCollaborateur, setSelectedCollaborateur] = useState(null);
  const [collaborateurToDelete, setCollaborateurToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [collaborateurToUpdateStatus, setCollaborateurToUpdateStatus] = useState(null);
  const [statusDraft, setStatusDraft] = useState(statutOptions[0]);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isFormationsDialogOpen, setIsFormationsDialogOpen] = useState(false);
  const [formationsCollaborateur, setFormationsCollaborateur] = useState(null);
  const [formationsHistory, setFormationsHistory] = useState([]);
  const [formationsHistoryLoading, setFormationsHistoryLoading] = useState(false);
  const [formationsHistoryError, setFormationsHistoryError] = useState("");

  useEffect(() => {
    if (!accessToken) {
      setCollaborateursData([]);
      return;
    }

    let cancelled = false;

    const formatDate = (value) => {
      if (!value) return "-";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return String(value);
      const day = String(parsed.getDate()).padStart(2, "0");
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const loadCollaborateurs = async () => {
      try {
        const response = await fetch(apiUrl("/api/v1/qualification"), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          if (!cancelled) {
            setLoadError(tr("Impossible de charger les collaborateurs.", "Failed to load collaborators."));
          }
          return;
        }

        const mapped = Array.isArray(data)
          ? data.map((item) => ({
              id: item.id ?? item.matricule,
              matricule: item.matricule ?? "-",
              nom: item.nom ?? "-",
              prenom: item.prenom ?? "-",
              departement: item.segment || item.groupe || item.centre_cout || "-",
              poste: item.fonction || "-",
              dateEntree: formatDate(item.date_recrutement),
              statut: item.statut || "Non associee",
              formations: Number.isFinite(item.formations) ? item.formations : 0,
              derniereFormation: formatDate(item.derniereFormation),
            }))
          : [];

        if (!cancelled) {
          setCollaborateursData(mapped);
          setLoadError("");
        }
      } catch {
        if (!cancelled) {
          setLoadError(tr("Impossible de charger les collaborateurs.", "Failed to load collaborators."));
        }
      }
    };

    loadCollaborateurs();

    return () => {
      cancelled = true;
    };
  }, [accessToken, tr]);

  const totalCollaborateurs = collaborateursData.length;
  const qualifiesCount = collaborateursData.filter((collab) => collab.statut === "Qualifie").length;
  const enCoursCount = collaborateursData.filter((collab) => collab.statut === "En cours").length;
  const nonAssocieeCount = collaborateursData.filter(
    (collab) => collab.statut === "Non associee" || collab.statut === "Non associe",
  ).length;
  const depassementCount = collaborateursData.filter((collab) => collab.statut === "Depassement").length;
  const availableDepartments = Array.from(
    new Set(
      collaborateursData
        .map((collab) => collab.departement)
        .filter((value) => typeof value === "string" && value.trim().length > 0 && value !== "-"),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const filteredCollaborateurs = collaborateursData.filter((collab) => {
    const matchesSearch =
      collab.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collab.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collab.departement.toLowerCase().includes(searchTerm.toLowerCase());

    const normalizedStatus = collab.statut === "Non associe" ? "Non associee" : collab.statut;
    const normalizedFilterStatus = statusFilter === "Non associe" ? "Non associee" : statusFilter;
    const matchesStatus = normalizedFilterStatus === "all" || normalizedStatus === normalizedFilterStatus;
    const matchesDepartment = departmentFilter === "all" || collab.departement === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const handleViewCollaborateur = (collab) => {
    setSelectedCollaborateur((prev) => (prev?.id === collab.id ? null : collab));
  };

  const handleOpenStatusDialog = (collab) => {
    if (isObserver) return;
    setCollaborateurToUpdateStatus(collab);
    setStatusDraft(collab.statut);
    setIsStatusDialogOpen(true);
  };

  const handleOpenFormationsDialog = async (collab) => {
    setFormationsCollaborateur(collab);
    setIsFormationsDialogOpen(true);
    setFormationsHistory([]);
    setFormationsHistoryError("");

    if (!accessToken || !collab?.matricule) {
      setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
      return;
    }

    setFormationsHistoryLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/v1/qualification/${collab.matricule}/formations`), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
        return;
      }
      setFormationsHistory(Array.isArray(data) ? data : []);
    } catch {
      setFormationsHistoryError(tr("Impossible de charger les formations.", "Failed to load trainings."));
    } finally {
      setFormationsHistoryLoading(false);
    }
  };

  const closeFormationsDialog = () => {
    setIsFormationsDialogOpen(false);
    setFormationsCollaborateur(null);
    setFormationsHistory([]);
    setFormationsHistoryError("");
  };

  const handleGoToFormationSection = (formation) => {
    closeFormationsDialog();
    onNavigateToPage?.("formation", { formationId: formation.formation_id });
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
    if (isObserver) return;
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
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-[#171a1f]">{tr("Gestion des Collaborateurs", "Collaborator Management")}</h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-[#5d6574]">{tr("Liste et suivi des collaborateurs", "Collaborator list and tracking")}</p>
        </div>
        <Button
          className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]"
          disabled={isObserver}
        >
          <Users className="mr-2 h-4 w-4" />
          {tr("Nouveau Collaborateur", "New Collaborator")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <CollaborateursStat icon={Users} title="Total" value={totalCollaborateurs} color={{ bg: "bg-[#e8f0ff]", text: "text-[#0f63f2]" }} />
        <CollaborateursStat icon={CheckCircle2} title="Qualifies" value={qualifiesCount} color={{ bg: "bg-[#e8f1fb]", text: "text-[#005ca9]" }} />
        <CollaborateursStat icon={AlertCircle} title="En cours" value={enCoursCount} color={{ bg: "bg-[#fff2e4]", text: "text-[#fc6200]" }} />
        <CollaborateursStat icon={XCircle} title="Non associee" value={nonAssocieeCount} color={{ bg: "bg-[#fdeeee]", text: "text-[#ea3737]" }} />
        <CollaborateursStat icon={AlertTriangle} title="Depassement" value={depassementCount} color={{ bg: "bg-[#f3edff]", text: "text-[#7b35e8]" }} />
      </div>

      {loadError ? (
        <Card className="rounded-[20px] border border-[#f2c4c4] bg-[#fdeeee] p-4 text-sm text-[#8a1d1d] shadow-sm">
          {loadError}
        </Card>
      ) : null}

      <EntityFiltersCard
        tr={tr}
        searchPlaceholder={tr("Rechercher par nom, matricule ou departement...", "Search by name, ID, or department...")}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        isFiltersOpen={isFiltersOpen}
        onToggleFilters={() => setIsFiltersOpen((prev) => !prev)}
        filters={[
          {
            id: "collab-status-filter",
            label: tr("Statut", "Status"),
            value: statusFilter,
            onChange: setStatusFilter,
            allOptionLabel: tr("Tous les statuts", "All statuses"),
            options: [
              { value: "Non associee", label: tr("Non associee", "Not associated") },
              { value: "En cours", label: tr("En cours", "In progress") },
              { value: "Qualifie", label: tr("Qualifie", "Qualified") },
              { value: "Depassement", label: tr("Depassement", "Overdue") },
            ],
          },
          {
            id: "collab-department-filter",
            label: tr("Departement", "Department"),
            value: departmentFilter,
            onChange: setDepartmentFilter,
            allOptionLabel: tr("Tous les departements", "All departments"),
            options: availableDepartments.map((department) => ({ value: department, label: department })),
          },
        ]}
        onResetFilters={() => {
          setStatusFilter("all");
          setDepartmentFilter("all");
        }}
        filtersGridClassName="md:grid-cols-3"
      />

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
              <Fragment key={collab.id}>
                <TableRow key={`${collab.id}-row`} className="h-16">
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
                        <DropdownMenuItem onClick={() => handleOpenFormationsDialog(collab)}>
                          <BookOpen className="h-4 w-4" />
                          {tr("Voir formations", "View trainings")}
                        </DropdownMenuItem>
                        {!isObserver ? (
                          <>
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
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {selectedCollaborateur?.id === collab.id ? (
                  <TableRow key={`${collab.id}-details`} className="bg-[#f8fbff]">
                    <TableCell colSpan={9}>
                      <div className="rounded-xl border border-[#dfe5e2] bg-white p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-[16px] font-semibold text-[#171a1f]">
                            {collab.nom} ({collab.matricule})
                          </p>
                          <Button variant="outline" className="h-8 rounded-xl px-3" onClick={() => setSelectedCollaborateur(null)}>
                            {tr("Fermer", "Close")}
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Matricule</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.matricule}</p></div>
                          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Nom</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.nom}</p></div>
                          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Prenom</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.prenom}</p></div>
                          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Departement</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.departement}</p></div>
                          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Poste</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.poste}</p></div>
                          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Date d'entree</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.dateEntree}</p></div>
                          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Formations</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.formations}</p></div>
                          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Derniere formation</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.derniereFormation}</p></div>
                          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Statut</p><div className="mt-1">{getStatusBadge(collab.statut)}</div></div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>

      {isFormationsDialogOpen && formationsCollaborateur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeFormationsDialog}>
          <div
            className="leoni-rise-up flex h-[88vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-[24px] border border-[#dfe5e2] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#e2e8f0] px-7 py-5">
              <div>
                <h2 className="leoni-display-lg text-[30px] font-semibold leading-tight text-[#171a1f]">
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
              {formationsHistoryError ? (
                <div className="rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
                  {formationsHistoryError}
                </div>
              ) : null}

              {formationsHistoryLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#5f6777]">
                  <AlertCircle className="h-4 w-4" />
                  {tr("Chargement des formations...", "Loading trainings...")}
                </div>
              ) : null}

              {!formationsHistoryLoading && !formationsHistoryError && formationsHistory.length === 0 ? (
                <p className="text-sm text-[#5f6777]">
                  {tr("Aucune formation trouvee pour ce collaborateur.", "No trainings found for this collaborator.")}
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {formationsHistory.map((formation) => (
                  <Card key={formation.id} className="rounded-2xl border border-[#dfe5e2] bg-[#fbfdff] p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[20px] font-semibold text-[#191c20]">
                          {formation.code} - {formation.titre}
                        </h3>
                        <p className="mt-1 text-[14px] text-[#64748b]">{formation.type}</p>
                      </div>
                      <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[13px] font-medium text-[#005ca9]">
                        {formation.resultat}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <p className="text-[12px] text-[#64748b]">{tr("Date", "Date")}</p>
                        <p className="text-[14px] font-medium text-[#1d2025]">{formation.date || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                        <p className="text-[12px] text-[#64748b]">{tr("Duree", "Duration")}</p>
                        <p className="text-[14px] font-medium text-[#1d2025]">
                          {formation.duree ? tr(`${formation.duree} jours`, `${formation.duree} days`) : "-"}
                        </p>
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

      {!isObserver ? <AlertDialog
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
      </AlertDialog> : null}

      {!isObserver ? <AlertDialog
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
      </AlertDialog> : null}
    </div>
  );
}



