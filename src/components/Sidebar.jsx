import {
  LayoutDashboard,
  BookOpen,
  Award,
  RefreshCcw,
  GraduationCap,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
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

export function Sidebar({
  currentPage,
  onPageChange,
  compact = false,
  onToggleCompact,
  onSignOut,
}) {
  return (
    <aside
      className={cn(
        "leoni-sidebar overflow-hidden transition-[width,padding] duration-300 ease-in-out",
        compact ? "w-[86px] px-3 py-4" : "w-[280px] p-4",
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        {compact ? (
          <div className="mb-4">
            <div className="mb-2 flex justify-end">
              <button
                onClick={onToggleCompact}
                aria-label="Ouvrir la barre latérale"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#7ae094] text-[#2b6d56] shadow-[0_8px_18px_rgba(122,224,148,0.35)]">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex flex-col items-center">
            <div className="relative mb-4 w-full">
              <button
                onClick={onToggleCompact}
                aria-label="Fermer la barre latérale"
                className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#7ae094] text-[#2b6d56] shadow-[0_8px_18px_rgba(122,224,148,0.35)]">
              <GraduationCap className="h-7 w-7" />
            </div>
            <p className="text-[31px] font-semibold tracking-[0.01em] text-[#f2f8f4]">
              LEONI
            </p>
            <p className="mt-1 text-[13px] text-[#cde0d6]">Gestion de Formation</p>
          </div>
        )}

        <nav
          key={compact ? "sidebar-compact-nav" : "sidebar-expanded-nav"}
          className={cn(
            "leoni-sidebar-scroll flex-1 min-h-0 overflow-x-hidden overflow-y-auto",
            compact ? "space-y-3" : "space-y-4 pr-1",
          )}
        >
          {navigationItems.map((item, index) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                style={{ "--item-index": index }}
                className={cn(
                  "leoni-nav-item group relative w-full",
                  !compact ? "leoni-nav-item-anim" : "",
                  compact
                    ? "flex h-12 items-center justify-center rounded-full"
                    : "flex min-h-[56px] items-center rounded-[16px] px-4",
                  isActive ? "is-active" : "",
                )}
              >
                <Icon className={cn(compact ? "h-5 w-5" : "h-5 w-5 shrink-0")} />

                {!compact && (
                  <div className="ml-4 text-left">
                    <p
                      className={cn(
                        "text-[16px] font-medium",
                        isActive ? "text-[#1f5240]" : "text-[#f2f7f3]",
                      )}
                    >
                      {item.name}
                    </p>
                    <p
                      className={cn(
                        "text-[13px]",
                        isActive ? "text-[#356a57]" : "text-[#cde0d6]",
                      )}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                )}

                {!compact && isActive && (
                  <span className="active-indicator ml-auto h-3 w-3 rounded-full bg-[#356a57]/80" />
                )}
              </button>
            );
          })}
        </nav>

        {compact ? (
          <div className="space-y-3 pt-4">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7ae094] text-[22px] font-semibold text-[#2b6d56]">
                LG
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={onSignOut}
                aria-label="Se déconnecter"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-[#f2f8f4] transition-colors hover:bg-white/24"
              >
                <LogOut className="h-4 w-4" />
              </button>
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
            <button
              onClick={onSignOut}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-white/12 px-4 text-[14px] font-medium text-[#f2f8f4] transition-colors hover:bg-white/24"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
