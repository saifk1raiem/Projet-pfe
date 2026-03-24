import { Fragment } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  MoreVertical,
  XCircle,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

const getStatusBadge = (statut) => {
  switch (statut) {
    case "Qualifie":
      return (
        <Badge className="w-fit rounded-lg border border-[#b9d3ea] bg-[#e8f1fb] px-3 py-1 text-[14px] font-medium text-[#005ca9]">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Qualifie
        </Badge>
      );
    case "En cours":
      return (
        <Badge className="w-fit rounded-lg border border-[#f1c59e] bg-[#fff2e4] px-3 py-1 text-[14px] font-medium text-[#fc6200]">
          <AlertCircle className="mr-1 h-3.5 w-3.5" />
          En cours
        </Badge>
      );
    case "Non associe":
    case "Non associee":
      return (
        <Badge className="w-fit rounded-lg border border-[#f2c4c4] bg-[#fdeeee] px-3 py-1 text-[14px] font-medium text-[#ea3737]">
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Non associee
        </Badge>
      );
    case "Depassement":
      return (
        <Badge className="w-fit rounded-lg border border-[#d9c2ff] bg-[#f3edff] px-3 py-1 text-[14px] font-medium text-[#7b35e8]">
          <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          Depassement
        </Badge>
      );
    default:
      return null;
  }
};

export function CollaborateursTable({
  rows,
  onViewDetails,
  selectedCollaborateur,
  onCloseDetails,
}) {
  return (
    <Card className="rounded-[20px] border border-[#dfe5e2] bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[15px] font-semibold text-[#252930]">Matricule</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Nom & Prenom</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Fonction SAP</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Qualification</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Date association</TableHead>
            <TableHead className="text-[15px] font-semibold text-[#252930]">Etat</TableHead>
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
                <TableCell className="text-[15px]">{collab.fonction}</TableCell>
                <TableCell className="text-[15px]">{collab.competence || "-"}</TableCell>
                <TableCell className="text-[15px]">{collab.date_association_systeme || "-"}</TableCell>
                <TableCell>{getStatusBadge(collab.statut)}</TableCell>
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
                        Voir details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              {selectedCollaborateur?.id === collab.id ? (
                <TableRow className="bg-[#f8fbff]">
                  <TableCell colSpan={7}>
                    <div className="rounded-xl border border-[#dfe5e2] bg-white p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[16px] font-semibold text-[#171a1f]">
                          {collab.nom} ({collab.matricule})
                        </p>
                        <Button variant="outline" className="h-8 rounded-xl px-3" onClick={onCloseDetails}>
                          Fermer
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Matricule</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.matricule}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Nom</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.nom}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Prenom</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.prenom}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Fonction SAP</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.fonction}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Centre de cout</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.centre_cout}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Groupe</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.groupe || "-"}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Qualification</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.competence || "-"}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Formateur</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.formateur || "-"}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Date association</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.date_association_systeme || "-"}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Date completion</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.date_completion || "-"}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Segment</p><p className="text-[15px] font-medium text-[#1d2025]">{collab.segment || "-"}</p></div>
                        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3"><p className="text-[12px] text-[#64748b]">Etat</p><div className="mt-1">{getStatusBadge(collab.statut)}</div></div>
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
