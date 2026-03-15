import { Loader2 } from "lucide-react";

import { formatDisplayDate } from "../collaborateurs/helpers";
import { getStatusBadge } from "../collaborateurs/statusBadge";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export function CollaborateursDialog({
  tr,
  isOpen,
  formateur,
  collaborateurs,
  collaborateursLoading,
  collaborateursError,
  onClose,
}) {
  if (!isOpen || !formateur) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="leoni-rise-up flex h-[88vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-[24px] border border-[#dfe5e2] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#e2e8f0] px-7 py-5">
          <div>
            <h2 className="leoni-display-lg text-[30px] font-semibold leading-tight text-[#171a1f]">
              {tr("Liste des collaborateurs", "Collaborator list")}
            </h2>
            <p className="mt-1 text-[15px] text-[#64748b]">
              {formateur.nom} - {collaborateurs.length} {tr("associations", "associations")}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {collaborateursError ? (
            <div className="rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
              {collaborateursError}
            </div>
          ) : null}

          {collaborateursLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#5f6777]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr("Chargement des collaborateurs...", "Loading collaborators...")}
            </div>
          ) : null}

          {!collaborateursLoading && !collaborateursError && collaborateurs.length === 0 ? (
            <p className="text-sm text-[#5f6777]">
              {tr("Aucun collaborateur trouve pour ce formateur.", "No collaborators found for this trainer.")}
            </p>
          ) : null}

          {!collaborateursLoading && !collaborateursError && collaborateurs.length > 0 ? (
            <div className="rounded-2xl border border-[#dfe5e2] bg-[#fbfdff]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[15px] font-semibold text-[#252930]">Matricule</TableHead>
                    <TableHead className="text-[15px] font-semibold text-[#252930]">
                      {tr("Nom & Prenom", "Name")}
                    </TableHead>
                    <TableHead className="text-[15px] font-semibold text-[#252930]">
                      {tr("Departement", "Department")}
                    </TableHead>
                    <TableHead className="text-[15px] font-semibold text-[#252930]">
                      {tr("Poste", "Role")}
                    </TableHead>
                    <TableHead className="text-[15px] font-semibold text-[#252930]">
                      {tr("Formation", "Training")}
                    </TableHead>
                    <TableHead className="text-[15px] font-semibold text-[#252930]">Statut</TableHead>
                    <TableHead className="text-[15px] font-semibold text-[#252930]">
                      {tr("Date d'association", "Association date")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collaborateurs.map((collaborateur) => (
                    <TableRow key={collaborateur.id}>
                      <TableCell className="font-medium text-[#252930]">{collaborateur.matricule || "-"}</TableCell>
                      <TableCell className="text-[#252930]">
                        {`${collaborateur.nom || ""} ${collaborateur.prenom || ""}`.trim() || "-"}
                      </TableCell>
                      <TableCell className="text-[#5f6777]">{collaborateur.departement || "-"}</TableCell>
                      <TableCell className="text-[#5f6777]">{collaborateur.poste || "-"}</TableCell>
                      <TableCell className="text-[#252930]">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {collaborateur.formation_code || "-"}
                            {collaborateur.formation_titre ? ` - ${collaborateur.formation_titre}` : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(collaborateur.statut) || (
                          <span className="text-sm text-[#5f6777]">{collaborateur.statut || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#5f6777]">
                        {formatDisplayDate(collaborateur.date_association)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
