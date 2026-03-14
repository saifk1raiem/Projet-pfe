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
  canImport,
  isImporting,
  onImport,
  importSummary,
  importError,
}) {
  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[20px] font-semibold text-[#171a1f]">
          {tr("Apercu Qualification", "Qualification Preview")}
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
            {tr("Collaborateurs", "Collaborators")}: +{importSummary.collaborators_inserted} / {importSummary.collaborators_updated} {tr("mis a jour", "updated")}.
            {" "}
            {tr("Qualifications", "Qualifications")}: +{importSummary.qualifications_inserted} / {importSummary.qualifications_updated} {tr("mises a jour", "updated")}.
            {" "}
            {tr("Ignorees", "Skipped")}: {importSummary.skipped}.
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

      {previewRows.length > 0 ? (
        <div className="mb-3 flex flex-col gap-3 rounded-xl border border-[#dfe5e2] bg-[#f8fbff] p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#1f2937]">
              {canImport
                ? tr("Apercu pret pour import.", "Preview ready for import.")
                : tr("Apercu deja importe.", "Preview already imported.")}
            </p>
            <p className="text-xs text-[#5f6777]">
              {canImport
                ? tr(
                    "Verifiez les lignes puis importez-les explicitement dans la base.",
                    "Review the rows, then explicitly import them into the database.",
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
            {isImporting ? tr("Import...", "Importing...") : tr("Importer dans la base", "Import into database")}
          </Button>
        </div>
      ) : null}

      {previewRows.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>matricule</TableHead>
                <TableHead>nom</TableHead>
                <TableHead>prenom</TableHead>
                <TableHead>fonction_sap</TableHead>
                <TableHead>centre_cout</TableHead>
                <TableHead>groupe</TableHead>
                <TableHead>competence</TableHead>
                <TableHead>formateur</TableHead>
                <TableHead>contre_maitre</TableHead>
                <TableHead>segment</TableHead>
                <TableHead>gender</TableHead>
                <TableHead>num_tel</TableHead>
                <TableHead>date_recrutement</TableHead>
                <TableHead>anciennete</TableHead>
                <TableHead>etat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, idx) => (
                <TableRow key={`${row.matricule || "row"}-${idx}`}>
                  <TableCell>{row.matricule || "-"}</TableCell>
                  <TableCell>{row.nom || "-"}</TableCell>
                  <TableCell>{row.prenom || "-"}</TableCell>
                  <TableCell>{row.fonction || "-"}</TableCell>
                  <TableCell>{row.centre_cout || "-"}</TableCell>
                  <TableCell>{row.groupe || "-"}</TableCell>
                  <TableCell>{row.competence || "-"}</TableCell>
                  <TableCell>{row.formateur || "-"}</TableCell>
                  <TableCell>{row.contre_maitre || "-"}</TableCell>
                  <TableCell>{row.segment || "-"}</TableCell>
                  <TableCell>{row.gender || "-"}</TableCell>
                  <TableCell>{row.num_tel || "-"}</TableCell>
                  <TableCell>{row.date_recrutement || "-"}</TableCell>
                  <TableCell>{row.anciennete ?? "-"}</TableCell>
                  <TableCell>{row.etat || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#5f6777]">
          {tr("Aucun apercu. Importez un fichier Excel pour afficher les lignes.", "No preview yet. Upload an Excel file to display rows.")}
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
