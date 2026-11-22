"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LangToggle } from "@/components/lang-toggle";
import { Logo } from "@/components/logo";
import { SetupNotice } from "@/components/setup-notice";
import { useAuth } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";

function errorKey(error: unknown): Key {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-login-credentials":
      return "errInvalidCredentials";
    case "auth/email-already-in-use":
      return "errEmailInUse";
    case "auth/weak-password":
      return "errWeakPassword";
    case "auth/invalid-email":
      return "errInvalidEmail";
    case "auth/operation-not-allowed":
      return "errOperationNotAllowed";
    case "auth/too-many-requests":
      return "errTooManyRequests";
    case "auth/network-request-failed":
      return "errNetwork";
    default:
      return "somethingWrong";
  }
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t } = useI18n();
  const { user, loading, configured, signIn, signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<Key | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await signIn(email.trim(), password);
      else await signUp(name, email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(errorKey(err));
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="auth-wrap">
      <div className="corner">
        <LangToggle />
      </div>
      <div className="auth-card stack">
        <div className="center stack" style={{ alignItems: "center" }}>
          <Logo size={88} />
          <h1>{isLogin ? t("loginTitle") : t("registerTitle")}</h1>
        </div>

        {!configured ? (
          <SetupNotice />
        ) : (
          <form className="card stack" onSubmit={onSubmit}>
            {!isLogin ? (
              <div className="field">
                <label htmlFor="name">{t("fullName")}</label>
                <input
                  id="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="email">{t("email")}</label>
              <input
                id="email"
                className="input"
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t("password")}</label>
              <input
                id="password"
                className="input"
                type="password"
                dir="ltr"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
            {error ? (
              <div className="alert alert-error" role="alert">
                {t(error)}
              </div>
            ) : null}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? t("loading") : isLogin ? t("login") : t("register")}
            </button>
          </form>
        )}

        <p className="center muted">
          {isLogin ? t("noAccount") : t("haveAccount")}{" "}
          <Link href={isLogin ? "/register" : "/login"}>{isLogin ? t("register") : t("login")}</Link>
        </p>
      </div>
    </div>
  );
}
