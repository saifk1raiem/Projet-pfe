import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";

const EDITABLE_FIELDS = [
  { key: "matricule", label: "Matricule", required: true },
  { key: "nom", label: "Nom", required: false },
  { key: "prenom", label: "Prenom", required: false },
  { key: "formation_id", label: "ID formation (optionnel)", required: false },
  { key: "competence", label: "Qualification", required: false },
  { key: "date_association_systeme", label: "Date association", required: false },
  { key: "statut", label: "Statut", required: false },
  { key: "formateur", label: "Formateur", required: false },
  { key: "fonction", label: "Fonction SAP", required: false },
  { key: "centre_cout", label: "Centre de cout", required: false },
  { key: "groupe", label: "Groupe", required: false },
  { key: "contre_maitre", label: "Contre maitre", required: false },
  { key: "segment", label: "Segment", required: false },
  { key: "num_tel", label: "Numero de telephone", required: false },
];
const PAGE_SIZE = 4;

function buildDrafts(unmatchedRows) {
  return unmatchedRows.map((issue, index) => {
    const row = issue?.row || {};
    const values = {};
    EDITABLE_FIELDS.forEach((field) => {
      const sourceValue =
        field.key === "competence"
          ? row.competence ?? row.formation_label ?? ""
          : row[field.key] ?? "";
      values[field.key] = sourceValue == null ? "" : String(sourceValue);
    });

    return {
      draftId:
        issue?.row?.__previewRowId ||
        `${issue?.source_file || "upload"}::${issue?.source_row_number || index}::${index}`,
      rowIndex: issue?.row_index ?? index,
      sourceFile: issue?.source_file || null,
      sourceRowNumber: issue?.source_row_number || null,
      reason: issue?.reason || "",
      skip: false,
      values,
      originalRow: row,
      issue,
    };
  });
}

export function ImportUnmatchedRowsDialog({
  tr,
  isOpen,
  unmatchedRows,
  existingRows,
  onClose,
  onApply,
}) {
  const initialDrafts = useMemo(() => buildDrafts(unmatchedRows), [unmatchedRows]);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [dialogError, setDialogError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setDrafts(initialDrafts);
    setDialogError("");
    setPage(1);
  }, [initialDrafts, isOpen]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(drafts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleDrafts = drafts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleValueChange = (draftId, fieldName, nextValue) => {
    setDialogError("");
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.draftId === draftId
          ? { ...draft, values: { ...draft.values, [fieldName]: nextValue } }
          : draft,
      ),
    );
  };

  const handleSkipChange = (draftId, checked) => {
    setDialogError("");
    setDrafts((prev) =>
      prev.map((draft) =>
        draft.draftId === draftId ? { ...draft, skip: checked === true } : draft,
      ),
    );
  };

  const handleSkipAll = () => {
    setDialogError("");
    setDrafts((prev) => prev.map((draft) => ({ ...draft, skip: true })));
  };

  const handleApply = () => {
    const invalidDraft = drafts.find((draft) => {
      if (draft.skip) {
        return false;
      }
      return EDITABLE_FIELDS.some(
        (field) => field.required && !String(draft.values[field.key] ?? "").trim(),
      );
    });

    if (invalidDraft) {
      setDialogError(
        tr(
          "Completez au minimum le matricule, ou ignorez la ligne avant de continuer.",
          "Fill at least the employee ID, or skip the row before continuing.",
        ),
      );
      return;
    }

    const reviewedRows = drafts
      .filter((draft) => !draft.skip)
      .map((draft) => {
        const nextRow = {
          ...draft.originalRow,
          __previewRowId: draft.originalRow.__previewRowId || draft.draftId,
        };

        EDITABLE_FIELDS.forEach((field) => {
          const trimmed = String(draft.values[field.key] ?? "").trim();
          nextRow[field.key] = trimmed ? trimmed : null;
        });

        nextRow.formation_label = nextRow.competence || nextRow.formation_label || null;
        nextRow.etat = nextRow.etat || null;
        return nextRow;
      });

    const nextRows = [...existingRows, ...reviewedRows];
    const remainingIssues = drafts
      .filter((draft) => draft.skip)
      .map((draft) => draft.issue)
      .filter(Boolean);

    onApply(nextRows, remainingIssues);
  };

  return (
    <div className="fixed inset-0 z-[71] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="leoni-rise-up flex h-[88vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[24px] border border-[#dfe5e2] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#e2e8f0] px-7 py-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#fff2e4] p-2 text-[#fc6200]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="leoni-display-lg text-[28px] font-semibold leading-tight text-[#171a1f]">
                {tr("Lignes non fusionnees", "Unmatched rows")}
              </h2>
            </div>
            <p className="mt-2 text-[15px] text-[#64748b]">
              {tr(
                "Ces lignes n'ont pas pu etre reliees automatiquement a une qualification. Completez les colonnes manquantes pour les ajouter manuellement, ou ignorez-les.",
                "These rows could not be linked automatically to a qualification. Fill the missing columns to add them manually, or skip them.",
              )}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-7 py-6">
          {dialogError ? (
            <div className="rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
              {dialogError}
            </div>
          ) : null}

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
            <Card key={draft.draftId} className="rounded-2xl border border-[#dfe5e2] bg-[#fbfdff] p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-[18px] font-semibold text-[#171a1f]">
                    {tr("Ligne a verifier", "Row to review")}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[13px] text-[#64748b]">
                    {draft.sourceFile ? (
                      <Badge variant="outline" className="rounded-xl border-[#d5dce0] bg-white text-[#475467]">
                        {draft.sourceFile}
                      </Badge>
                    ) : null}
                    {draft.sourceRowNumber ? (
                      <Badge variant="outline" className="rounded-xl border-[#d5dce0] bg-white text-[#475467]">
                        {tr("Ligne", "Row")} {draft.sourceRowNumber}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-[13px] text-[#8a4b00]">{draft.reason}</p>
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-[#dfe5e2] bg-white px-3 py-2 text-sm text-[#1f2937]">
                  <Checkbox
                    checked={draft.skip}
                    onCheckedChange={(checked) => handleSkipChange(draft.draftId, checked)}
                  />
                  {tr("Ignorer cette ligne", "Skip this row")}
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {EDITABLE_FIELDS.map((field) => (
                  <div key={`${draft.draftId}-${field.key}`} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[14px] font-medium text-[#171a1f]">{field.label}</p>
                      {field.required ? (
                        <Badge variant="outline" className="rounded-xl border-[#f1c59e] bg-[#fff7ed] text-[#8a4b00]">
                          {tr("Obligatoire", "Required")}
                        </Badge>
                      ) : null}
                    </div>
                    <Input
                      value={draft.values[field.key] ?? ""}
                      onChange={(event) => handleValueChange(draft.draftId, field.key, event.target.value)}
                      disabled={draft.skip}
                    />
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
            {tr("Ajouter ou ignorer", "Add or skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
