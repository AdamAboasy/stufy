"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Timer,
  UserRound,
  CreditCard,
  Users,
  KeyRound,
  Smartphone,
  Files,
  ScrollText,
  Shield,
  X,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { cn, initials } from "@/lib/utils";
import { useTheme } from "next-themes";
import type { SessionUser } from "@/types";

const studentNav = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/library", key: "nav.library", icon: Library },
  { href: "/plans", key: "nav.plans", icon: BookOpen },
  { href: "/tasks", key: "nav.tasks", icon: ClipboardList },
  { href: "/calendar", key: "nav.calendar", icon: CalendarDays },
  { href: "/routine", key: "nav.routine", icon: Timer },
  { href: "/statistics", key: "nav.statistics", icon: Gauge },
  { href: "/notifications", key: "nav.notifications", icon: Bell },
  { href: "/profile", key: "nav.profile", icon: UserRound },
  { href: "/settings", key: "nav.settings", icon: Settings },
  { href: "/subscription", key: "nav.subscription", icon: CreditCard },
];

const adminNav = [
  { href: "/admin", key: "nav.overview", icon: Shield },
  { href: "/admin/students", key: "nav.students", icon: Users },
  { href: "/admin/codes", key: "nav.codes", icon: KeyRound },
  { href: "/admin/subscriptions", key: "nav.subscriptions", icon: CreditCard },
  { href: "/admin/devices", key: "nav.devices", icon: Smartphone },
  { href: "/admin/files", key: "nav.files", icon: Files },
  { href: "/admin/logs", key: "nav.logs", icon: ScrollText },
  { href: "/admin/settings", key: "nav.adminSettings", icon: Settings },
];

export function AppShell({
  children,
  user,
  variant,
}: {
  children: React.ReactNode;
  user: SessionUser;
  variant: "student" | "admin";
}) {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = variant === "admin" ? adminNav : studentNav;
  const { data: notif } = useSWR(variant === "student" ? "/notifications" : null);
  const unread = (notif as { unread?: number } | undefined)?.unread || 0;

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const aside = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <button className="lg:hidden" onClick={() => setOpen(false)}>
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{t(item.key)}</span>
              {item.href === "/notifications" && unread > 0 ? (
                <span className="rounded-md bg-white/20 px-1.5 text-[10px]">{unread}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            {initials(user.fullName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.role === "admin" ? "Super Admin" : user.phoneNumber}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={logout}>
          <LogOut className="size-4" />
          {t("nav.logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e border-border bg-sidebar lg:block">
        {aside}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 bg-sidebar shadow-xl">{aside}</aside>
        </div>
      ) : null}
      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
          <button className="rounded-lg p-2 hover:bg-surface-muted lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = lang === "ar" ? "en" : "ar";
              setLang(next);
              document.cookie = `stufy_lang=${next};path=/;max-age=31536000`;
              document.documentElement.lang = next;
              document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
              void api("/profile", {
                method: "PATCH",
                body: JSON.stringify({ preferredLanguage: next }),
              }).catch(() => null);
              window.location.reload();
            }}
          >
            {lang === "ar" ? "EN" : "ع"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sparkles className="size-4" />
          </Button>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 lg:px-8">{children}</main>
        {variant === "student" ? (
          <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface px-1 py-2 lg:hidden">
            {studentNav.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg py-1 text-[10px]",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
