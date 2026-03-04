import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Settings, Bell, Shield, UserRound, Sun, Moon } from "lucide-react";
import { useAppPreferences } from "../context/AppPreferencesContext";

export function ParametresPage({ currentUser, accessToken }) {
  const { language, setLanguage, theme, setTheme, tr } = useAppPreferences();
  const [formValues, setFormValues] = useState({
    entreprise: "LEONI",
    emailAdmin: "admin@leoni.example",
    fuseau: "Africa/Tunis",
    notifEmail: true,
    notifRapports: true,
    notifRappels: false,
    doubleAuth: false,
  });
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [createUserForm, setCreateUserForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "observer",
    is_active: true,
  });
  const [createUserError, setCreateUserError] = useState("");
  const [createUserSuccess, setCreateUserSuccess] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const isAdmin = currentUser?.role === "admin";
  const accountFullName = `${currentUser?.first_name ?? ""} ${currentUser?.last_name ?? ""}`.trim() || "User";
  const accountEmail = currentUser?.email ?? "-";
  const accountRole = currentUser?.role ?? "observer";
  const accountRoleLabel =
    accountRole === "admin" ? tr("Administrateur", "Administrator") : tr("Observateur", "Observer");
  const accountStatusLabel = currentUser?.is_active
    ? tr("Actif", "Active")
    : tr("Inactif", "Inactive");

  const updateValue = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastSavedAt(time);
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreateUserError("");
    setCreateUserSuccess("");
    setIsCreatingUser(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(createUserForm),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || "Failed to create user");
      }

      setCreateUserSuccess(tr("Utilisateur cree avec succes", "User created successfully"));
      setCreateUserForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "observer",
        is_active: true,
      });
    } catch (error) {
      setCreateUserError(error?.message || tr("Creation echouee", "Creation failed"));
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="leoni-display-xl text-[40px] font-semibold leading-tight text-foreground">{tr("Parametres du Systeme", "System Settings")}</h1>
          <p className="leoni-subtitle mt-1 text-[18px] text-muted-foreground">{tr("Configuration generale, securite et notifications", "General configuration, security and notifications")}</p>
        </div>
        <Button className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]" onClick={handleSave}>
          <Settings className="mr-2 h-4 w-4" />
          {tr("Enregistrer", "Save")}
        </Button>
      </div>

      {lastSavedAt && (
        <Card className="rounded-[14px] border border-border bg-accent/35 px-4 py-3">
          <p className="text-[14px] text-accent-foreground">{tr("Parametres enregistres a", "Settings saved at")} {lastSavedAt}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-[#005ca9]" />
            <h2 className="text-[22px] font-semibold text-card-foreground">{tr("Informations generales", "General information")}</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[13px] text-muted-foreground">{tr("Entreprise", "Company")}</p>
              <Input
                value={formValues.entreprise}
                onChange={(e) => updateValue("entreprise", e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div>
              <p className="mb-1 text-[13px] text-muted-foreground">
                {isAdmin ? tr("Email administrateur", "Admin email") : tr("Email du compte", "Account email")}
              </p>
              <Input
                value={isAdmin ? formValues.emailAdmin : accountEmail}
                onChange={(e) => isAdmin && updateValue("emailAdmin", e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-[13px] text-muted-foreground">{tr("Compte connecte", "Logged account")}</p>
                <p className="text-[15px] font-medium text-card-foreground">{accountFullName}</p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2">
                <p className="text-[13px] text-muted-foreground">{tr("Role et statut", "Role and status")}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className="bg-[#e8f1fb] text-[#005ca9]">{accountRoleLabel}</Badge>
                  <Badge className={currentUser?.is_active ? "bg-[#e7f8ee] text-[#1b7f46]" : "bg-[#fdeeee] text-[#ea3737]"}>
                    {accountStatusLabel}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[13px] text-muted-foreground">{tr("Langue", "Language")}</p>
                <select
                  className="h-10 w-full rounded-md border border-border bg-input-background px-3 text-sm text-foreground"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <p className="mb-1 text-[13px] text-muted-foreground">{tr("Fuseau horaire", "Timezone")}</p>
                <select
                  className="h-10 w-full rounded-md border border-border bg-input-background px-3 text-sm text-foreground"
                  value={formValues.fuseau}
                  onChange={(e) => updateValue("fuseau", e.target.value)}
                >
                  <option value="Africa/Tunis">Africa/Tunis</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#fc6200]" />
            <h2 className="text-[22px] font-semibold text-card-foreground">{tr("Notifications", "Notifications")}</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="text-[15px] text-card-foreground">{tr("Notifications par email", "Email notifications")}</span>
              <input type="checkbox" checked={formValues.notifEmail} onChange={(e) => updateValue("notifEmail", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="text-[15px] text-card-foreground">{tr("Rapports quotidiens", "Daily reports")}</span>
              <input type="checkbox" checked={formValues.notifRapports} onChange={(e) => updateValue("notifRapports", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <span className="text-[15px] text-card-foreground">{tr("Rappels de formation", "Training reminders")}</span>
              <input type="checkbox" checked={formValues.notifRappels} onChange={(e) => updateValue("notifRappels", e.target.checked)} />
            </label>
          </div>
        </Card>
      </div>

      <Card className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Moon className="h-5 w-5 text-[#7b35e8]" />
          <h2 className="text-[22px] font-semibold text-card-foreground">{tr("Theme", "Theme")}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div>
            <p className="text-[15px] text-card-foreground">{tr("Mode d'affichage", "Display mode")}</p>
            <p className="text-[13px] text-muted-foreground">{tr("Choisissez entre le mode jour et le mode nuit", "Choose between day and night mode")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant={theme === "day" ? "default" : "outline"} className="h-9 rounded-xl" onClick={() => setTheme("day")}>
              <Sun className="mr-2 h-4 w-4" />
              {tr("Jour", "Day")}
            </Button>
            <Button variant={theme === "night" ? "default" : "outline"} className="h-9 rounded-xl" onClick={() => setTheme("night")}>
              <Moon className="mr-2 h-4 w-4" />
              {tr("Nuit", "Night")}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#7b35e8]" />
          <h2 className="text-[22px] font-semibold text-card-foreground">{tr("Securite", "Security")}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
          <div>
            <p className="text-[15px] text-card-foreground">{tr("Authentification a deux facteurs", "Two-factor authentication")}</p>
            <p className="text-[13px] text-muted-foreground">{tr("Protection supplementaire pour les comptes administrateurs", "Extra protection for administrator accounts")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={formValues.doubleAuth ? "bg-[#e8f1fb] text-[#005ca9]" : "bg-[#fdeeee] text-[#ea3737]"}>
              {formValues.doubleAuth ? tr("Activee", "Enabled") : tr("Desactivee", "Disabled")}
            </Badge>
            <input type="checkbox" checked={formValues.doubleAuth} onChange={(e) => updateValue("doubleAuth", e.target.checked)} />
          </div>
        </div>
      </Card>

      {isAdmin ? (
        <Card className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-[#005ca9]" />
            <h2 className="text-[22px] font-semibold text-card-foreground">{tr("Ajouter un utilisateur", "Add user")}</h2>
          </div>

          <form className="space-y-3" onSubmit={handleCreateUser}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[13px] text-muted-foreground">{tr("Prenom", "First name")}</p>
                <Input
                  value={createUserForm.first_name}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <p className="mb-1 text-[13px] text-muted-foreground">{tr("Nom", "Last name")}</p>
                <Input
                  value={createUserForm.last_name}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[13px] text-muted-foreground">Email</p>
                <Input
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <p className="mb-1 text-[13px] text-muted-foreground">{tr("Mot de passe", "Password")}</p>
                <Input
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[13px] text-muted-foreground">{tr("Role", "Role")}</p>
                <select
                  className="h-10 w-full rounded-md border border-border bg-input-background px-3 text-sm text-foreground"
                  value={createUserForm.role}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="observer">{tr("Observateur", "Observer")}</option>
                  <option value="admin">{tr("Administrateur", "Admin")}</option>
                </select>
              </div>
              <label className="flex items-end gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={createUserForm.is_active}
                  onChange={(e) => setCreateUserForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                <span className="text-[14px] text-card-foreground">{tr("Compte actif", "Active account")}</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isCreatingUser}
              className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]"
            >
              {isCreatingUser ? tr("Creation...", "Creating...") : tr("Ajouter", "Add user")}
            </Button>

            {createUserError ? <p className="text-sm font-medium text-red-600">{createUserError}</p> : null}
            {createUserSuccess ? <p className="text-sm font-medium text-green-700">{createUserSuccess}</p> : null}
          </form>
        </Card>
      ) : null}
    </div>
  );
}
