import { Loader2 } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export function FormationsDialog({
  tr,
  isOpen,
  collaborateur,
  formationsHistory,
  formationsHistoryLoading,
  formationsHistoryError,
  onClose,
  onOpenFormationDetails,
}) {
  if (!isOpen || !collaborateur) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="leoni-rise-up flex h-[88vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-[24px] border border-[#dfe5e2] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#e2e8f0] px-7 py-5">
          <div>
            <h2 className="leoni-display-lg text-[30px] font-semibold leading-tight text-[#171a1f]">
              {tr("Formations du collaborateur", "Collaborator training history")}
            </h2>
            <p className="mt-1 text-[15px] text-[#64748b]">
              {collaborateur.nom} ({collaborateur.matricule}) - {collaborateur.formations} formations
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            {tr("Fermer", "Close")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          {formationsHistoryError ? (
            <div className="rounded-xl border border-[#f2c4c4] bg-[#fdeeee] p-3 text-sm text-[#8a1d1d]">
              {formationsHistoryError}
            </div>
          ) : null}

          {formationsHistoryLoading ? (
            <div className="flex items-center gap-2 text-sm text-[#5f6777]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr("Chargement des formations...", "Loading trainings...")}
            </div>
          ) : null}

          {!formationsHistoryLoading && !formationsHistoryError && formationsHistory.length === 0 ? (
            <p className="text-sm text-[#5f6777]">
              {tr("Aucune formation trouvee pour ce collaborateur.", "No trainings found for this collaborator.")}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {formationsHistory.map((formation) => (
              <Card key={formation.id} className="rounded-2xl border border-[#dfe5e2] bg-[#fbfdff] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[20px] font-semibold text-[#191c20]">
                      {formation.code} - {formation.titre}
                    </h3>
                    <p className="mt-1 text-[14px] text-[#64748b]">{formation.type}</p>
                    <p className="mt-1 text-[13px] text-[#475467]">
                      {tr("Formateur", "Trainer")}: {formation.formateur || "-"}
                    </p>
                    <p className="mt-1 text-[13px] text-[#475467]">
                      {tr("Motif", "Reason")}: {formation.motif || "-"}
                    </p>
                  </div>
                  <Badge className="rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[13px] font-medium text-[#005ca9]">
                    {formation.resultat}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                    <p className="text-[12px] text-[#64748b]">{tr("Date", "Date")}</p>
                    <p className="text-[14px] font-medium text-[#1d2025]">{formation.date || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-[#e2e8f0] bg-white p-3">
                    <p className="text-[12px] text-[#64748b]">{tr("Duree", "Duration")}</p>
                    <p className="text-[14px] font-medium text-[#1d2025]">
                      {formation.duree ? tr(`${formation.duree} jours`, `${formation.duree} days`) : "-"}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-4 h-10 rounded-xl bg-[#005ca9] text-white hover:bg-[#004a87]"
                  onClick={() => onOpenFormationDetails(formation)}
                >
                  {tr("Voir details formation", "Open training details")}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
