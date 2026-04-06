import { useEffect, useState } from "react";
import { LoaderCircle, Save, Search, ShieldCheck } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";

const RESERVED_SUPER_ADMIN_EMAIL = "aymen.horchani@leoni.com";

function createEditableUser(user) {
  return {
    id: user.id,
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    role: user.role ?? "observer",
    is_active: Boolean(user.is_active),
    password: "",
    confirmPassword: "",
  };
}

function isReservedSuperAdminAccount(user) {
  return (user?.email ?? "").trim().toLowerCase() === RESERVED_SUPER_ADMIN_EMAIL;
}

function roleLabel(role, tr) {
  if (role === "super_admin") return tr("Super administrateur", "Super admin");
  if (role === "admin") return tr("Administrateur", "Administrator");
  return tr("Observateur", "Observer");
}

function accountLabel(user, tr) {
  return user.username?.trim() || `${user.first_name} ${user.last_name}`.trim() || tr("Utilisateur", "User");
}

export function ExistingAccountsSection({ accessToken, currentUser, onCurrentUserChange, refreshToken = 0 }) {
  const { tr } = useAppPreferences();
  const [managedUsers, setManagedUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [accountMessages, setAccountMessages] = useState({});
  const [savingById, setSavingById] = useState({});

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      setUsersError("");

      try {
        const response = await fetch(apiUrl("/users"), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data?.detail || tr("Chargement des comptes impossible", "Failed to load accounts"));
        }

        if (!cancelled) {
          setManagedUsers(Array.isArray(data) ? data.map(createEditableUser) : []);
        }
      } catch (error) {
        if (!cancelled) {
          setUsersError(error?.message || tr("Chargement echoue", "Loading failed"));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUsers(false);
        }
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken, tr]);

  const updateUserDraft = (userId, field, value) => {
    setManagedUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, [field]: value } : user)),
    );
    setAccountMessages((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleSaveUser = async (userId) => {
    const user = managedUsers.find((entry) => entry.id === userId);
    if (!user) return;

    if (user.password && user.password !== user.confirmPassword) {
      setAccountMessages((prev) => ({
        ...prev,
        [userId]: {
          type: "error",
          text: tr("Les mots de passe ne correspondent pas.", "Passwords do not match."),
        },
      }));
      return;
    }

    setSavingById((prev) => ({ ...prev, [userId]: true }));
    setAccountMessages((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    try {
      const payload = {
        first_name: user.first_name.trim(),
        last_name: user.last_name.trim(),
        username: user.username.trim() || null,
        email: user.email.trim(),
        role: user.role,
        is_active: user.is_active,
      };

      if (user.password) {
        payload.password = user.password;
      }

      const response = await fetch(apiUrl(`/users/${userId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || tr("Mise a jour impossible", "Unable to update account"));
      }

      const nextUser = createEditableUser(data);
      setManagedUsers((prev) => prev.map((entry) => (entry.id === userId ? nextUser : entry)));
      setAccountMessages((prev) => ({
        ...prev,
        [userId]: {
          type: "success",
          text: tr("Compte mis a jour avec succes.", "Account updated successfully."),
        },
      }));

      if (data.id === currentUser?.id) {
        onCurrentUserChange?.(data);
      }
    } catch (error) {
      setAccountMessages((prev) => ({
        ...prev,
        [userId]: {
          type: "error",
          text: error?.message || tr("Mise a jour impossible", "Unable to update account"),
        },
      }));
    } finally {
      setSavingById((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const filteredUsers = managedUsers.filter((user) => {
    const normalizedFilter = accountFilter.trim().toLowerCase();
    if (!normalizedFilter) return true;
    return [
      user.first_name,
      user.last_name,
      user.username,
      user.email,
      user.role,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedFilter));
  });

  return (
    <Card className="rounded-[20px] border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#005ca9]" />
          <div>
            <h2 className="text-[22px] font-semibold text-card-foreground">{tr("Comptes existants", "Existing accounts")}</h2>
            <p className="text-[13px] text-muted-foreground">
              {tr(
                "Le super administrateur peut modifier les comptes, les mots de passe, les roles et l'etat d'activation.",
                "The super admin can update accounts, passwords, roles, and activation status.",
              )}
            </p>
          </div>
        </div>
        <Badge variant="outline">{filteredUsers.length}</Badge>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
            placeholder={tr("Rechercher un nom, username ou email", "Search by name, username, or email")}
          />
        </div>
      </div>

      {usersError ? <p className="mb-4 text-sm font-medium text-red-600">{usersError}</p> : null}

      {isLoadingUsers ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {tr("Chargement des comptes...", "Loading accounts...")}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          {tr("Aucun compte ne correspond a la recherche.", "No account matches the current search.")}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const reservedSuperAdmin = isReservedSuperAdminAccount(user);
            const message = accountMessages[user.id];
            const isSaving = Boolean(savingById[user.id]);

            return (
              <div key={user.id} className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[16px] font-semibold text-card-foreground">{accountLabel(user, tr)}</p>
                      {user.id === currentUser?.id ? (
                        <Badge className="bg-[#e8f1fb] text-[#005ca9]">{tr("Compte connecte", "Current account")}</Badge>
                      ) : null}
                      {reservedSuperAdmin ? (
                        <Badge className="bg-[#fff4e7] text-[#c56a00]">{tr("Super admin verrouille", "Locked super admin")}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">{user.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#e8f1fb] text-[#005ca9]">{roleLabel(user.role, tr)}</Badge>
                    <Badge className={user.is_active ? "bg-[#e7f8ee] text-[#1b7f46]" : "bg-[#fdeeee] text-[#ea3737]"}>
                      {user.is_active ? tr("Actif", "Active") : tr("Inactif", "Inactive")}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">{tr("Prenom", "First name")}</p>
                    <Input
                      value={user.first_name}
                      onChange={(event) => updateUserDraft(user.id, "first_name", event.target.value)}
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">{tr("Nom", "Last name")}</p>
                    <Input
                      value={user.last_name}
                      onChange={(event) => updateUserDraft(user.id, "last_name", event.target.value)}
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">{tr("Username", "Username")}</p>
                    <Input
                      value={user.username}
                      onChange={(event) => updateUserDraft(user.id, "username", event.target.value)}
                      placeholder={tr("Optionnel", "Optional")}
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">{tr("Email", "Email")}</p>
                    <Input
                      type="email"
                      value={user.email}
                      onChange={(event) => updateUserDraft(user.id, "email", event.target.value)}
                      disabled={reservedSuperAdmin}
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">{tr("Role", "Role")}</p>
                    <select
                      className="h-10 w-full rounded-md border border-border bg-input-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      value={user.role}
                      onChange={(event) => updateUserDraft(user.id, "role", event.target.value)}
                      disabled={reservedSuperAdmin}
                    >
                      {reservedSuperAdmin ? <option value="super_admin">{tr("Super administrateur", "Super admin")}</option> : null}
                      <option value="admin">{tr("Administrateur", "Administrator")}</option>
                      <option value="observer">{tr("Observateur", "Observer")}</option>
                    </select>
                  </div>

                  <label className="flex items-end gap-2 pb-2">
                    <input
                      type="checkbox"
                      checked={user.is_active}
                      onChange={(event) => updateUserDraft(user.id, "is_active", event.target.checked)}
                      disabled={reservedSuperAdmin}
                    />
                    <span className="text-[14px] text-card-foreground">{tr("Compte actif", "Active account")}</span>
                  </label>

                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">{tr("Nouveau mot de passe", "New password")}</p>
                    <Input
                      type="password"
                      value={user.password}
                      onChange={(event) => updateUserDraft(user.id, "password", event.target.value)}
                      placeholder={tr("Laisser vide pour ne pas changer", "Leave empty to keep unchanged")}
                    />
                  </div>

                  <div>
                    <p className="mb-1 text-[13px] text-muted-foreground">{tr("Confirmer le mot de passe", "Confirm password")}</p>
                    <Input
                      type="password"
                      value={user.confirmPassword}
                      onChange={(event) => updateUserDraft(user.id, "confirmPassword", event.target.value)}
                      placeholder={tr("Retapez le nouveau mot de passe", "Retype the new password")}
                    />
                  </div>
                </div>

                {reservedSuperAdmin ? (
                  <p className="mt-3 text-xs text-[#8a5a19]">
                    {tr(
                      "Le role, l'email et l'etat d'activation du super administrateur unique sont verrouilles.",
                      "The unique super admin role, email, and activation status are locked.",
                    )}
                  </p>
                ) : null}

                {message ? (
                  <p className={`mt-3 text-sm font-medium ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>
                    {message.text}
                  </p>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleSaveUser(user.id)}
                    disabled={isSaving}
                    className="h-10 rounded-[10px] bg-[#005ca9] px-5 text-[14px] font-medium text-white hover:bg-[#004a87]"
                  >
                    {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? tr("Enregistrement...", "Saving...") : tr("Enregistrer les changements", "Save changes")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
