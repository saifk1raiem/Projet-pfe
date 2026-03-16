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

export function DeleteCollaborateurDialog({
  tr,
  isOpen,
  onOpenChange,
  collaborateurToDelete,
  onDeleteCollaborateur,
  isDeleting,
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tr("Supprimer ce collaborateur ?", "Delete this collaborator?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {collaborateurToDelete
              ? `Cette action supprimera ${collaborateurToDelete.nom} de la liste.`
              : tr("Cette action est irreversible.", "This action is irreversible.")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{tr("Annuler", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-[#ea3737] hover:bg-[#d12f2f]"
            disabled={isDeleting}
            onClick={onDeleteCollaborateur}
          >
            {isDeleting ? tr("Suppression...", "Deleting...") : tr("Supprimer", "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
