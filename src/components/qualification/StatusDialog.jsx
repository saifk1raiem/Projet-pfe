import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export function StatusDialog({
  tr,
  isOpen,
  onOpenChange,
  collaborateurToUpdateStatus,
  statusDraft,
  onStatusDraftChange,
  statutOptions,
  onUpdateStatus,
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tr("Changer le statut", "Change status")}</AlertDialogTitle>
          <AlertDialogDescription>
            {collaborateurToUpdateStatus
              ? `Selectionnez le nouveau statut pour ${collaborateurToUpdateStatus.nom}.`
              : tr("Selectionnez un statut.", "Select a status.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="status-select-qualification" className="text-sm font-medium text-[#252930]">
            {tr("Statut", "Status")}
          </label>
          <select
            id="status-select-qualification"
            className="h-10 w-full rounded-md border border-[#d5dce0] bg-white px-3 text-sm outline-none focus:border-[#0f63f2]"
            value={statusDraft}
            onChange={(e) => onStatusDraftChange(e.target.value)}
          >
            {statutOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{tr("Annuler", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onUpdateStatus}>{tr("Enregistrer", "Save")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
