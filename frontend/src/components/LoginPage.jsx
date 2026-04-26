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
    <div className="min-h-screen bg-[#f2f3f4] text-[#001932]">
      <header className="border-b border-[#d8dbdf] bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1920px] items-center justify-between px-5 md:px-12">
          <img src="/leoni/logo-leoni.svg" alt="LEONI" className="h-[37px] w-[158px]" />
          <div className="hidden items-center gap-7 text-[15px] font-medium text-[#586879] md:flex">
            <span className="font-bold text-[#002857]">Tunisia</span>
            <span>LEONI Worldwide</span>
            <span>English</span>
          </div>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-72px)] lg:h-[calc(100vh-72px)] lg:grid-cols-[minmax(0,1fr)_480px] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_540px]">
        <section className="relative min-h-[360px] overflow-hidden bg-[#002857] text-white lg:h-full">
          <img
            src="/leoni/leoni-hero.webp"
            alt="LEONI production workspace"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,40,87,0.88)_0%,rgba(0,40,87,0.64)_42%,rgba(0,40,87,0.16)_100%)]" />
          <div className="relative z-10 flex min-h-[360px] max-w-3xl flex-col justify-end px-6 py-10 md:min-h-[calc(100vh-72px)] md:px-12 xl:px-16">
            <p className="text-[15px] font-semibold uppercase text-[#abe6ff]">{appConfig.applicationName}</p>
            <h1 className="mt-4 max-w-xl text-[44px] font-bold leading-[1.05] md:text-[64px]">
              We are LEONI
            </h1>
            <p className="mt-4 max-w-lg text-[24px] font-semibold text-white md:text-[32px]">
              Your Empowering Connection.
            </p>
            <div className="mt-8 h-2 w-32 rounded-full bg-[#ff7514]" />
          </div>
        </section>

        <section className="flex items-center bg-white px-5 py-10 md:px-10 lg:h-full">
          <div className="mx-auto w-full max-w-[420px]">
            <p className="text-[14px] font-bold uppercase text-[#ff7514]">
              {isLoginView ? tr("Acces compte", "Account access") : tr("Recuperation", "Recovery")}
            </p>
            <h2 className="mt-3 text-[36px] font-bold leading-tight text-[#002857]">
              {isLoginView
                ? tr("Connexion", "Login")
                : isForgotView
                  ? tr("Recevoir un code", "Get a code")
                  : tr("Nouveau mot de passe", "New password")}
            </h2>

            {isLoginView ? (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#253b50]" htmlFor="email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#586879]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={tr("nom@entreprise.com", "name@company.com")}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className="h-12 rounded-[4px] border-[#bec4ca] bg-white pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <label className="text-sm font-semibold text-[#253b50]" htmlFor="password">
                      {tr("Mot de passe", "Password")}
                    </label>
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="basis-full text-left text-xs font-semibold text-[#0064c8] transition hover:text-[#002857] sm:basis-auto sm:text-right sm:text-sm"
                    >
                      {tr("Mot de passe oublie ?", "Forgot password?")}
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#586879]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={tr("Entrez votre mot de passe", "Enter your password")}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="h-12 rounded-[4px] border-[#bec4ca] bg-white pl-10"
                    />
                  </div>
                </div>

                <Button className="h-12 w-full gap-2 rounded-[4px] bg-[#ff7514] text-sm font-bold text-white hover:bg-[#e6650f]" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? tr("Connexion...", "Signing in...") : tr("Se connecter", "Sign In")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : null}

            {isForgotView ? (
              <form className="mt-8 space-y-5" onSubmit={handleForgotPassword}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#253b50]" htmlFor="reset-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#586879]" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder={tr("nom@entreprise.com", "name@company.com")}
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      required
                      className="h-12 rounded-[4px] border-[#bec4ca] bg-white pl-10"
                    />
                  </div>
                </div>

                <Button className="h-12 w-full gap-2 rounded-[4px] bg-[#ff7514] text-sm font-bold text-white hover:bg-[#e6650f]" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? tr("Envoi du code...", "Sending code...") : tr("Envoyer le code", "Send code")}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  className="h-12 w-full gap-2 rounded-[4px] border-[#002857] text-sm font-bold text-[#002857]"
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
                  <label className="text-sm font-semibold text-[#253b50]" htmlFor="reset-email-confirm">
                    Email
                  </label>
                  <Input
                    id="reset-email-confirm"
                    type="email"
                    placeholder={tr("nom@entreprise.com", "name@company.com")}
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    required
                    className="h-12 rounded-[4px] border-[#bec4ca] bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#253b50]" htmlFor="reset-code">
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
                    className="h-12 rounded-[4px] border-[#bec4ca] bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#253b50]" htmlFor="new-password">
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
                    className="h-12 rounded-[4px] border-[#bec4ca] bg-white"
                  />
                </div>

                <Button className="h-12 w-full gap-2 rounded-[4px] bg-[#ff7514] text-sm font-bold text-white hover:bg-[#e6650f]" type="submit" disabled={isSubmitting}>
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
