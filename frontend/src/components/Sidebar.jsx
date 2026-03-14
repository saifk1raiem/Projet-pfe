import {
  LayoutDashboard,
  BookOpen,
  Award,
  RefreshCcw,
  GraduationCap,
  Users,
  UserRoundCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "./ui/utils";
import { useAppPreferences } from "../context/AppPreferencesContext";
import { appConfig } from "../lib/config";

const navigationItems = [
  {
    id: "dashboard",
    nameFr: "Tableau de bord",
    nameEn: "Dashboard",
    subtitleFr: "Vue d'ensemble",
    subtitleEn: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "formation",
    nameFr: "Formation",
    nameEn: "Training",
    subtitleFr: "Gestion des formations",
    subtitleEn: "Training management",
    icon: BookOpen,
  },
  {
    id: "qualification",
    nameFr: "Qualification",
    nameEn: "Qualification",
    subtitleFr: "Suivi des qualifications",
    subtitleEn: "Qualification tracking",
    icon: Award,
  },
  {
    id: "requalification",
    nameFr: "Requalification",
    nameEn: "Requalification",
    subtitleFr: "Gestion requalification",
    subtitleEn: "Requalification management",
    icon: RefreshCcw,
  },
  {
    id: "formateurs",
    nameFr: "Formateurs",
    nameEn: "Trainers",
    subtitleFr: "Liste des formateurs",
    subtitleEn: "Trainer list",
    icon: GraduationCap,
  },
  {
    id: "collaborateurs",
    nameFr: "Collaborateurs",
    nameEn: "Collaborators",
    subtitleFr: "Gestion collaborateurs",
    subtitleEn: "Collaborator management",
    icon: Users,
  },
  {
    id: "advisors",
    nameFr: "Advisors",
    nameEn: "Advisors",
    subtitleFr: "Gestion des advisors",
    subtitleEn: "Advisors management",
    icon: UserRoundCheck,
  },
  {
    id: "statistiques",
    nameFr: "Statistiques",
    nameEn: "Statistics",
    subtitleFr: "Bientot disponible",
    subtitleEn: "Coming soon",
    icon: BarChart3,
  },
  {
    id: "parametres",
    nameFr: "Parametres",
    nameEn: "Settings",
    subtitleFr: "Configuration systeme",
    subtitleEn: "System configuration",
    icon: Settings,
  },
];

export function Sidebar({
  currentPage,
  onPageChange,
  compact = false,
  onToggleCompact,
  onSignOut,
  currentUser,
}) {
  const { tr } = useAppPreferences();
  const fullName = currentUser
    ? `${currentUser.first_name ?? ""} ${currentUser.last_name ?? ""}`.trim()
    : "User";
  const initials = currentUser
    ? `${(currentUser.first_name ?? "").charAt(0)}${(currentUser.last_name ?? "").charAt(0)}`.toUpperCase()
    : "U";
  const roleLabel = currentUser?.role
    ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
    : tr("Utilisateur", "User");

  return (
    <aside
      className={cn(
        "leoni-sidebar overflow-hidden",
        compact ? "w-[92px] px-3 py-4" : "w-[280px] px-4 py-4",
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        {compact ? (
          <div className="mb-4">
            <div className="mb-2 flex justify-end">
              <button
                onClick={onToggleCompact}
                aria-label={tr("Ouvrir la barre laterale", "Open sidebar")}
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
                aria-label={tr("Fermer la barre laterale", "Collapse sidebar")}
                className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#7ae094] text-[#2b6d56] shadow-[0_8px_18px_rgba(122,224,148,0.35)]">
              <GraduationCap className="h-7 w-7" />
            </div>
            <p className="leoni-display-lg text-[31px] font-semibold tracking-[0.01em] text-[#f2f8f4]">
              {appConfig.companyName}
            </p>
            <p className="mt-1 text-[13px] text-[#cde0d6]">{tr("Gestion de Formation", "Training Management")}</p>
          </div>
        )}

        <nav
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
                      {tr(item.nameFr, item.nameEn)}
                    </p>
                    <p
                      className={cn(
                        "text-[13px]",
                        isActive ? "text-[#356a57]" : "text-[#cde0d6]",
                      )}
                    >
                      {tr(item.subtitleFr, item.subtitleEn)}
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
                {initials}
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={onSignOut}
                aria-label={tr("Se deconnecter", "Sign out")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-[#f2f8f4] transition-colors hover:bg-white/24"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 text-center">
            <p className="text-[16px] font-medium text-[#f2f8f4]">{fullName}</p>
            <p className="text-[13px] text-[#cde0d6]">{roleLabel}</p>
            <div className="mt-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7ae094] text-[22px] font-semibold text-[#2b6d56]">
                {initials}
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-white/12 px-4 text-[14px] font-medium text-[#f2f8f4] transition-colors hover:bg-white/24"
            >
              <LogOut className="h-4 w-4" />
              {tr("Se deconnecter", "Sign out")}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
