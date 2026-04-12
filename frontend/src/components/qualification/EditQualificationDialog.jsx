import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const EMPTY_FORMATION_VALUE = "__none__";
const EMPTY_FORMATEUR_VALUE = "__none__";

export function EditQualificationDialog({
  tr,
  isOpen,
  onClose,
  row,
  formValues,
  onChange,
  onSubmit,
  isSubmitting,
  error,
  formations,
  formateurs,
  isOptionsLoading,
  optionsError,
}) {
  if (!isOpen || !row) {
    return null;
  }

  const formationValue = formValues.formation_id || EMPTY_FORMATION_VALUE;
  const formateurValue = formValues.formateur_id || EMPTY_FORMATEUR_VALUE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[860px] rounded-[24px] border border-[#dfe5e2] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#171a1f]">
              {tr("Modifier la qualification", "Edit qualification")}
            </h2>
            <p className="mt-1 text-[15px] text-[#5d6574]">
              {row.nom} ({row.matricule})
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-[#dfe5e2] bg-[#f8fafc] p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <p className="text-[12px] text-[#64748b]">{tr("Qualification actuelle", "Current qualification")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{row.competence || "-"}</p>
            </div>
            <div>
              <p className="text-[12px] text-[#64748b]">{tr("Etat calcule", "Computed status")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{row.statut || "-"}</p>
            </div>
            <div>
              <p className="text-[12px] text-[#64748b]">{tr("Formateur actuel", "Current trainer")}</p>
              <p className="text-[15px] font-medium text-[#1d2025]">{row.formateur || "-"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="edit-qualification-formation" className="text-sm font-medium text-[#252930]">
              {tr("Formation", "Training")}
            </label>
            <Select
              value={formationValue}
              onValueChange={(value) => onChange("formation_id", value === EMPTY_FORMATION_VALUE ? "" : value)}
              disabled={isSubmitting || isOptionsLoading}
            >
              <SelectTrigger id="edit-qualification-formation" className="h-11 rounded-xl border-[#d5dce0]">
                <SelectValue placeholder={tr("Choisir une formation", "Choose a training")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_FORMATION_VALUE}>
                  {tr("Aucune formation", "No training")}
                </SelectItem>
                {formations.map((formation) => (
                  <SelectItem key={formation.id} value={String(formation.id)}>
                    {formation.code} - {formation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-qualification-formateur" className="text-sm font-medium text-[#252930]">
              {tr("Formateur", "Trainer")}
            </label>
            <Select
              value={formateurValue}
              onValueChange={(value) => onChange("formateur_id", value === EMPTY_FORMATEUR_VALUE ? "" : value)}
              disabled={isSubmitting || isOptionsLoading}
            >
              <SelectTrigger id="edit-qualification-formateur" className="h-11 rounded-xl border-[#d5dce0]">
                <SelectValue placeholder={tr("Choisir un formateur", "Choose a trainer")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_FORMATEUR_VALUE}>
                  {tr("Aucun formateur", "No trainer")}
                </SelectItem>
                {formateurs.map((formateur) => (
                  <SelectItem key={formateur.id} value={String(formateur.id)}>
                    {formateur.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-qualification-statut" className="text-sm font-medium text-[#252930]">
              {tr("Statut enregistre", "Stored status")}
            </label>
            <Select
              value={formValues.statut || "Non associee"}
              onValueChange={(value) => onChange("statut", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="edit-qualification-statut" className="h-11 rounded-xl border-[#d5dce0]">
                <SelectValue placeholder={tr("Choisir un statut", "Choose a status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Non associee">{tr("Non associee", "Not associated")}</SelectItem>
                <SelectItem value="En cours">{tr("En cours", "In progress")}</SelectItem>
                <SelectItem value="Qualifie">{tr("Qualifie", "Qualified")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-qualification-date" className="text-sm font-medium text-[#252930]">
              {tr("Date association", "Association date")}
            </label>
            <Input
              id="edit-qualification-date"
              type="date"
              value={formValues.date_association_systeme}
              onChange={(event) => onChange("date_association_systeme", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>
        </div>

        {isOptionsLoading ? (
          <div className="mt-4 rounded-xl border border-[#dfe5e2] bg-[#f8fafc] p-3 text-sm text-[#5d6574]">
            {tr("Chargement des options...", "Loading options...")}
          </div>
        ) : null}

        {optionsError ? (
          <div className="mt-4 rounded-xl border border-[#f1c59e] bg-[#fff2e4] p-3 text-sm text-[#8a4b00]">
            {optionsError}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Annuler", "Cancel")}
          </Button>
          <Button
            className="rounded-xl bg-[#005ca9] text-white hover:bg-[#004a87]"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? tr("Enregistrement...", "Saving...") : tr("Enregistrer", "Save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
