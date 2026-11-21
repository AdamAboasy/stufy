import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionFromCookies();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return (
    <AppShell user={user} variant="admin">
      {children}
    </AppShell>
  );
}
