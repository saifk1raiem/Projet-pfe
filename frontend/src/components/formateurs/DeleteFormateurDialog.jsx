import { Button } from "../ui/button";

export function DeleteFormateurDialog({
  tr,
  isOpen,
  onClose,
  formateur,
  onSubmit,
  isSubmitting,
  error,
}) {
  if (!isOpen || !formateur) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[620px] rounded-[24px] border border-[#f2c4c4] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#8a1d1d]">
              {tr("Supprimer le formateur", "Delete trainer")}
            </h2>
            <p className="mt-1 text-[15px] text-[#5d6574]">
              {formateur.nom}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-[#f4d3d3] bg-[#fff5f5] p-4 text-sm text-[#8a1d1d]">
          <p>
            {tr(
              "Cette action supprime le formateur de la base de donnees.",
              "This action deletes the trainer from the database.",
            )}
          </p>
          <p className="mt-2">
            {formateur.collaborateurs > 0
              ? tr(
                  `${formateur.collaborateurs} associations de qualification perdront ce formateur et seront detachees automatiquement.`,
                  `${formateur.collaborateurs} qualification assignments will lose this trainer and be detached automatically.`,
                )
              : tr(
                  "Aucune qualification liee ne sera impactee.",
                  "No linked qualification will be impacted.",
                )}
          </p>
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
            variant="destructive"
            className="rounded-xl"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? tr("Suppression...", "Deleting...") : tr("Supprimer", "Delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
