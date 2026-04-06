import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, ShieldCheck, Upload, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAppPreferences } from "../../context/AppPreferencesContext";
import { apiUrl } from "../../lib/api";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const RESERVED_SUPER_ADMIN_EMAIL = "aymen.horchani@leoni.com";

function buildDisplayName(user) {
  return (
    user?.username?.trim() ||
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
    "User"
  );
}

function buildInitials(user) {
  const displayName = buildDisplayName(user);
  return (
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

export function ProfileDialog({ open, onOpenChange, currentUser, accessToken, onUserUpdated }) {
  const { tr } = useAppPreferences();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    avatar_url: "",
    role: "observer",
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isReadingImage, setIsReadingImage] = useState(false);

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isReservedSuperAdmin = (currentUser?.email ?? "").trim().toLowerCase() === RESERVED_SUPER_ADMIN_EMAIL;
  const canEditRole = isSuperAdmin && !isReservedSuperAdmin;
  const displayName = form.username.trim() || `${form.first_name} ${form.last_name}`.trim() || buildDisplayName(currentUser);
  const initials = buildInitials({
    username: form.username,
    first_name: form.first_name,
    last_name: form.last_name,
  });

  const renderAvatar = () => (
    <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#cfe0ef] bg-[#7ae094] text-3xl font-semibold text-[#2b6d56] shadow-sm">
      {form.avatar_url ? (
        <img src={form.avatar_url} alt={displayName} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );

  useEffect(() => {
    if (!open || !currentUser) return;
    setForm({
      username: currentUser.username ?? "",
      first_name: currentUser.first_name ?? "",
      last_name: currentUser.last_name ?? "",
      email: currentUser.email ?? "",
      avatar_url: currentUser.avatar_url ?? "",
      role: currentUser.role ?? "observer",
      currentPassword: "",
      password: "",
      confirmPassword: "",
    });
    setError("");
    setSuccess("");
    setIsSaving(false);
    setIsReadingImage(false);
  }, [open, currentUser]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(tr("L'image doit faire moins de 2 Mo.", "The image must be smaller than 2 MB."));
      return;
    }

    setError("");
    setSuccess("");
    setIsReadingImage(true);

    try {
      const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("image_read_failed"));
        reader.readAsDataURL(file);
      });
      updateField("avatar_url", imageDataUrl);
    } catch {
      setError(tr("Impossible de charger l'image.", "Unable to load the image."));
    } finally {
      setIsReadingImage(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password && form.password !== form.confirmPassword) {
      setError(tr("Les mots de passe ne correspondent pas.", "Passwords do not match."));
      return;
    }

    if (form.password && !form.currentPassword.trim()) {
      setError(
        tr(
          "Entrez votre mot de passe actuel pour definir un nouveau mot de passe.",
          "Enter your current password before setting a new one.",
        ),
      );
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        username: form.username.trim() || null,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        avatar_url: form.avatar_url || null,
      };

      if (form.password) {
        payload.password = form.password;
        payload.current_password = form.currentPassword;
      }

      if (canEditRole) {
        payload.role = form.role;
      }

      const response = await fetch(apiUrl("/users/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || tr("Mise a jour impossible", "Unable to update profile"));
      }

      setSuccess(tr("Profil mis a jour avec succes.", "Profile updated successfully."));
      setForm((prev) => ({
        ...prev,
        email: data.email ?? prev.email,
        role: data.role ?? prev.role,
        currentPassword: "",
        password: "",
        confirmPassword: "",
      }));
      onUserUpdated?.(data);
    } catch (submitError) {
      setError(submitError?.message || tr("Mise a jour impossible", "Unable to update profile"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tr("Mon profil", "My profile")}</DialogTitle>
          <DialogDescription>
            {tr(
              "Mettez a jour votre photo, votre nom d'affichage, votre email et votre mot de passe depuis cet espace.",
              "Update your photo, display name, email, and password from this panel.",
            )}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-[#d8e4ef] bg-[#f7fbff] p-4">
              <div className="flex flex-col items-center text-center">
                {renderAvatar()}
                <p className="mt-3 text-base font-semibold text-[#163252]">{displayName}</p>
                <p className="mt-1 text-sm text-[#5d7088]">{form.email || currentUser?.email}</p>

                <div className="mt-4 grid w-full gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-center"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReadingImage}
                  >
                    {isReadingImage ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {tr("Changer la photo", "Change photo")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-center"
                    onClick={() => updateField("avatar_url", "")}
                    disabled={!form.avatar_url}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {tr("Retirer la photo", "Remove photo")}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1a3252]" htmlFor="profile-username">
                    {tr("Nom d'utilisateur", "Username")}
                  </label>
                  <Input
                    id="profile-username"
                    value={form.username}
                    onChange={(event) => updateField("username", event.target.value)}
                    placeholder={tr("Nom d'affichage", "Display name")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1a3252]" htmlFor="profile-role">
                    {tr("Role", "Role")}
                  </label>
                  <select
                    id="profile-role"
                    className="h-10 w-full rounded-md border border-[#c8d8e8] bg-white px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:bg-[#f3f6fa] disabled:text-muted-foreground"
                    value={form.role}
                    onChange={(event) => updateField("role", event.target.value)}
                    disabled={!canEditRole}
                  >
                    <option value="super_admin">{tr("Super administrateur", "Super admin")}</option>
                    <option value="admin">{tr("Administrateur", "Administrator")}</option>
                    <option value="observer">{tr("Observateur", "Observer")}</option>
                  </select>
                  <p className={`text-xs ${canEditRole ? "text-[#d2691e]" : "text-[#5d7088]"}`}>
                    {isReservedSuperAdmin
                      ? tr(
                          "Ce compte est le super administrateur unique. Son role est verrouille.",
                          "This account is the unique super admin. Its role is locked.",
                        )
                      : canEditRole
                      ? tr(
                          "Attention: ce compte est l'unique super administrateur. Le changer vers admin ou observateur retirera cet acces eleve.",
                          "Warning: this is the unique super admin account. Changing it to admin or observer will remove that elevated access.",
                        )
                      : tr("Seul le super administrateur peut modifier les roles.", "Only the super admin can change roles.")}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1a3252]" htmlFor="profile-first-name">
                    {tr("Prenom", "First name")}
                  </label>
                  <Input
                    id="profile-first-name"
                    value={form.first_name}
                    onChange={(event) => updateField("first_name", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1a3252]" htmlFor="profile-last-name">
                    {tr("Nom", "Last name")}
                  </label>
                  <Input
                    id="profile-last-name"
                    value={form.last_name}
                    onChange={(event) => updateField("last_name", event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1a3252]" htmlFor="profile-email">
                  Email
                </label>
                <Input
                  id="profile-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  disabled={isReservedSuperAdmin}
                  required
                />
                {isReservedSuperAdmin ? (
                  <p className="text-xs text-[#5d7088]">
                    {tr(
                      "L'email du super administrateur unique est verrouille.",
                      "The unique super admin email is locked.",
                    )}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[#d8e4ef] bg-[#f8fafc] p-4">
                <div className="mb-3 flex items-center gap-2 text-[#163252]">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-sm font-semibold">{tr("Changer le mot de passe", "Change password")}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#1a3252]" htmlFor="profile-current-password">
                      {tr("Mot de passe actuel", "Current password")}
                    </label>
                    <Input
                      id="profile-current-password"
                      type="password"
                      value={form.currentPassword}
                      onChange={(event) => updateField("currentPassword", event.target.value)}
                      placeholder={tr("Obligatoire si vous changez le mot de passe", "Required when changing password")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#1a3252]" htmlFor="profile-password">
                      {tr("Nouveau mot de passe", "New password")}
                    </label>
                    <Input
                      id="profile-password"
                      type="password"
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      placeholder={tr("Minimum 8 caracteres", "Minimum 8 characters")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#1a3252]" htmlFor="profile-password-confirm">
                      {tr("Confirmer le mot de passe", "Confirm password")}
                    </label>
                    <Input
                      id="profile-password-confirm"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) => updateField("confirmPassword", event.target.value)}
                      placeholder={tr("Retapez le mot de passe", "Retype the password")}
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#5d7088]">
                  {tr(
                    "Le mot de passe actuel est demande uniquement si vous definissez un nouveau mot de passe.",
                    "Your current password is required only when you set a new password.",
                  )}
                </p>
              </div>
            </div>
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          {success ? <p className="text-sm font-medium text-green-700">{success}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              {tr("Fermer", "Close")}
            </Button>
            <Button type="submit" disabled={isSaving || isReadingImage}>
              {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <UserRound className="mr-2 h-4 w-4" />}
              {isSaving ? tr("Enregistrement...", "Saving...") : tr("Enregistrer le profil", "Save profile")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
