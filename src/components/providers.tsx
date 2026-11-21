"use client";

import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n";
import { fetcher } from "@/lib/api";
import type { Language } from "@/types";

export function Providers({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: Language;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: true,
          shouldRetryOnError: false,
        }}
      >
        <I18nProvider initialLang={lang}>
          {children}
          <Toaster richColors position="top-center" />
        </I18nProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
