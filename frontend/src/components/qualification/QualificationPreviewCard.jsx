import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export function QualificationPreviewCard({
  tr,
  previewRowsCount,
  previewError,
  previewErrorDetails,
  previewFileErrors,
  previewRows,
  previewColumnsDetected,
  previewMappingUsed,
  previewImportType,
  previewConflictsCount,
  canImport,
  isImporting,
  onImport,
  onReviewConflicts,
  importSummary,
  importError,
}) {
  const isCollaboratorImport = previewImportType === "collaborateurs";
  const hasPreviewRows = previewRows.length > 0;

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[20px] font-semibold text-[#171a1f]">
          {tr("Apercu Import", "Import Preview")}
        </h3>
        <Badge variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[14px]">
          {previewRowsCount} {tr("lignes", "rows")}
        </Badge>
      </div>

      {importSummary ? (
        <div className="mb-3 space-y-1 rounded-xl border border-[#b7ebcd] bg-[#ecfdf3] p-3 text-[#027a48]">
          <p className="text-sm font-medium">
            {tr("Import termine avec succes.", "Import completed successfully.")}
          </p>
          <p className="text-xs">
            {isCollaboratorImport ? (
              <>
                {tr("Lignes traitees", "Processed rows")}: {importSummary.rows_processed}.{" "}
                {tr("Ajoutees", "Inserted")}: {importSummary.rows_inserted}.{" "}
                {tr("Mises a jour", "Updated")}: {importSummary.rows_updated}.{" "}
                {tr("Ignorees", "Skipped")}: {importSummary.rows_skipped}.
              </>
            ) : (
              <>
                {tr("Collaborateurs", "Collaborators")}: +{importSummary.collaborators_inserted} / {importSummary.collaborators_updated} {tr("mis a jour", "updated")}.{" "}
                {tr("Qualifications", "Qualifications")}: +{importSummary.qualifications_inserted} / {importSummary.qualifications_updated} {tr("mises a jour", "updated")}.{" "}
                {tr("Ignorees", "Skipped")}: {importSummary.skipped}.
              </>
            )}
          </p>
        </div>
      ) : null}

      {importError ? (
        <div className="mb-3 rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
          {importError}
        </div>
      ) : null}

      {previewError ? (
        <div className="space-y-2 rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-[#8a1d1d]">
          <p className="text-sm font-medium">{previewError}</p>
          {previewErrorDetails?.headers_found?.length ? (
            <p className="text-xs">
              {tr("En-tetes detectes", "Detected headers")}: {previewErrorDetails.headers_found.join(", ")}
            </p>
          ) : null}
          {Array.isArray(previewErrorDetails?.file_errors) && previewErrorDetails.file_errors.length > 0 ? (
            <div className="text-xs">
              {previewErrorDetails.file_errors.map((item, idx) => (
                <p key={`${item.file}-${idx}`}>{item.file}: {item.error}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {previewFileErrors.length > 0 ? (
        <div className="mt-2 space-y-1 rounded-xl border border-[#f1c59e] bg-[#fff2e4] p-3 text-[#8a4b00]">
          {previewFileErrors.map((item, idx) => (
            <p key={`${item.file}-${idx}`} className="text-xs">
              {item.file}: {item.error}
            </p>
          ))}
        </div>
      ) : null}

      {previewConflictsCount > 0 ? (
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-[#f1c59e] bg-[#fff7ed] p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#8a4b00]">
              {previewConflictsCount} {tr("lignes demandent une verification", "rows need review")}
            </p>
            <p className="text-xs text-[#8a4b00]">
              {tr(
                "Le matricule existe deja avec des informations differentes. Corrigez les champs ou ignorez les lignes avant l'import.",
                "The employee ID already exists with different information. Fix the fields or skip the rows before import.",
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-[#f1c59e] bg-white text-[#8a4b00] hover:bg-[#fff1de]"
            onClick={onReviewConflicts}
          >
            {tr("Verifier les conflits", "Review conflicts")}
          </Button>
        </div>
      ) : null}

      {hasPreviewRows ? (
        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-[#dfe5e2] bg-[#f8fbff] p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#1f2937]">
              {canImport
                ? tr("Apercu pret pour import.", "Preview ready for import.")
                : tr("Apercu deja importe.", "Preview already imported.")}
            </p>
            <p className="text-xs text-[#5f6777]">
              {canImport
                ? (
                  isCollaboratorImport
                    ? tr(
                        "Verifiez les collaborateurs detectes puis appliquez-les a la base.",
                        "Review the detected collaborators, then apply them to the database.",
                      )
                    : tr(
                        "Verifiez les lignes puis importez-les explicitement dans la base.",
                        "Review the rows, then explicitly import them into the database.",
                      )
                )
                : tr(
                    "Chargez un nouveau fichier si vous voulez lancer un autre import.",
                    "Load a new file to start another import.",
                  )}
            </p>
          </div>
          <Button
            type="button"
            className="h-10 rounded-xl bg-[#005ca9] px-4 text-white hover:bg-[#004a87] disabled:opacity-60"
            disabled={!canImport || isImporting}
            onClick={onImport}
          >
            {isImporting
              ? tr("Import...", "Importing...")
              : (
                isCollaboratorImport
                  ? tr("Appliquer les collaborateurs", "Apply collaborators")
                  : tr("Importer dans la base", "Import into database")
              )}
          </Button>
        </div>
      ) : null}

      {hasPreviewRows ? (
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>matricule</TableHead>
                <TableHead>nom</TableHead>
                <TableHead>prenom</TableHead>
                <TableHead>fonction_sap</TableHead>
                {isCollaboratorImport ? <TableHead>centre_cout</TableHead> : null}
                {isCollaboratorImport ? <TableHead>groupe</TableHead> : null}
                <TableHead>{isCollaboratorImport ? "competence" : "qualification"}</TableHead>
                <TableHead>formateur</TableHead>
                {isCollaboratorImport ? <TableHead>contre_maitre</TableHead> : null}
                {isCollaboratorImport ? <TableHead>segment</TableHead> : null}
                {isCollaboratorImport ? <TableHead>gender</TableHead> : null}
                {isCollaboratorImport ? <TableHead>num_tel</TableHead> : null}
                {isCollaboratorImport ? <TableHead>date_recrutement</TableHead> : null}
                {isCollaboratorImport ? <TableHead>anciennete</TableHead> : null}
                {!isCollaboratorImport ? <TableHead>date_association</TableHead> : null}
                {!isCollaboratorImport ? <TableHead>date_completion</TableHead> : null}
                {!isCollaboratorImport ? <TableHead>motif</TableHead> : null}
                <TableHead>etat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, idx) => (
                <TableRow key={`${row.matricule || "row"}-${idx}`}>
                  <TableCell>{row.matricule || "-"}</TableCell>
                  <TableCell>{row.nom || "-"}</TableCell>
                  <TableCell>{row.prenom || "-"}</TableCell>
                  <TableCell>{row.fonction_sap || row.fonction || "-"}</TableCell>
                  {isCollaboratorImport ? <TableCell>{row.centre_cout || "-"}</TableCell> : null}
                  {isCollaboratorImport ? <TableCell>{row.groupe || "-"}</TableCell> : null}
                  <TableCell>{row.competence || "-"}</TableCell>
                  <TableCell>{row.formateur || "-"}</TableCell>
                  {isCollaboratorImport ? <TableCell>{row.contre_maitre || "-"}</TableCell> : null}
                  {isCollaboratorImport ? <TableCell>{row.segment || "-"}</TableCell> : null}
                  {isCollaboratorImport ? <TableCell>{row.gender || "-"}</TableCell> : null}
                  {isCollaboratorImport ? <TableCell>{row.num_tel || "-"}</TableCell> : null}
                  {isCollaboratorImport ? <TableCell>{row.date_recrutement || "-"}</TableCell> : null}
                  {isCollaboratorImport ? <TableCell>{row.anciennete ?? "-"}</TableCell> : null}
                  {!isCollaboratorImport ? <TableCell>{row.date_association_systeme || "-"}</TableCell> : null}
                  {!isCollaboratorImport ? <TableCell>{row.date_completion || "-"}</TableCell> : null}
                  {!isCollaboratorImport ? <TableCell>{row.motif || "-"}</TableCell> : null}
                  <TableCell>{row.etat || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#5f6777]">
          {tr(
            "Aucun apercu. Importez un fichier XLSX, XLS ou CSV pour afficher les lignes.",
            "No preview yet. Upload an XLSX, XLS, or CSV file to display rows.",
          )}
        </p>
      )}

      {previewColumnsDetected.length > 0 ? (
        <p className="mt-3 text-xs text-[#5f6777]">
          {tr("Colonnes detectees", "Detected columns")}: {previewColumnsDetected.join(", ")}
        </p>
      ) : null}
      {Object.keys(previewMappingUsed).length > 0 ? (
        <p className="mt-1 text-xs text-[#5f6777]">
          {tr("Mapping", "Mapping")}:{" "}
          {Object.entries(previewMappingUsed)
            .map(([field, header]) => `${field} -> ${header}`)
            .join(", ")}
        </p>
      ) : null}
    </Card>
  );
}
