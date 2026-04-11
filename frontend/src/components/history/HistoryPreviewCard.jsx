import { AlertTriangle, CheckCircle2, Database, RefreshCcw } from "lucide-react";

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


export function HistoryPreviewCard({
  tr,
  previewRows,
  previewRowsCount,
  validRowsCount,
  invalidRowsCount,
  insertRowsCount,
  updateRowsCount,
  previewColumnsDetected,
  previewMappingUsed,
  previewError,
  importSummary,
  importError,
  isImporting,
  canImport,
  onImport,
}) {
  const visibleRows = previewRows.slice(0, 10);

  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-[24px] font-semibold text-[#171a1f]">
            {tr("Apercu Historique", "History Preview")}
          </h2>
          <p className="mt-1 text-sm text-[#5d6574]">
            {tr(
              "Les 10 premieres lignes sont affichees. Les lignes invalides sont surlignees en rouge.",
              "The first 10 rows are shown. Invalid rows are highlighted in red.",
            )}
          </p>
        </div>

        <Button
          type="button"
          className="h-10 rounded-xl bg-[#005ca9] px-4 text-white hover:bg-[#004a87] disabled:opacity-60"
          disabled={!canImport || isImporting}
          onClick={onImport}
        >
          {isImporting ? (
            <>
              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              {tr("Import...", "Importing...")}
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              {tr("Importer", "Import")}
            </>
          )}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[13px]">
          {previewRowsCount} {tr("lignes", "rows")}
        </Badge>
        <Badge variant="outline" className="rounded-xl border-[#b7ebcd] bg-[#ecfdf3] text-[13px] text-[#027a48]">
          {validRowsCount} {tr("valides", "valid")}
        </Badge>
        <Badge variant="outline" className="rounded-xl border-[#f2c4c4] bg-[#fff1f1] text-[13px] text-[#b42318]">
          {invalidRowsCount} {tr("invalides", "invalid")}
        </Badge>
        <Badge variant="outline" className="rounded-xl border-[#d7e6f5] bg-[#f5f9ff] text-[13px] text-[#005ca9]">
          {insertRowsCount} {tr("nouveaux", "new")}
        </Badge>
        <Badge variant="outline" className="rounded-xl border-[#f1c59e] bg-[#fff7ed] text-[13px] text-[#b45309]">
          {updateRowsCount} {tr("mises a jour", "updates")}
        </Badge>
      </div>

      {importSummary ? (
        <div className="mt-4 rounded-xl border border-[#b7ebcd] bg-[#ecfdf3] p-3 text-sm text-[#027a48]">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            {tr("Import termine avec succes.", "Import completed successfully.")}
          </div>
          <p className="mt-1 text-xs">
            {tr("Lignes traitees", "Processed rows")}: {importSummary.rows_processed}.{" "}
            {tr("Ajoutees", "Inserted")}: {importSummary.rows_inserted}.{" "}
            {tr("Mises a jour", "Updated")}: {importSummary.rows_updated}.{" "}
            {tr("Ignorees", "Skipped")}: {importSummary.rows_skipped}.
          </p>
        </div>
      ) : null}

      {previewError ? (
        <div className="mt-4 rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
          {previewError}
        </div>
      ) : null}

      {importError ? (
        <div className="mt-4 rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
          {importError}
        </div>
      ) : null}

      {visibleRows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>matricule</TableHead>
                <TableHead>{tr("Collaborateur", "Collaborator")}</TableHead>
                <TableHead>{tr("Date", "Date")}</TableHead>
                <TableHead>Nature</TableHead>
                <TableHead>Entree_sorie</TableHead>
                <TableHead>Heures_de_présences</TableHead>
                <TableHead>HEURS_SUP</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>{tr("Action", "Action")}</TableHead>
                <TableHead>{tr("Erreurs", "Errors")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((item, index) => (
                <TableRow
                  key={`${item.row.matricule || "row"}-${item.row_index}-${index}`}
                  className={item.is_valid ? "" : "bg-[#fff1f1] hover:bg-[#ffe4e4]"}
                >
                  <TableCell className="font-medium text-[#171a1f]">{item.row.matricule || "-"}</TableCell>
                  <TableCell>{item.collaborateur_nom || "-"}</TableCell>
                  <TableCell>{item.display_date || "-"}</TableCell>
                  <TableCell>{item.row.nature || "-"}</TableCell>
                  <TableCell>{item.row.entree_sorie || "-"}</TableCell>
                  <TableCell>{item.row.heures_de_presences ?? "-"}</TableCell>
                  <TableCell>{item.row.heurs_sup ?? "-"}</TableCell>
                  <TableCell>{item.row.motif || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        item.import_action === "insert"
                          ? "rounded-xl border-[#d7e6f5] bg-[#f5f9ff] text-[#005ca9]"
                          : item.import_action === "update"
                            ? "rounded-xl border-[#f1c59e] bg-[#fff7ed] text-[#b45309]"
                            : "rounded-xl border-[#f2c4c4] bg-[#fff1f1] text-[#b42318]"
                      }
                    >
                      {item.import_action === "insert"
                        ? tr("Ajouter", "Insert")
                        : item.import_action === "update"
                          ? tr("Mettre a jour", "Update")
                          : tr("Invalide", "Invalid")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] text-sm text-[#8a1d1d]">
                    {item.errors.length > 0 ? (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{item.errors.join(", ")}</span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#5d6574]">
          {tr(
            "Aucun apercu disponible. Importez un fichier XLSX pour afficher les lignes.",
            "No preview available yet. Upload an XLSX file to display rows.",
          )}
        </p>
      )}

      {previewColumnsDetected.length > 0 ? (
        <p className="mt-4 text-xs text-[#5f6777]">
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
