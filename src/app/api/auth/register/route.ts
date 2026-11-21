import { cookies } from "next/headers";
import { registerSchema } from "@/lib/validation";
import { handleError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { registerStudent } from "@/services/auth";
import {
  DEVICE_COOKIE,
  REGISTRATION_COOKIE,
  SESSION_COOKIE,
  deviceCookieOptions,
  sessionCookieOptions,
  signSession,
  verifyRegistrationToken,
} from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { PlanType } from "@/types";

export async function POST(request: Request) {
  try {
    const rl = rateLimit(clientKey(request, "register"), 10, 60_000);
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many attempts.", 429);
    const store = await cookies();
    const token = store.get(REGISTRATION_COOKIE)?.value;
    if (!token) throw new ApiError("NO_CODE", "Validate an activation code first.");
    const payload = await verifyRegistrationToken(token);
    if (!payload) throw new ApiError("NO_CODE", "Activation session expired. Enter your code again.");
    const body = await parseJson<{ fullName: string; phoneNumber: string; password: string }>(request);
    const data = registerSchema.parse(body);
    const result = await registerStudent({
      ...data,
      codeId: payload.codeId,
      codeHash: payload.codeHash,
      planType: payload.planType as PlanType,
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    const session = await signSession(result.user);
    const res = jsonOk({ user: result.user });
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    res.cookies.set(DEVICE_COOKIE, result.deviceToken, deviceCookieOptions());
    res.cookies.delete(REGISTRATION_COOKIE);
    return res;
  } catch (error) {
    return handleError(error);
  }
}
