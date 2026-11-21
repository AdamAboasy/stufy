import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth/session";
import { adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import type { SessionUser, StudentProfile } from "@/types";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.code, error.message, error.status);
  }
  if (error && typeof error === "object" && "issues" in error) {
    return jsonError("INVALID", "Please check the submitted values.", 400);
  }
  console.error(error);
  return jsonError("INTERNAL", "Something went wrong.", 500);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionFromCookies();
  if (!user) throw new ApiError("UNAUTHENTICATED", "Please sign in.", 401);
  if (user.accountStatus === "suspended") {
    throw new ApiError("SUSPENDED", "This account is suspended.", 403);
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.admin || user.role !== "admin") {
    throw new ApiError("FORBIDDEN", "Administrator access required.", 403);
  }
  return user;
}

export async function requireStudent(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "student") {
    throw new ApiError("FORBIDDEN", "Student access required.", 403);
  }
  return user;
}

export async function getStudent(uid: string) {
  const snap = await adminDb().collection(Collections.students).doc(uid).get();
  if (!snap.exists) throw new ApiError("NOT_FOUND", "Student not found.", 404);
  return serializeDoc<StudentProfile>(snap.id, snap.data()!);
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("INVALID_JSON", "Invalid JSON body.");
  }
}

export async function deviceTokenFromCookie() {
  const store = await cookies();
  return store.get("stufy_device")?.value || null;
}
