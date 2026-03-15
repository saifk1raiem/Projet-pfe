import { Button } from "../ui/button";

export function CreateCollaborateurDialog({
  tr,
  isOpen,
  onClose,
  newCollaborateur,
  onChange,
  createError,
  isSubmitting,
  onSubmit,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[700px] rounded-[24px] border border-[#dfe5e2] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#171a1f]">{tr("Nouveau Collaborateur", "New Collaborator")}</h2>
            <p className="mt-1 text-[15px] text-[#5d6574]">
              {tr("Ajoutez un collaborateur manuellement.", "Add a collaborator manually.")}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#252930]">Matricule</label>
            <input
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newCollaborateur.matricule}
              onChange={(e) => onChange("matricule", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#252930]">{tr("Date d'entree", "Start date")}</label>
            <input
              type="date"
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newCollaborateur.date_recrutement}
              onChange={(e) => onChange("date_recrutement", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#252930]">{tr("Nom", "Last name")}</label>
            <input
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newCollaborateur.nom}
              onChange={(e) => onChange("nom", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#252930]">{tr("Prenom", "First name")}</label>
            <input
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newCollaborateur.prenom}
              onChange={(e) => onChange("prenom", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#252930]">{tr("Poste", "Position")}</label>
            <input
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newCollaborateur.fonction}
              onChange={(e) => onChange("fonction", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#252930]">{tr("Departement", "Department")}</label>
            <input
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newCollaborateur.segment}
              onChange={(e) => onChange("segment", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-[#252930]">{tr("Telephone", "Phone")}</label>
            <input
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={newCollaborateur.num_tel}
              onChange={(e) => onChange("num_tel", e.target.value)}
            />
          </div>
        </div>

        {createError ? (
          <div className="mt-4 rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
            {createError}
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
