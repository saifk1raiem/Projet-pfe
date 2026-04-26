import { useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppPreferences } from "../context/AppPreferencesContext";
import { apiUrl } from "../lib/api";
import { appConfig } from "../lib/config";

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
    <div className="min-h-screen bg-[#f7f8fb] text-[#222222]">
      <header className="bg-white shadow-[0_12px_30px_rgba(20,24,31,0.06)]">
        <div className="bg-[#2d2d2d] text-white">
          <div className="mx-auto flex h-[46px] max-w-[1920px] items-center justify-between px-5 text-sm font-bold md:px-12">
            <span>+216 92 022 808</span>
            <span className="hidden gap-6 md:flex">
              <span>Youtube</span>
              <span>Linkedin</span>
            </span>
          </div>
        </div>
        <div className="mx-auto flex h-[100px] max-w-[1920px] items-center justify-between border-b border-[#eeeeee] px-5 md:px-12">
          <img src="/asm/logo-asm.png" alt="ASM Tunisie" className="h-[58px] w-[136px] object-contain" />
          <div className="hidden items-center gap-8 text-[14px] font-extrabold text-[#151515] lg:flex">
            <span className="border-t-[3px] border-[#ff6f00] pt-8">Accueil</span>
            <span>A propos</span>
            <span>Solutions metiers</span>
            <span>Votre espace</span>
          </div>
          <button className="hidden h-14 border border-[#ff6f00] px-9 text-[13px] font-black uppercase text-[#222222] transition hover:bg-[#ff6f00] hover:text-white sm:inline-flex sm:items-center">
            Contact
          </button>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-146px)] lg:h-[calc(100vh-146px)] lg:grid-cols-[minmax(0,1fr)_480px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_540px]">
        <section className="relative min-h-[360px] overflow-hidden bg-[#222222] text-white lg:h-full">
          <img
            src="/asm/hero-team.jpg"
            alt="ASM team"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(34,34,34,0.92)_0%,rgba(34,34,34,0.72)_45%,rgba(255,111,0,0.28)_100%)]" />
          <img
            src="/asm/experience-badge.png"
            alt="15 ans d'experience"
            className="absolute bottom-8 right-8 hidden h-48 w-48 rounded-full object-cover shadow-2xl xl:block"
          />
          <div className="relative z-10 flex min-h-[360px] max-w-3xl flex-col justify-end px-6 py-10 md:min-h-[calc(100vh-146px)] md:px-12 xl:px-16">
            <p className="text-[15px] font-extrabold uppercase text-[#ff8a1f]">{appConfig.applicationName}</p>
            <h1 className="mt-4 max-w-xl text-[42px] font-black leading-[1.05] md:text-[62px]">
              All Soft Multimedia
            </h1>
            <p className="mt-4 max-w-[330px] text-[20px] font-bold leading-snug text-white md:max-w-lg md:text-[30px]">
              Des solutions IT adaptees a tous vos besoins.
            </p>
            <div className="mt-8 h-1.5 w-32 bg-[#ff6f00]" />
          </div>
        </section>

        <section className="flex items-center bg-white px-5 py-10 md:px-10 lg:h-full">
          <div className="mx-auto w-full max-w-[420px]">
            <p className="text-[14px] font-black uppercase text-[#ff6f00]">
              {isLoginView ? tr("Acces compte", "Account access") : tr("Recuperation", "Recovery")}
            </p>
            <h2 className="mt-3 text-[36px] font-black leading-tight text-[#222222]">
              {isLoginView
                ? tr("Connexion", "Login")
                : isForgotView
                  ? tr("Recevoir un code", "Get a code")
                  : tr("Nouveau mot de passe", "New password")}
            </h2>

            {isLoginView ? (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#222222]" htmlFor="email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#616161]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={tr("nom@entreprise.com", "name@company.com")}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className="h-12 rounded-none border-[#d8d8d8] bg-white pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <label className="text-sm font-bold text-[#222222]" htmlFor="password">
                      {tr("Mot de passe", "Password")}
                    </label>
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="basis-full text-left text-xs font-bold text-[#ff6f00] transition hover:text-[#222222] sm:basis-auto sm:text-right sm:text-sm"
                    >
                      {tr("Mot de passe oublie ?", "Forgot password?")}
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#616161]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={tr("Entrez votre mot de passe", "Enter your password")}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="h-12 rounded-none border-[#d8d8d8] bg-white pl-10"
                    />
                  </div>
                </div>

                <Button className="h-12 w-full gap-2 rounded-none bg-[#ff6f00] text-sm font-black text-white hover:bg-[#222222]" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? tr("Connexion...", "Signing in...") : tr("Se connecter", "Sign In")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : null}

            {isForgotView ? (
              <form className="mt-8 space-y-5" onSubmit={handleForgotPassword}>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#222222]" htmlFor="reset-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#616161]" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder={tr("nom@entreprise.com", "name@company.com")}
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      required
                      className="h-12 rounded-none border-[#d8d8d8] bg-white pl-10"
                    />
                  </div>
                </div>

                <Button className="h-12 w-full gap-2 rounded-none bg-[#ff6f00] text-sm font-black text-white hover:bg-[#222222]" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? tr("Envoi du code...", "Sending code...") : tr("Envoyer le code", "Send code")}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  className="h-12 w-full gap-2 rounded-none border-[#222222] text-sm font-black text-[#222222]"
                  type="button"
                  variant="outline"
                  onClick={backToLogin}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {tr("Retour a la connexion", "Back to login")}
                </Button>
              </form>
            ) : null}

            {isResetView ? (
              <form className="mt-8 space-y-5" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#222222]" htmlFor="reset-email-confirm">
                    Email
                  </label>
                  <Input
                    id="reset-email-confirm"
                    type="email"
                    placeholder={tr("nom@entreprise.com", "name@company.com")}
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                    className="h-12 rounded-none border-[#d8d8d8] bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#222222]" htmlFor="reset-code">
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
                    className="h-12 rounded-none border-[#d8d8d8] bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#222222]" htmlFor="new-password">
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
                    className="h-12 rounded-none border-[#d8d8d8] bg-white"
                  />
                </div>

                <Button className="h-12 w-full gap-2 rounded-none bg-[#ff6f00] text-sm font-black text-white hover:bg-[#222222]" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? tr("Reinitialisation...", "Resetting password...")
                    : tr("Reinitialiser le mot de passe", "Reset password")}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    className="h-12 w-full text-sm font-bold"
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
                    className="h-12 w-full gap-2 text-sm font-bold"
                    type="button"
                    variant="outline"
                    onClick={backToLogin}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {tr("Retour", "Back")}
                  </Button>
                </div>
              </form>
            ) : null}

            {error ? (
              <p className="mt-5 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="mt-5 border-l-4 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800" role="status">
                {notice}
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
