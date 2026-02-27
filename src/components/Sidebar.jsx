import {
  LayoutDashboard,
  BookOpen,
  Award,
  RefreshCcw,
  GraduationCap,
  Users,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { cn } from "./ui/utils";

const navigationItems = [
  {
    id: "dashboard",
    name: "Tableau de bord",
    subtitle: "Vue d'ensemble",
    compactSubtitle: "Vue d'ensemble",
    icon: LayoutDashboard,
  },
  {
    id: "formation",
    name: "Formation",
    subtitle: "Gestion des formations",
    compactSubtitle: "Formation",
    icon: BookOpen,
  },
  {
    id: "qualification",
    name: "Qualification",
    subtitle: "Suivi des qualifications",
    compactSubtitle: "Qualification",
    icon: Award,
  },
  {
    id: "requalification",
    name: "Requalification",
    subtitle: "Gestion requalification",
    compactSubtitle: "Requalif.",
    icon: RefreshCcw,
  },
  {
    id: "formateurs",
    name: "Formateurs",
    subtitle: "Liste des formateurs",
    compactSubtitle: "Formateurs",
    icon: GraduationCap,
  },
  {
    id: "collaborateurs",
    name: "Collaborateurs",
    subtitle: "Gestion collaborateurs",
    compactSubtitle: "Collaborateurs",
    icon: Users,
  },
  {
    id: "statistiques",
    name: "Statistiques",
    subtitle: "Analyses et rapports",
    compactSubtitle: "Statistiques",
    icon: BarChart3,
  },
  {
    id: "parametres",
    name: "Paramètres",
    subtitle: "Configuration système",
    compactSubtitle: "Paramètres",
    icon: Settings,
  },
];

export function Sidebar({ currentPage, onPageChange, compact = false }) {
  return (
    <aside
      className={cn(
        "leoni-sidebar",
        compact ? "w-[86px] px-3 py-4" : "w-[280px] p-4",
      )}
    >
      <div className="flex h-full flex-col">
        {compact ? (
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#7ae094] text-[#2b6d56] shadow-[0_8px_18px_rgba(122,224,148,0.35)]">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>
        ) : (
          <div className="mb-6 flex flex-col items-center">
            <div className="relative mb-4 w-full">
              <button className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#7ae094] text-[#2b6d56] shadow-[0_8px_18px_rgba(122,224,148,0.35)]">
              <GraduationCap className="h-7 w-7" />
            </div>
            <p className="text-[31px] font-semibold tracking-[0.01em] text-[#f2f8f4]">LEONI</p>
            <p className="mt-1 text-[13px] text-[#cde0d6]">Gestion de Formation</p>
          </div>
        )}

        <nav className={cn("flex-1", compact ? "space-y-3" : "space-y-4")}>
          {navigationItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  "leoni-nav-item group relative w-full",
                  compact
                    ? "flex h-12 items-center justify-center rounded-full"
                    : "flex min-h-[56px] items-center rounded-[16px] px-4",
                  isActive ? "is-active" : "",
                )}
              >
                <Icon className={cn(compact ? "h-5 w-5" : "h-5 w-5 shrink-0")} />

                {!compact && (
                  <div className="ml-4 text-left">
                    <p className={cn("text-[16px] font-medium", isActive ? "text-[#1f5240]" : "text-[#f2f7f3]")}>{item.name}</p>
                    <p className={cn("text-[13px]", isActive ? "text-[#356a57]" : "text-[#cde0d6]")}>{item.subtitle}</p>
                  </div>
                )}

                {!compact && isActive && <span className="ml-auto h-3 w-3 rounded-full bg-[#356a57]/80" />}
              </button>
            );
          })}
        </nav>

        {compact ? (
          <div className="pt-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7ae094] text-[22px] font-semibold text-[#2b6d56]">
              LG
            </div>
          </div>
        ) : (
          <div className="pt-4 text-center">
            <p className="text-[16px] font-medium text-[#f2f8f4]">Liam Gallagher</p>
            <p className="text-[13px] text-[#cde0d6]">System Administrator</p>
            <div className="mt-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7ae094] text-[22px] font-semibold text-[#2b6d56]">
                LG
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

