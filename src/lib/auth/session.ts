import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  DEVICE_COOKIE,
  LANG_COOKIE,
  REGISTRATION_COOKIE,
  REGISTRATION_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/constants";
import type { Language, SessionUser } from "@/types";

function secret() {
  const value = process.env.SESSION_SECRET || "stufy-dev-session-secret-key-min-32-chars";
  return new TextEncoder().encode(value);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.uid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.role) return null;
    return {
      uid: payload.sub,
      role: payload.role as SessionUser["role"],
      admin: Boolean(payload.admin),
      phoneNumber: String(payload.phoneNumber || ""),
      fullName: String(payload.fullName || ""),
      language: (payload.language as Language) || "ar",
      accountStatus: (payload.accountStatus as SessionUser["accountStatus"]) || "active",
    };
  } catch {
    return null;
  }
}

export async function signRegistrationToken(data: {
  codeId: string;
  codeHash: string;
  planType: string;
}) {
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REGISTRATION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyRegistrationToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.codeId || !payload.codeHash || !payload.planType) return null;
    return {
      codeId: String(payload.codeId),
      codeHash: String(payload.codeHash),
      planType: String(payload.planType),
    };
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function deviceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

export function registrationCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REGISTRATION_TTL_SECONDS,
  };
}

export { SESSION_COOKIE, DEVICE_COOKIE, LANG_COOKIE, REGISTRATION_COOKIE };
