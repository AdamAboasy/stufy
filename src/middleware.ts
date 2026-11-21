import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = [
  "/login",
  "/activate",
  "/register",
  "/forgot-password",
  "/device-blocked",
];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/dev")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/login" : "/activate";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET || "stufy-dev-session-secret-key-min-32-chars",
    );
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as string;
    if (pathname.startsWith("/admin") && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    if (!pathname.startsWith("/admin") && role === "admin" && pathname !== "/") {
      const studentPaths = [
        "/dashboard",
        "/library",
        "/plans",
        "/tasks",
        "/calendar",
        "/routine",
        "/statistics",
        "/notifications",
        "/profile",
        "/settings",
        "/subscription",
      ];
      if (studentPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
