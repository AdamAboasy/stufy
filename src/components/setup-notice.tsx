"use client";

import { useI18n } from "@/lib/i18n";

const VARS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

export function SetupNotice() {
  const { t } = useI18n();
  return (
    <div className="card stack" role="alert">
      <h2>{t("setupTitle")}</h2>
      <p className="muted">{t("setupBody")}</p>
      <ul>
        {VARS.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
