import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";

const FIELD_LABELS = {
  nom: "Nom",
  prenom: "Prenom",
  fonction: "Fonction SAP",
  fonction_sap: "Fonction SAP",
  centre_cout: "Centre de cout",
  groupe: "Groupe",
  competence: "Competence",
  formateur: "Formateur",
  contre_maitre: "Contre maitre",
  segment: "Segment",
  gender: "Gender",
  num_tel: "Numero de telephone",
  date_recrutement: "Date recrutement",
  anciennete: "Anciennete",
};
const PAGE_SIZE = 4;

function buildDrafts(conflicts, rows) {
  const rowsById = new Map(rows.map((row) => [row.__previewRowId, row]));

  return conflicts.map((conflict) => {
    const row = (conflict.rowId ? rowsById.get(conflict.rowId) : null) || rows[conflict.row_index] || {};
    const values = {};

    conflict.fields.forEach((field) => {
      const value = row[field.row_field];
      values[field.row_field] = value == null ? "" : String(value);
    });

    return {
      rowId: conflict.rowId || row.__previewRowId || null,
      rowIndex: conflict.row_index,
      matricule: conflict.matricule,
      skip: false,
      fields: conflict.fields,
      values,
    };
  });
}

export function ImportConflictDialog({
  tr,
  isOpen,
  conflicts,
  rows,
  onClose,
  onApply,
}) {
  const [drafts, setDrafts] = useState(() => buildDrafts(conflicts, rows));
  const [page, setPage] = useState(1);

  useEffect(() => {
    setDrafts(buildDrafts(conflicts, rows));
    setPage(1);
  }, [conflicts, rows, isOpen]);

  if (!isOpen) return null;

  const getDraftKey = (draft) => draft.rowId || `row-${draft.rowIndex}`;
  const totalPages = Math.max(1, Math.ceil(drafts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleDrafts = drafts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleValueChange = (draftKey, fieldName, nextValue) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        getDraftKey(draft) === draftKey
          ? { ...draft, values: { ...draft.values, [fieldName]: nextValue } }
          : draft,
      ),
    );
  };

  const handleSkipChange = (draftKey, checked) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        getDraftKey(draft) === draftKey ? { ...draft, skip: checked === true } : draft,
      ),
    );
  };

  const handleSkipAll = () => {
    setDrafts((prev) => prev.map((draft) => ({ ...draft, skip: true })));
  };

  const handleApply = () => {
    const skippedKeys = new Set(drafts.filter((draft) => draft.skip).map((draft) => getDraftKey(draft)));
    const rowsByKey = new Map(drafts.map((draft) => [getDraftKey(draft), draft]));

    const nextRows = rows
      .map((row, rowIndex) => {
        const rowKey = row.__previewRowId || `row-${rowIndex}`;
        if (skippedKeys.has(rowKey)) {
          return null;
        }

        const draft = rowsByKey.get(rowKey);
        if (!draft) {
          return row;
        }

        const updatedRow = { ...row };
        Object.entries(draft.values).forEach(([fieldName, value]) => {
          const trimmed = value.trim();
          updatedRow[fieldName] = trimmed ? trimmed : null;
        });
        return updatedRow;
      })
      .filter(Boolean);

    onApply(nextRows);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="leoni-rise-up flex h-[88vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-[24px] border border-[#dfe5e2] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#e2e8f0] px-7 py-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#fff2e4] p-2 text-[#fc6200]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="leoni-display-lg text-[28px] font-semibold leading-tight text-[#171a1f]">
                {tr("Verifier les conflits", "Review conflicts")}
              </h2>
            </div>
            <p className="mt-2 text-[15px] text-[#64748b]">
              {tr(
                "Les matricules suivants existent deja avec des informations differentes. Modifiez les champs ou ignorez la ligne.",
                "The following employee IDs already exist with different information. Edit the fields or skip the row.",
              )}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-7 py-6">
          {drafts.length > PAGE_SIZE ? (
            <div className="flex flex-col gap-3 rounded-xl border border-[#eef2f5] bg-[#fafcff] p-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-[#5f6777]">
                {tr("Affichage", "Showing")} {Math.min((safePage - 1) * PAGE_SIZE + 1, drafts.length)}-
                {Math.min(safePage * PAGE_SIZE, drafts.length)} {tr("sur", "of")} {drafts.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-8 rounded-xl px-3"
                  disabled={safePage <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  {tr("Precedent", "Previous")}
                </Button>
                <Button
                  variant="outline"
                  className="h-8 rounded-xl px-3"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  {tr("Suivant", "Next")}
                </Button>
              </div>
            </div>
          ) : null}

          {visibleDrafts.map((draft) => (
            <Card key={getDraftKey(draft)} className="rounded-2xl border border-[#dfe5e2] bg-[#fbfdff] p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[18px] font-semibold text-[#171a1f]">
                    {tr("Matricule", "Employee ID")}: {draft.matricule}
                  </p>
                  <p className="text-[13px] text-[#64748b]">
                    {draft.fields.length} {tr("champs en conflit", "conflicting fields")}
                  </p>
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-[#dfe5e2] bg-white px-3 py-2 text-sm text-[#1f2937]">
                  <Checkbox
                    checked={draft.skip}
                    onCheckedChange={(checked) => handleSkipChange(getDraftKey(draft), checked)}
                  />
                  {tr("Ignorer cette ligne", "Skip this row")}
                </label>
              </div>

              <div className="space-y-3">
                {draft.fields.map((field) => (
                  <div key={`${draft.rowIndex}-${field.row_field}`} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[14px] font-medium text-[#171a1f]">
                        {FIELD_LABELS[field.row_field] || FIELD_LABELS[field.field] || field.row_field}
                      </p>
                      <Badge variant="outline" className="rounded-xl border-[#f1c59e] bg-[#fff7ed] text-[#8a4b00]">
                        {tr("Conflit", "Conflict")}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs text-[#64748b]">{tr("Valeur existante", "Existing value")}</p>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f2937]">
                          {field.existing_value ?? "-"}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-[#64748b]">{tr("Nouvelle valeur", "New value")}</p>
                        <Input
                          value={draft.values[field.row_field] ?? ""}
                          onChange={(event) =>
                            handleValueChange(getDraftKey(draft), field.row_field, event.target.value)
                          }
                          disabled={draft.skip}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#e2e8f0] px-7 py-5 sm:flex-row sm:justify-end">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Annuler", "Cancel")}
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={handleSkipAll}>
            {tr("Ignorer tout", "Skip all")}
          </Button>
          <Button className="rounded-xl bg-[#005ca9] text-white hover:bg-[#004a87]" onClick={handleApply}>
            {tr("Appliquer les modifications", "Apply changes")}
          </Button>
        </div>
      </div>
    </div>
  );
}
