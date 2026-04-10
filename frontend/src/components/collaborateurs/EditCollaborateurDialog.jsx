import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function EditCollaborateurDialog({
  tr,
  isOpen,
  onClose,
  formValues,
  onChange,
  onSubmit,
  isSubmitting,
  error,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[860px] rounded-[24px] border border-[#dfe5e2] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#171a1f]">
              {tr("Modifier le collaborateur", "Edit collaborator")}
            </h2>
            <p className="mt-1 text-[15px] text-[#5d6574]">
              {tr(
                "Mettez a jour les informations du collaborateur dans la base de donnees.",
                "Update the collaborator information in the database.",
              )}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-matricule" className="text-sm font-medium text-[#252930]">
              {tr("Matricule", "ID")}
            </label>
            <Input
              id="edit-collaborateur-matricule"
              value={formValues.matricule}
              disabled
              className="h-11 rounded-xl border-[#d5dce0] bg-[#f8fafc]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-date-recrutement" className="text-sm font-medium text-[#252930]">
              {tr("Date d'entree", "Start date")}
            </label>
            <Input
              id="edit-collaborateur-date-recrutement"
              type="date"
              value={formValues.date_recrutement}
              onChange={(event) => onChange("date_recrutement", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-nom" className="text-sm font-medium text-[#252930]">
              {tr("Nom", "Last name")}
            </label>
            <Input
              id="edit-collaborateur-nom"
              value={formValues.nom}
              onChange={(event) => onChange("nom", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-prenom" className="text-sm font-medium text-[#252930]">
              {tr("Prenom", "First name")}
            </label>
            <Input
              id="edit-collaborateur-prenom"
              value={formValues.prenom}
              onChange={(event) => onChange("prenom", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-fonction" className="text-sm font-medium text-[#252930]">
              {tr("Fonction SAP", "SAP role")}
            </label>
            <Input
              id="edit-collaborateur-fonction"
              value={formValues.fonction}
              onChange={(event) => onChange("fonction", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-centre-cout" className="text-sm font-medium text-[#252930]">
              {tr("Centre de cout", "Cost center")}
            </label>
            <Input
              id="edit-collaborateur-centre-cout"
              value={formValues.centre_cout}
              onChange={(event) => onChange("centre_cout", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-groupe" className="text-sm font-medium text-[#252930]">
              {tr("Groupe", "Group")}
            </label>
            <Input
              id="edit-collaborateur-groupe"
              value={formValues.groupe}
              onChange={(event) => onChange("groupe", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-segment" className="text-sm font-medium text-[#252930]">
              {tr("Segment", "Segment")}
            </label>
            <Input
              id="edit-collaborateur-segment"
              value={formValues.segment}
              onChange={(event) => onChange("segment", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-contre-maitre" className="text-sm font-medium text-[#252930]">
              {tr("Contre maitre", "Supervisor")}
            </label>
            <Input
              id="edit-collaborateur-contre-maitre"
              value={formValues.contre_maitre}
              onChange={(event) => onChange("contre_maitre", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-gender" className="text-sm font-medium text-[#252930]">
              {tr("Genre", "Gender")}
            </label>
            <Input
              id="edit-collaborateur-gender"
              value={formValues.gender}
              onChange={(event) => onChange("gender", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-num-tel" className="text-sm font-medium text-[#252930]">
              {tr("Telephone", "Phone")}
            </label>
            <Input
              id="edit-collaborateur-num-tel"
              value={formValues.num_tel}
              onChange={(event) => onChange("num_tel", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-collaborateur-anciennete" className="text-sm font-medium text-[#252930]">
              {tr("Anciennete", "Seniority")}
            </label>
            <Input
              id="edit-collaborateur-anciennete"
              type="number"
              min="0"
              value={formValues.anciennete}
              onChange={(event) => onChange("anciennete", event.target.value)}
              disabled={isSubmitting}
              className="h-11 rounded-xl border-[#d5dce0]"
            />
          </div>
        </div>

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
