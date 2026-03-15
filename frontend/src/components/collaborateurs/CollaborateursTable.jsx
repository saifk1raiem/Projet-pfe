import { Fragment } from "react";
import { BookOpen, Eye, Link2, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { getStatusBadge } from "./statusBadge";

export function CollaborateursTable({
  rows,
  selectedCollaborateur,
  onViewDetails,
  onCloseDetails,
  onViewFormations,
  onOpenAssociate,
  onOpenStatus,
  onAskDelete,
  canManage,
  tr,
}) {
  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[15px] font-semibold text-[#252930]">Matricule</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Nom & Prenom</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Departement</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Poste</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Date d'entree</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Statut</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Formations</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Derniere formation</TableHead>
            <TableHead className="text-right text-[15px] font-semibold text-[#252930]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((collab) => (
            <Fragment key={collab.id}>
              <TableRow className="h-16">
                <TableCell className="text-[15px] font-semibold text-[#1d2025]">{collab.matricule}</TableCell>
                <TableCell>
                  <div className="text-[15px] font-medium text-[#1d2025]">{collab.nom}</div>
                  <div className="text-[13px] text-[#6b7280]">{collab.prenom}</div>
                </TableCell>
                <TableCell className="text-[15px]">{collab.departement}</TableCell>
                <TableCell className="text-[15px]">{collab.poste}</TableCell>
                <TableCell className="text-[15px]">{collab.dateEntree}</TableCell>
                <TableCell>{getStatusBadge(collab.statut)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-xl border-[#d5dce0] bg-[#f7f8f9] text-[14px]">
                    {collab.formations} formations
                  </Badge>
                </TableCell>
                <TableCell className="text-[15px]">{collab.derniereFormation}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 rounded-lg p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => onViewDetails(collab)}>
                        <Eye className="h-4 w-4" />
                        {tr("Voir details", "View details")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onViewFormations(collab)}>
                        <BookOpen className="h-4 w-4" />
                        {tr("Voir formations", "View trainings")}
                      </DropdownMenuItem>
                      {canManage ? (
                        <>
                          <DropdownMenuItem onClick={() => onOpenAssociate(collab)}>
                            <Link2 className="h-4 w-4" />
                            {tr("Associer formation", "Assign training")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onOpenStatus(collab)}>
                            <Pencil className="h-4 w-4" />
                            {tr("Changer statut", "Change status")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => onAskDelete(collab)}>
                            <Trash2 className="h-4 w-4" />
                            {tr("Supprimer", "Delete")}
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              {selectedCollaborateur?.id === collab.id ? (
                <TableRow className="bg-[#f8fbff]">
                  <TableCell colSpan={9}>
                    <div className="rounded-xl border border-[#dfe5e2] bg-white p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[16px] font-semibold text-[#171a1f]">
                          {collab.nom} ({collab.matricule})
                        </p>
                        <Button variant="outline" className="h-8 rounded-xl px-3" onClick={onCloseDetails}>
                          {tr("Fermer", "Close")}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Matricule</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.matricule}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Nom</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.nom}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Prenom</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.prenom}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Departement</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.departement}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Poste</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.poste}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Date d'entree</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.dateEntree}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Formations</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.formations}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Derniere formation</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.derniereFormation}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Statut</p><div className="mt-1">{getStatusBadge(collab.statut)}</div></div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
