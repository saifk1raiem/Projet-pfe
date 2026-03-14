import { AlertCircle, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "../ui/badge";

export const getStatusBadge = (statut) => {
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
