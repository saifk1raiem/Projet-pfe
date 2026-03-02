import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Settings, Bell, Shield, UserRound, Sun, Moon } from "lucide-react";
import { useAppPreferences } from "../context/AppPreferencesContext";

export function ParametresPage() {
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

  const updateValue = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLastSavedAt(time);
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-semibold leading-tight text-[#171a1f]">{tr("Parametres du Systeme", "System Settings")}</h1>
          <p className="mt-1 text-[18px] text-[#5d6574]">{tr("Configuration generale, securite et notifications", "General configuration, security and notifications")}</p>
        </div>
        <Button className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[16px] font-medium text-white hover:bg-[#004a87]" onClick={handleSave}>
          <Settings className="mr-2 h-4 w-4" />
          {tr("Enregistrer", "Save")}
        </Button>
      </div>

      {lastSavedAt && (
        <Card className="rounded-[14px] border border-[#b9d3ea] bg-[#e8f1fb] px-4 py-3">
          <p className="text-[14px] text-[#005ca9]">{tr("Parametres enregistres a", "Settings saved at")} {lastSavedAt}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-[#005ca9]" />
            <h2 className="text-[22px] font-semibold text-[#171a1f]">{tr("Informations generales", "General information")}</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[13px] text-[#5f6777]">{tr("Entreprise", "Company")}</p>
              <Input value={formValues.entreprise} onChange={(e) => updateValue("entreprise", e.target.value)} />
            </div>
            <div>
              <p className="mb-1 text-[13px] text-[#5f6777]">{tr("Email administrateur", "Admin email")}</p>
              <Input value={formValues.emailAdmin} onChange={(e) => updateValue("emailAdmin", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-[13px] text-[#5f6777]">{tr("Langue", "Language")}</p>
                <select
                  className="h-10 w-full rounded-md border border-[#d5dce0] bg-white px-3 text-sm"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <p className="mb-1 text-[13px] text-[#5f6777]">{tr("Fuseau horaire", "Timezone")}</p>
                <select
                  className="h-10 w-full rounded-md border border-[#d5dce0] bg-white px-3 text-sm"
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

        <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#fc6200]" />
            <h2 className="text-[22px] font-semibold text-[#171a1f]">{tr("Notifications", "Notifications")}</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-[#e2e8f0] px-3 py-2">
              <span className="text-[15px] text-[#1d2025]">{tr("Notifications par email", "Email notifications")}</span>
              <input type="checkbox" checked={formValues.notifEmail} onChange={(e) => updateValue("notifEmail", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-[#e2e8f0] px-3 py-2">
              <span className="text-[15px] text-[#1d2025]">{tr("Rapports quotidiens", "Daily reports")}</span>
              <input type="checkbox" checked={formValues.notifRapports} onChange={(e) => updateValue("notifRapports", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-[#e2e8f0] px-3 py-2">
              <span className="text-[15px] text-[#1d2025]">{tr("Rappels de formation", "Training reminders")}</span>
              <input type="checkbox" checked={formValues.notifRappels} onChange={(e) => updateValue("notifRappels", e.target.checked)} />
            </label>
          </div>
        </Card>
      </div>

      <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Moon className="h-5 w-5 text-[#7b35e8]" />
          <h2 className="text-[22px] font-semibold text-[#171a1f]">{tr("Theme", "Theme")}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] p-3">
          <div>
            <p className="text-[15px] text-[#1d2025]">{tr("Mode d'affichage", "Display mode")}</p>
            <p className="text-[13px] text-[#5f6777]">{tr("Choisissez entre le mode jour et le mode nuit", "Choose between day and night mode")}</p>
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

      <Card className="rounded-[20px] border border-[#dfe5e2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#7b35e8]" />
          <h2 className="text-[22px] font-semibold text-[#171a1f]">{tr("Securite", "Security")}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] p-3">
          <div>
            <p className="text-[15px] text-[#1d2025]">{tr("Authentification a deux facteurs", "Two-factor authentication")}</p>
            <p className="text-[13px] text-[#5f6777]">{tr("Protection supplementaire pour les comptes administrateurs", "Extra protection for administrator accounts")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={formValues.doubleAuth ? "bg-[#e8f1fb] text-[#005ca9]" : "bg-[#fdeeee] text-[#ea3737]"}>
              {formValues.doubleAuth ? tr("Activee", "Enabled") : tr("Desactivee", "Disabled")}
            </Badge>
            <input type="checkbox" checked={formValues.doubleAuth} onChange={(e) => updateValue("doubleAuth", e.target.checked)} />
          </div>
        </div>
      </Card>
    </div>
  );
}
