import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";

export default async function Home() {
  const user = await getSessionFromCookies();
  if (!user) redirect("/activate");
  if (user.role === "admin") redirect("/admin");
  redirect("/dashboard");
}
