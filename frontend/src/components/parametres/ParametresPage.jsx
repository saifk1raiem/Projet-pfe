import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Settings, Bell, Shield, UserRound, Sun, Moon, Plus, X, ChevronDown } from "lucide-react";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";
import { defaultCreateUserForm, defaultFormValues } from "./constants";

export function ParametresPage({ currentUser, accessToken }) {
  const { language, setLanguage, theme, setTheme, tr } = useAppPreferences();
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [createUserForm, setCreateUserForm] = useState(defaultCreateUserForm);
  const [createUserError, setCreateUserError] = useState("");
  const [createUserSuccess, setCreateUserSuccess] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [excelSynonyms, setExcelSynonyms] = useState({});
  const [isLoadingSynonyms, setIsLoadingSynonyms] = useState(false);
  const [isSavingSynonyms, setIsSavingSynonyms] = useState(false);
  const [synonymsError, setSynonymsError] = useState("");
  const [synonymsSuccess, setSynonymsSuccess] = useState("");
  const [synonymDrafts, setSynonymDrafts] = useState({});
  const [synonymFilter, setSynonymFilter] = useState("");
  const [isSynonymsOpen, setIsSynonymsOpen] = useState(false);
  const isAdmin = currentUser?.role === "admin";
  const accountFullName = `${currentUser?.first_name ?? ""} ${currentUser?.last_name ?? ""}`.trim() || tr("Utilisateur", "User");
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
      const response = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(createUserForm),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || tr("Creation utilisateur impossible", "Failed to create user"));
      }

      setCreateUserSuccess(tr("Utilisateur cree avec succes", "User created successfully"));
      setCreateUserForm(defaultCreateUserForm);
    } catch (error) {
      setCreateUserError(error?.message || tr("Creation echouee", "Creation failed"));
    } finally {
      setIsCreatingUser(false);
    }
  };

  useEffect(() => {
    if (!isAdmin || !accessToken) return;

    let cancelled = false;
    const loadSynonyms = async () => {
      setIsLoadingSynonyms(true);
      setSynonymsError("");
      try {
        const response = await fetch(apiUrl("/settings/excel-synonyms"), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.detail || tr("Chargement des synonymes impossible", "Failed to load Excel synonyms"));
        }
        if (!cancelled) {
          setExcelSynonyms(data?.synonyms && typeof data.synonyms === "object" ? data.synonyms : {});
        }
      } catch (error) {
        if (!cancelled) {
          setSynonymsError(error?.message || tr("Chargement echoue", "Loading failed"));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSynonyms(false);
        }
      }
    };

    loadSynonyms();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, accessToken, tr]);

  const updateSynonymField = (field, value) => {
    const aliases = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setExcelSynonyms((prev) => ({ ...prev, [field]: aliases }));
    setSynonymsSuccess("");
  };

  const updateSynonymDraft = (field, value) => {
    setSynonymDrafts((prev) => ({ ...prev, [field]: value }));
    setSynonymsSuccess("");
  };

  const addSynonymsToField = (field) => {
    const rawDraft = synonymDrafts[field] || "";
    const toAdd = rawDraft
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!toAdd.length) return;

    setExcelSynonyms((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const merged = [...current];
      toAdd.forEach((alias) => {
        if (!merged.some((existing) => existing.toLowerCase() === alias.toLowerCase())) {
          merged.push(alias);
        }
      });
      return { ...prev, [field]: merged };
    });
    setSynonymDrafts((prev) => ({ ...prev, [field]: "" }));
    setSynonymsSuccess("");
  };

  const removeSynonymFromField = (field, aliasToRemove) => {
    setExcelSynonyms((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      return {
        ...prev,
        [field]: current.filter((alias) => alias !== aliasToRemove),
      };
    });
    setSynonymsSuccess("");
  };

  const handleSaveSynonyms = async () => {
    if (!isAdmin || !accessToken) return;
    setIsSavingSynonyms(true);
    setSynonymsError("");
    setSynonymsSuccess("");

    const payloadSynonyms = Object.entries(synonymDrafts).reduce((acc, [field, draftValue]) => {
      const current = Array.isArray(acc[field]) ? [...acc[field]] : [];
      const toAdd = String(draftValue || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      toAdd.forEach((alias) => {
        if (!current.some((existing) => existing.toLowerCase() === alias.toLowerCase())) {
          current.push(alias);
        }
      });
      acc[field] = current;
      return acc;
    }, { ...excelSynonyms });

    setExcelSynonyms(payloadSynonyms);
    setSynonymDrafts({});

    try {
      const response = await fetch(apiUrl("/settings/excel-synonyms"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ synonyms: payloadSynonyms }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || tr("Sauvegarde des synonymes impossible", "Failed to save Excel synonyms"));
      }
      setExcelSynonyms(data?.synonyms && typeof data.synonyms === "object" ? data.synonyms : {});
      setSynonymsSuccess(tr("Synonymes sauvegardes", "Synonyms saved"));
    } catch (error) {
      setSynonymsError(error?.message || tr("Sauvegarde echouee", "Save failed"));
    } finally {
      setIsSavingSynonyms(false);
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
                  <option value="fr">{tr("Francais", "French")}</option>
                  <option value="en">{tr("Anglais", "English")}</option>
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
            <div className="rounded-xl border border-dashed border-[#d5e2d8] bg-[#f7fbf8] px-3 py-3">
              <p className="text-[15px] font-medium text-card-foreground">{tr("Statistiques", "Statistics")}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {tr(
                  "Ce module est retire pour le moment. Il reviendra dans une prochaine version.",
                  "This module is removed for now. It will return in a future version.",
                )}
              </p>
            </div>
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
                <p className="mb-1 text-[13px] text-muted-foreground">{tr("Email", "Email")}</p>
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

      {isAdmin ? (
        <Card className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
          <button
            type="button"
            className="mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-accent/40"
            onClick={() => setIsSynonymsOpen((prev) => !prev)}
          >
            <div>
              <h2 className="text-[22px] font-semibold text-card-foreground">
                {tr("Synonymes Excel", "Excel synonyms")}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {tr(
                  "Modifiez les noms de colonnes acceptes pour les imports et apercus Excel.",
                  "Edit accepted column names for Excel import and preview."
                )}
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                isSynonymsOpen ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              isSynonymsOpen ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="pt-3">
              <div className="mb-4 flex justify-end">
                <Button
                  className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[14px] font-medium text-white hover:bg-[#004a87]"
                  onClick={handleSaveSynonyms}
                  disabled={isLoadingSynonyms || isSavingSynonyms}
                >
                  {isSavingSynonyms ? tr("Sauvegarde...", "Saving...") : tr("Sauvegarder", "Save")}
                </Button>
              </div>

              {isLoadingSynonyms ? (
                <p className="text-sm text-muted-foreground">{tr("Chargement...", "Loading...")}</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">{tr("Rechercher un champ", "Search field")}</p>
                    <Input
                      value={synonymFilter}
                      onChange={(e) => setSynonymFilter(e.target.value)}
                      placeholder={tr("Ex: fonction, matricule, date...", "Ex: fonction, matricule, date...")}
                    />
                  </div>

                  {Object.entries(excelSynonyms)
                    .filter(([field]) => field.toLowerCase().includes(synonymFilter.trim().toLowerCase()))
                    .map(([field, aliases]) => (
                    <div key={field}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-[13px] font-medium text-card-foreground">{field}</p>
                        <Badge variant="outline">{Array.isArray(aliases) ? aliases.length : 0}</Badge>
                      </div>

                      <div className="mb-2 flex flex-wrap gap-2 rounded-xl border border-border bg-background/40 p-2">
                        {(Array.isArray(aliases) ? aliases : []).map((alias) => (
                          <span
                            key={`${field}-${alias}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[#cfe0f5] bg-[#e8f1fb] px-2 py-1 text-[12px] text-[#005ca9]"
                          >
                            {alias}
                            <button
                              type="button"
                              className="rounded p-0.5 hover:bg-[#d7e8fb]"
                              onClick={() => removeSynonymFromField(field, alias)}
                              aria-label={tr(`Supprimer ${alias}`, `Remove ${alias}`)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        {!Array.isArray(aliases) || aliases.length === 0 ? (
                          <span className="text-[12px] text-muted-foreground">{tr("Aucun alias", "No aliases")}</span>
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          value={synonymDrafts[field] || ""}
                          onChange={(e) => updateSynonymDraft(field, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addSynonymsToField(field);
                            }
                          }}
                          placeholder={tr(
                            "Ajouter un alias (ou plusieurs separes par virgule)",
                            "Add alias (or multiple comma-separated)"
                          )}
                        />
                        <Button type="button" variant="outline" onClick={() => addSynonymsToField(field)}>
                          <Plus className="mr-1 h-4 w-4" />
                          {tr("Ajouter", "Add")}
                        </Button>
                      </div>

                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-[12px]"
                          onClick={() => updateSynonymField(field, "")}
                        >
                          {tr("Vider la liste", "Clear list")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {synonymsError ? <p className="mt-3 text-sm font-medium text-red-600">{synonymsError}</p> : null}
              {synonymsSuccess ? <p className="mt-3 text-sm font-medium text-green-700">{synonymsSuccess}</p> : null}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

