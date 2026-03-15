import { Button } from "../ui/button";

export function AssociateFormationDialog({
  tr,
  isOpen,
  onClose,
  collaborateur,
  formations,
  formateurs,
  isLoading,
  error,
  newAssociation,
  onAssociationChange,
  onSubmit,
  isSubmitting,
}) {
  if (!isOpen || !collaborateur) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[700px] rounded-[24px] border border-[#dfe5e2] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#171a1f]">
              {tr("Associer a une formation", "Assign to a training")}
            </h2>
            <p className="mt-1 text-[15px] text-[#5d6574]">
              {collaborateur.nom} ({collaborateur.matricule})
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="association-formation" className="text-sm font-medium text-[#252930]">
              {tr("Formation", "Training")}
            </label>
            <select
              id="association-formation"
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newAssociation.formationId}
              onChange={(e) => onAssociationChange("formationId", e.target.value)}
              disabled={isLoading || isSubmitting}
            >
              <option value="">{tr("Selectionnez une formation", "Select a training")}</option>
              {formations.map((formation) => (
                <option key={formation.id} value={formation.id}>
                  {formation.code} - {formation.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="association-formateur" className="text-sm font-medium text-[#252930]">
              {tr("Formateur", "Trainer")}
            </label>
            <select
              id="association-formateur"
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newAssociation.formateurId}
              onChange={(e) => onAssociationChange("formateurId", e.target.value)}
              disabled={isLoading || isSubmitting}
            >
              <option value="">{tr("Aucun formateur selectionne", "No trainer selected")}</option>
              {formateurs.map((formateur) => (
                <option key={formateur.id} value={formateur.id}>
                  {formateur.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="association-date" className="text-sm font-medium text-[#252930]">
              {tr("Date d'association", "Association date")}
            </label>
            <input
              id="association-date"
              type="date"
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newAssociation.dateAssociation}
              onChange={(e) => onAssociationChange("dateAssociation", e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="rounded-2xl border border-[#dfe5e2] bg-[#f8fafc] p-4">
            <p className="text-[12px] uppercase tracking-[0.12em] text-[#64748b]">
              {tr("Statut initial", "Initial status")}
            </p>
            <p className="mt-2 text-[18px] font-medium text-[#1d2025]">{tr("En cours", "In progress")}</p>
            <p className="mt-1 text-[13px] text-[#64748b]">
              {tr(
                "La qualification demarre des que la formation est associee.",
                "Qualification starts as soon as the training is assigned.",
              )}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 rounded-xl border border-[#d6e4f0] bg-[#f8fbff] p-3 text-sm text-[#33506b]">
            {tr("Chargement des formations...", "Loading trainings...")}
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
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? tr("Association...", "Assigning...") : tr("Associer", "Assign")}
          </Button>
        </div>
      </div>
    </div>
  );
}
