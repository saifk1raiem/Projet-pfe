import { useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Database,
  GraduationCap,
  LayoutDashboard,
  Linkedin,
  LogOut,
  Menu,
  Phone,
  RefreshCcw,
  Search,
  Settings,
  UserRoundCheck,
  Users,
  Wrench,
  X,
  Youtube,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const handleNavigate = (page) => {
    onPageChange(page);
    setIsMenuOpen(false);
  };

  const renderProfileAvatar = () => (
    <div className="leoni-user-avatar">
      {currentUser?.avatar_url ? (
        <img src={currentUser.avatar_url} alt={displayName} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );

  return (
    <header className={cn("leoni-header asm-header", compact ? "leoni-header--compact" : "")}>
      <div className="leoni-topbar">
        <div className="leoni-header-inner">
          <div className="leoni-top-contact">
            <Phone className="h-4 w-4" />
            <span>+216 92 022 808</span>
          </div>

          <div className="leoni-meta" aria-label="ASM social links">
            <span className="leoni-meta-link">
              <Youtube className="h-4 w-4" />
              Youtube
            </span>
            <span className="leoni-meta-link">
              <Linkedin className="h-4 w-4" />
              Linkedin
            </span>
          </div>

          <button
            type="button"
            className="leoni-mobile-menu"
            aria-label={isMenuOpen ? tr("Fermer le menu", "Close menu") : tr("Ouvrir le menu", "Open menu")}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((value) => !value)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="leoni-primarybar">
        <div className="leoni-header-inner leoni-primarybar-inner">
          <a href="/" className="leoni-brand" aria-label="ASM Tunisie">
            <img src="/asm/logo-asm.png" alt="ASM Tunisie" className="leoni-brand-logo" />
          </a>

          <div className="leoni-app-mark">
            <span className="leoni-app-title">{appConfig.applicationName}</span>
            <span className="leoni-app-subtitle">{tr("Espace formation", "Training workspace")}</span>
          </div>

          <nav className={cn("leoni-nav", isMenuOpen ? "is-open" : "")} aria-label={tr("Navigation principale", "Main navigation")}>
            {navigationItems.map((item) => {
              const isActive = currentPage === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={cn("leoni-nav-link", isActive ? "is-active" : "")}
                  title={tr(item.subtitleFr, item.subtitleEn)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tr(item.nameFr, item.nameEn)}</span>
                </button>
              );
            })}
          </nav>

          <div className="leoni-user-actions">
            <button type="button" className="leoni-icon-button leoni-search-button" aria-label={tr("Rechercher", "Search")}>
              <Search className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggleCompact}
              className="leoni-icon-button"
              aria-label={compact ? tr("Afficher le menu complet", "Show full menu") : tr("Compacter le menu", "Condense menu")}
            >
              {compact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            <button type="button" onClick={onProfileClick} className="leoni-profile-button">
              {renderProfileAvatar()}
              <span className="leoni-profile-text">
                <span>{displayName}</span>
                <small>{roleLabel}</small>
              </span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="leoni-icon-button leoni-signout"
              aria-label={tr("Se deconnecter", "Sign out")}
            >
              <LogOut className="h-4 w-4" />
            </button>

            <button type="button" onClick={onProfileClick} className="leoni-contact-button">
              Contact
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
