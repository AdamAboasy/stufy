import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { LANG_COOKIE } from "@/lib/constants";
import type { Language } from "@/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stufy — Smart Study Planner",
  description: "AI-powered study planning for students.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const lang = (store.get(LANG_COOKIE)?.value === "en" ? "en" : "ar") as Language;
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
