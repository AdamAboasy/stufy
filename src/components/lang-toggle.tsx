"use client";

import { useI18n } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  const next = lang === "ar" ? "en" : "ar";
  return (
    <button type="button" className="btn btn-sm" onClick={() => setLang(next)} aria-label="Change language">
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}
