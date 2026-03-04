import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppPreferences } from "../context/AppPreferencesContext";

export function LoginPage({ onLogin, onQuickLogin }) {
  const { tr } = useAppPreferences();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickRole, setQuickRole] = useState("admin");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await onLogin({ email, password });
    } catch (err) {
      setError(err?.message || tr("Echec de connexion", "Login failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9e7f5_0%,#f4f7fb_45%,#eef4fb_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-[#d4dfeb] bg-white shadow-[0_22px_50px_rgba(13,58,103,0.16)] md:grid-cols-2">
          <div className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#004681_0%,#005ca9_45%,#52a7e8_100%)] p-10 text-white md:block">
            <div className="relative z-10">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-white/80">
                LEONI Training
              </p>
              <h1 className="mt-5 text-3xl font-semibold leading-tight">
                {tr("Bon retour", "Welcome back")}
              </h1>
              <p className="mt-3 max-w-xs text-sm leading-6 text-white/85">
                {tr(
                  "Connectez-vous pour gerer les formations, qualifications et collaborateurs depuis un seul espace.",
                  "Sign in to manage training, qualifications, and collaborators from one place.",
                )}
              </p>
            </div>
            <div className="pointer-events-none absolute -right-12 -top-10 h-56 w-56 rounded-full bg-white/15 blur-xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-60 w-60 rounded-full bg-[#6dc1ff]/30 blur-xl" />
          </div>

          <div className="p-7 sm:p-10">
            <p className="text-sm font-medium text-[#5d7088]">{tr("Acces compte", "Account access")}</p>
            <h2 className="mt-2 text-3xl font-semibold text-[#13263f]">{tr("Connexion", "Login")}</h2>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1a3252]" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder={tr("nom@entreprise.com", "name@company.com")}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-11 border-[#c8d8e8] bg-white"
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-[#1a3252]"
                  htmlFor="password"
                >
                  {tr("Mot de passe", "Password")}
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder={tr("Entrez votre mot de passe", "Enter your password")}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-11 border-[#c8d8e8] bg-white"
                />
              </div>

              <Button className="h-11 w-full text-sm font-semibold" type="submit" disabled={isSubmitting}>
                {isSubmitting ? tr("Connexion...", "Signing in...") : tr("Se connecter", "Sign In")}
              </Button>

              <Button
                className="h-11 w-full text-sm font-semibold"
                type="button"
                variant="outline"
                onClick={() => onQuickLogin(quickRole)}
              >
                {tr("Connexion rapide (sans backend)", "Quick Login (no backend)")}
              </Button>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#1a3252]" htmlFor="quick-role">
                  {tr("Role de connexion rapide", "Quick login role")}
                </label>
                <select
                  id="quick-role"
                  className="h-11 w-full rounded-md border border-[#c8d8e8] bg-white px-3 text-sm text-[#1a3252]"
                  value={quickRole}
                  onChange={(event) => setQuickRole(event.target.value)}
                >
                  <option value="admin">{tr("Administrateur", "Admin")}</option>
                  <option value="observer">{tr("Observateur", "Observer")}</option>
                </select>
              </div>

              {error ? (
                <p className="text-sm font-medium text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
