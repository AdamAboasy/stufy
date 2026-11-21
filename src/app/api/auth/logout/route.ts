import { jsonOk } from "@/lib/http";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const res = jsonOk({ loggedOut: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
