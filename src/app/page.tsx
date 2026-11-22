"use client";

import Link from "next/link";
import { LangToggle } from "@/components/lang-toggle";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function LandingPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();

  return (
    <>
      <div className="corner">
        <LangToggle />
      </div>
      <main className="hero">
        <Logo size={160} />
        <h1>{t("heroTitle")}</h1>
        <p>{t("heroSub")}</p>
        <div className="row" style={{ justifyContent: "center" }}>
          {!loading && user ? (
            <Link className="btn btn-primary" href="/dashboard">
              {t("goToApp")}
            </Link>
          ) : (
            <>
              <Link className="btn btn-primary" href="/register">
                {t("getStarted")}
              </Link>
              <Link className="btn" href="/login">
                {t("login")}
              </Link>
            </>
          )}
        </div>
      </main>
      <section className="page" style={{ paddingTop: 8 }}>
        <div className="grid-3">
          <div className="card">
            <h2>{t("f1Title")}</h2>
            <p className="muted">{t("f1Desc")}</p>
          </div>
          <div className="card">
            <h2>{t("f2Title")}</h2>
            <p className="muted">{t("f2Desc")}</p>
          </div>
          <div className="card">
            <h2>{t("f3Title")}</h2>
            <p className="muted">{t("f3Desc")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
