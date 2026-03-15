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
  collaborateur,
  statusDraft,
  onStatusDraftChange,
  onSubmit,
  statutOptions,
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tr("Changer le statut", "Change status")}</AlertDialogTitle>
          <AlertDialogDescription>
            {collaborateur
              ? `Selectionnez le nouveau statut pour ${collaborateur.nom}.`
              : tr("Selectionnez un statut.", "Select a status.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="status-select" className="text-sm font-medium text-[#252930]">
            {tr("Statut", "Status")}
          </label>
          <select
            id="status-select"
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
          <AlertDialogAction onClick={onSubmit}>{tr("Enregistrer", "Save")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
