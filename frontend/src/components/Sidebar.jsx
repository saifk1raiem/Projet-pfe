import {
  LayoutDashboard,
  BookOpen,
  Award,
  Database,
  RefreshCcw,
  GraduationCap,
  Users,
  UserRoundCheck,
  BarChart3,
  Wrench,
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
    id: "historique",
    nameFr: "Historique",
    nameEn: "History",
    subtitleFr: "Import historique",
    subtitleEn: "History import",
    icon: Database,
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
    id: "tools",
    nameFr: "Tools",
    nameEn: "Tools",
    subtitleFr: "Outils intelligents",
    subtitleEn: "Smart tools",
    icon: Wrench,
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
  onProfileClick,
  currentUser,
}) {
  const { tr } = useAppPreferences();
  const fullNameFromNames = currentUser
    ? `${currentUser.first_name ?? ""} ${currentUser.last_name ?? ""}`.trim()
    : "";
  const displayName = currentUser?.username?.trim() || fullNameFromNames || tr("Utilisateur", "User");
  const initialsSource = displayName || fullNameFromNames || "U";
  const initials = initialsSource
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";
  const roleLabel =
    currentUser?.role === "super_admin"
      ? tr("Super administrateur", "Super admin")
      : currentUser?.role === "admin"
        ? tr("Administrateur", "Administrator")
        : tr("Observateur", "Observer");

  const renderProfileAvatar = (sizeClass, textClass) => (
    <div className={`flex ${sizeClass} items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#7ae094] ${textClass} text-[#2b6d56]`}>
      {currentUser?.avatar_url ? (
        <img src={currentUser.avatar_url} alt={displayName} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );

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
              <img
                src="/leoni-icon.svg"
                alt="LEONI"
                className="h-14 w-14 rounded-[18px] object-cover shadow-[0_8px_18px_rgba(15,99,242,0.35)]"
              />
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
            <img
              src="/leoni-icon.svg"
              alt="LEONI"
              className="mb-3 h-14 w-14 rounded-[18px] object-cover shadow-[0_8px_18px_rgba(15,99,242,0.35)]"
            />
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
              <button
                type="button"
                onClick={onProfileClick}
                aria-label={tr("Ouvrir le profil", "Open profile")}
                className="rounded-full transition-transform hover:scale-[1.04]"
              >
                {renderProfileAvatar("h-12 w-12", "text-[22px] font-semibold")}
              </button>
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
            <button
              type="button"
              onClick={onProfileClick}
              className="w-full rounded-[18px] px-3 py-3 transition-colors hover:bg-white/8"
            >
              <p className="text-[16px] font-medium text-[#f2f8f4]">{displayName}</p>
              <p className="text-[13px] text-[#cde0d6]">{roleLabel}</p>
              <div className="mt-3 flex justify-center">
                {renderProfileAvatar("h-12 w-12", "text-[22px] font-semibold")}
              </div>
            </button>
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
