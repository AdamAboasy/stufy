import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/shell";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionFromCookies();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/admin");
  return (
    <AppShell user={user} variant="student">
      {children}
    </AppShell>
  );
}
