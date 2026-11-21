"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import ar from "./ar";
import en, { type Dictionary } from "./en";
import type { Language } from "@/types";

const dicts: Record<Language, Dictionary> = { ar, en };

type Vars = Record<string, string | number>;

type I18nContextValue = {
  lang: Language;
  dir: "rtl" | "ltr";
  t: (key: string, vars?: Vars) => string;
  setLang: (lang: Language) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function lookup(dict: Dictionary, key: string): string {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const part of parts) {
    if (typeof cur !== "object" || cur === null) return key;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : key;
}

export function I18nProvider({
  children,
  initialLang,
  onChange,
}: {
  children: ReactNode;
  initialLang: Language;
  onChange?: (lang: Language) => void;
}) {
  const lang = initialLang;
  const t = useCallback(
    (key: string, vars?: Vars) => {
      let value = lookup(dicts[lang], key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replaceAll(`{${k}}`, String(v));
        }
      }
      return value;
    },
    [lang],
  );

  const value = useMemo(
    () => ({
      lang,
      dir: (lang === "ar" ? "rtl" : "ltr") as "rtl" | "ltr",
      t,
      setLang: (next: Language) => onChange?.(next),
    }),
    [lang, t, onChange],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
