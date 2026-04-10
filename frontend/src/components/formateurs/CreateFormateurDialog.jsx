import { Button } from "../ui/button";

export function CreateFormateurDialog({
  tr,
  isOpen,
  onClose,
  formValues,
  onChange,
  formations,
  selectedFormationIds,
  onToggleFormation,
  onSubmit,
  isSubmitting,
  error,
  title,
  description,
  submitLabel,
  submittingLabel,
  isFormationsLoading,
  formationsError,
}) {
  if (!isOpen) {
    return null;
  }

  const resolvedTitle = title || tr("Definir un formateur", "Create a trainer");
  const resolvedDescription =
    description ||
    tr(
      "Ajoutez un nouveau formateur a la liste avec ses informations principales.",
      "Add a new trainer to the list with their key information.",
    );
  const resolvedSubmitLabel = submitLabel || tr("Ajouter", "Add");
  const resolvedSubmittingLabel = submittingLabel || tr("Creation...", "Creating...");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[680px] rounded-[24px] border border-[#dfe5e2] bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold text-[#171a1f]">
              {resolvedTitle}
            </h2>
            <p className="mt-1 text-[15px] text-[#5d6574]">
              {resolvedDescription}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="create-formateur-nom" className="text-sm font-medium text-[#252930]">
              {tr("Nom", "Name")}
            </label>
            <input
              id="create-formateur-nom"
              type="text"
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={formValues.nom}
              onChange={(event) => onChange("nom", event.target.value)}
              disabled={isSubmitting}
              placeholder={tr("Nom du formateur", "Trainer name")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="create-formateur-telephone" className="text-sm font-medium text-[#252930]">
              {tr("Telephone", "Phone")}
            </label>
            <input
              id="create-formateur-telephone"
              type="text"
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={formValues.telephone}
              onChange={(event) => onChange("telephone", event.target.value)}
              disabled={isSubmitting}
              placeholder={tr("Optionnel", "Optional")}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="create-formateur-email" className="text-sm font-medium text-[#252930]">
              {tr("Email", "Email")}
            </label>
            <input
              id="create-formateur-email"
              type="email"
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={formValues.email}
              onChange={(event) => onChange("email", event.target.value)}
              disabled={isSubmitting}
              placeholder={tr("Optionnel", "Optional")}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="create-formateur-specialite" className="text-sm font-medium text-[#252930]">
              {tr("Specialite", "Specialty")}
            </label>
            <input
              id="create-formateur-specialite"
              type="text"
              className="h-11 w-full rounded-xl border border-[#d5dce0] bg-white px-3 text-[15px] outline-none focus:border-[#0f63f2]"
              value={formValues.specialite}
              onChange={(event) => onChange("specialite", event.target.value)}
              disabled={isSubmitting}
              placeholder={tr("Ex: Assemblage, qualite, securite", "Ex: Assembly, quality, safety")}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-[#252930]">
              {tr("Formations enseignees", "Taught trainings")}
            </label>
            <div className="max-h-[220px] overflow-y-auto rounded-2xl border border-[#d5dce0] bg-[#f8fafc] p-3">
              {isFormationsLoading ? (
                <p className="text-sm text-[#5d6574]">
                  {tr("Chargement des formations...", "Loading trainings...")}
                </p>
              ) : null}

              {!isFormationsLoading && formations.length === 0 ? (
                <p className="text-sm text-[#5d6574]">
                  {tr("Aucune formation disponible.", "No trainings available.")}
                </p>
              ) : null}

              {!isFormationsLoading ? (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {formations.map((formation) => {
                    const isChecked = selectedFormationIds.includes(String(formation.id));

                    return (
                      <label
                        key={formation.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                          isChecked
                            ? "border-[#b9d3ea] bg-[#eef6ff]"
                            : "border-[#dfe5e2] bg-white hover:border-[#b9d3ea]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-[#b9c2cc]"
                          checked={isChecked}
                          onChange={() => onToggleFormation(String(formation.id))}
                          disabled={isSubmitting}
                        />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium text-[#171a1f]">
                            {formation.code} - {formation.name}
                          </span>
                          <span className="mt-1 block text-[12px] text-[#5d6574]">
                            {formation.field || tr("Domaine non defini", "No domain set")}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {formationsError ? (
          <div className="mt-4 rounded-xl border border-[#f1c59e] bg-[#fff2e4] p-3 text-sm text-[#8a4b00]">
            {formationsError}
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
            {isSubmitting ? resolvedSubmittingLabel : resolvedSubmitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
