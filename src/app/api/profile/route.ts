import { FieldValue } from "firebase-admin/firestore";
import { adminDb, Collections } from "@/lib/firebase/admin";
import { handleError, jsonOk, parseJson, requireStudent, getStudent } from "@/lib/http";
import {
  DEVICE_COOKIE,
  LANG_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const user = await requireStudent();
    const profile = await getStudent(user.uid);
    return jsonOk({ profile });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireStudent();
    const body = await parseJson<{
      fullName?: string;
      preferredLanguage?: "ar" | "en";
      theme?: "light" | "dark" | "system";
      restDays?: number[];
      preferredSessionMinutes?: number;
      dailyStudyMinutes?: number;
      timezone?: string;
    }>(request);
    const allowed: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (body.fullName) allowed.fullName = body.fullName.trim();
    if (body.preferredLanguage) allowed.preferredLanguage = body.preferredLanguage;
    if (body.theme) allowed.theme = body.theme;
    if (body.restDays) allowed.restDays = body.restDays;
    if (body.preferredSessionMinutes) allowed.preferredSessionMinutes = body.preferredSessionMinutes;
    if (body.dailyStudyMinutes) allowed.dailyStudyMinutes = body.dailyStudyMinutes;
    if (body.timezone) allowed.timezone = body.timezone;
    await adminDb().collection(Collections.students).doc(user.uid).update(allowed);
    const profile = await getStudent(user.uid);
    const session = await signSession({
      ...user,
      fullName: profile.fullName,
      language: profile.preferredLanguage,
    });
    const res = jsonOk({ profile });
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    if (body.preferredLanguage) {
      res.cookies.set(LANG_COOKIE, body.preferredLanguage, { path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
    return res;
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE() {
  const store = await cookies();
  store.get(DEVICE_COOKIE);
  return jsonOk({ ok: true });
}
