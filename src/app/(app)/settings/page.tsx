"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n, type Key, type Lang } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";

const THEMES: Array<{ id: Theme; label: Key }> = [
  { id: "light", label: "themeLight" },
  { id: "dark", label: "themeDark" },
  { id: "system", label: "themeSystem" },
];

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, logOut, setDisplayName } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setName(user?.displayName ?? "");
  }, [user?.displayName]);

  async function onSaveName(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    setError(false);
    try {
      await setDisplayName(name);
      setSaved(true);
    } catch {
      setError(true);
    }
  }

  async function onLogout() {
    await logOut();
    router.replace("/login");
  }

  const languages: Array<{ id: Lang; label: string }> = [
    { id: "ar", label: "العربية" },
    { id: "en", label: "English" },
  ];

  return (
    <div className="stack">
      <h1 className="page-title">{t("settingsTitle")}</h1>

      <div className="card stack">
        <h2>{t("language")}</h2>
        <div className="chips">
          {languages.map((l) => (
            <button key={l.id} type="button" className="chip" aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h2>{t("theme")}</h2>
        <div className="chips">
          {THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={theme === item.id}
              onClick={() => setTheme(item.id)}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </div>

      <form className="card stack" onSubmit={onSaveName}>
        <h2>{t("account")}</h2>
        <div className="muted" dir="ltr" style={{ textAlign: "start" }}>
          {user?.email}
        </div>
        <div className="field">
          <label htmlFor="display-name">{t("displayName")}</label>
          <input id="display-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {saved ? <div className="alert alert-success">{t("saved")}</div> : null}
        {error ? <div className="alert alert-error">{t("somethingWrong")}</div> : null}
        <div className="row">
          <button className="btn btn-primary" type="submit">
            {t("save")}
          </button>
          <span className="spacer" />
          <button className="btn btn-danger" type="button" onClick={onLogout}>
            {t("logout")}
          </button>
        </div>
      </form>
    </div>
  );
}
