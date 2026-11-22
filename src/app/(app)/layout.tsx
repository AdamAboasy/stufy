"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LangToggle } from "@/components/lang-toggle";
import { Logo } from "@/components/logo";
import { SetupNotice } from "@/components/setup-notice";
import { useAuth } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";

const NAV: Array<{ href: string; label: Key }> = [
  { href: "/dashboard", label: "navDashboard" },
  { href: "/subjects", label: "navSubjects" },
  { href: "/plan", label: "navPlan" },
  { href: "/tasks", label: "navTasks" },
  { href: "/settings", label: "navSettings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (configured && !loading && !user) router.replace("/login");
  }, [configured, loading, user, router]);

  if (!configured) {
    return (
      <main className="page">
        <SetupNotice />
      </main>
    );
  }

  if (loading || !user) {
    return <div className="spinner-wrap">{t("loading")}</div>;
  }

  const links = NAV.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      className="nav-link"
      aria-current={pathname === item.href ? "page" : undefined}
    >
      {t(item.label)}
    </Link>
  ));

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/dashboard" className="brand">
            <Logo size={36} />
            <span>{t("appName")}</span>
          </Link>
          <nav className="nav-desktop">{links}</nav>
          <LangToggle />
        </div>
      </header>
      <main className="page">{children}</main>
      <nav className="nav-mobile">{links}</nav>
    </div>
  );
}
