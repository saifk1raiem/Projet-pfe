import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppPreferences } from "../context/AppPreferencesContext";
import { apiUrl } from "../lib/api";
import { appConfig } from "../lib/config";

const showcasePassword = appConfig.showcasePassword;

export function LoginPage({ onLogin }) {
  const { tr } = useAppPreferences();
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearMessages();
    setIsSubmitting(true);
    try {
      await onLogin({ email, password });
    } catch (err) {
      setError(err?.message || tr("Echec de connexion", "Login failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    clearMessages();
    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.detail || tr("Impossible d'envoyer le code", "Unable to send the code"));
      }

      setNotice(
        tr(
          "Un code de reinitialisation a ete envoye a votre email.",
          "A password reset code has been sent to your email.",
        ),
      );
      setResetCode("");
      setNewPassword("");
      setView("reset");
    } catch (err) {
      setError(err?.message || tr("Impossible d'envoyer le code", "Unable to send the code"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    clearMessages();
    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          code: resetCode,
          new_password: newPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.detail || tr("Impossible de reinitialiser le mot de passe", "Unable to reset the password"));
      }

      setEmail(resetEmail);
      setPassword("");
      setResetCode("");
      setNewPassword("");
      setView("login");
      setNotice(
        tr(
          "Mot de passe reinitialise. Connectez-vous avec votre nouveau mot de passe.",
          "Password reset. Sign in with your new password.",
        ),
      );
    } catch (err) {
      setError(
        err?.message || tr("Impossible de reinitialiser le mot de passe", "Unable to reset the password"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openForgotPassword = () => {
    clearMessages();
    setResetEmail(email);
    setResetCode("");
    setNewPassword("");
    setView("forgot");
  };

  const backToLogin = () => {
    clearMessages();
    setView("login");
  };

  const isLoginView = view === "login";
  const isForgotView = view === "forgot";
  const isResetView = view === "reset";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9e7f5_0%,#f4f7fb_45%,#eef4fb_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-[#d4dfeb] bg-white shadow-[0_22px_50px_rgba(13,58,103,0.16)] md:grid-cols-2">
          <div className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#004681_0%,#005ca9_45%,#52a7e8_100%)] p-10 text-white md:block">
            <div className="relative z-10">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-white/80">
                {appConfig.applicationName}
              </p>
              <h1 className="mt-5 text-3xl font-semibold leading-tight">
                {isLoginView ? tr("Bon retour", "Welcome back") : tr("Recuperation du compte", "Account recovery")}
              </h1>
              <p className="mt-3 max-w-xs text-sm leading-6 text-white/85">
                {isLoginView
                  ? tr(
                      "Connectez-vous pour gerer les formations, qualifications et collaborateurs depuis un seul espace.",
                      "Sign in to manage training, qualifications, and collaborators from one place.",
                    )
                  : tr(
                      "Demandez un code par email, puis choisissez un nouveau mot de passe pour retrouver l'acces a votre compte.",
                      "Request a code by email, then choose a new password to regain access to your account.",
                    )}
              </p>
            </div>
            <div className="pointer-events-none absolute -right-12 -top-10 h-56 w-56 rounded-full bg-white/15 blur-xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-60 w-60 rounded-full bg-[#6dc1ff]/30 blur-xl" />
          </div>

          <div className="p-7 sm:p-10">
            <div className="mb-4">
              <img
                src="/leoni-logo.svg"
                alt="Leoni"
                className="h-8 w-auto"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="text-sm font-medium text-[#5d7088]">
              {isLoginView ? tr("Acces compte", "Account access") : tr("Mot de passe oublie", "Forgot password")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#13263f]">
              {isLoginView
                ? tr("Connexion", "Login")
                : isForgotView
                  ? tr("Recevoir un code", "Get a code")
                  : tr("Reinitialiser le mot de passe", "Reset password")}
            </h2>

            {!isLoginView ? (
              <div className="mt-6 rounded-2xl border border-[#d8e4ef] bg-[#f7fbff] p-4 text-sm leading-6 text-[#355170]">
                {isForgotView ? (
                  <p>
                    {tr(
                      "Saisissez l'email du compte et nous enverrons un code a 6 chiffres. Si l'email n'est lie a aucun compte, vous verrez le message correspondant.",
                      "Enter the account email and we will send a 6-digit code. If the email is not linked to an account, you will see the matching message.",
                    )}
                  </p>
                ) : (
                  <p>
                    {tr(
                      "Consultez votre boite mail, entrez le code recu, puis choisissez un nouveau mot de passe d'au moins 8 caracteres.",
                      "Check your inbox, enter the code you received, then choose a new password with at least 8 characters.",
                    )}
                  </p>
                )}
              </div>
            ) : null}

            {isLoginView ? (
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
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-[#1a3252]" htmlFor="password">
                      {tr("Mot de passe", "Password")}
                    </label>
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-sm font-medium text-[#005ca9] transition hover:text-[#004681]"
                    >
                      {tr("Mot de passe oublie ?", "Forgot password?")}
                    </button>
                  </div>
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
              </form>
            ) : null}

            {isForgotView ? (
              <form className="mt-8 space-y-5" onSubmit={handleForgotPassword}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1a3252]" htmlFor="reset-email">
                    Email
                  </label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder={tr("nom@entreprise.com", "name@company.com")}
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                    className="h-11 border-[#c8d8e8] bg-white"
                  />
                </div>

                <Button className="h-11 w-full text-sm font-semibold" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? tr("Envoi du code...", "Sending code...") : tr("Envoyer le code", "Send code")}
                </Button>

                <Button
                  className="h-11 w-full text-sm font-semibold"
                  type="button"
                  variant="outline"
                  onClick={backToLogin}
                  disabled={isSubmitting}
                >
                  {tr("Retour a la connexion", "Back to login")}
                </Button>
              </form>
            ) : null}

            {isResetView ? (
              <form className="mt-8 space-y-5" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1a3252]" htmlFor="reset-email-confirm">
                    Email
                  </label>
                  <Input
                    id="reset-email-confirm"
                    type="email"
                    placeholder={tr("nom@entreprise.com", "name@company.com")}
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                    className="h-11 border-[#c8d8e8] bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1a3252]" htmlFor="reset-code">
                    {tr("Code de reinitialisation", "Reset code")}
                  </label>
                  <Input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    placeholder={tr("Entrez le code a 6 chiffres", "Enter the 6-digit code")}
                    value={resetCode}
                    onChange={(event) => setResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    required
                    className="h-11 border-[#c8d8e8] bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1a3252]" htmlFor="new-password">
                    {tr("Nouveau mot de passe", "New password")}
                  </label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder={tr("Minimum 8 caracteres", "Minimum 8 characters")}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={8}
                    required
                    className="h-11 border-[#c8d8e8] bg-white"
                  />
                </div>

                <Button className="h-11 w-full text-sm font-semibold" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? tr("Reinitialisation...", "Resetting password...")
                    : tr("Reinitialiser le mot de passe", "Reset password")}
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    className="h-11 w-full text-sm font-semibold"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      clearMessages();
                      setView("forgot");
                    }}
                    disabled={isSubmitting}
                  >
                    {tr("Renvoyer un code", "Resend code")}
                  </Button>
                  <Button
                    className="h-11 w-full text-sm font-semibold"
                    type="button"
                    variant="outline"
                    onClick={backToLogin}
                    disabled={isSubmitting}
                  >
                    {tr("Retour a la connexion", "Back to login")}
                  </Button>
                </div>
              </form>
            ) : null}

            {error ? (
              <p className="mt-5 text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="mt-5 text-sm font-medium text-emerald-700" role="status">
                {notice}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
