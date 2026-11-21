import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validation";
import { handleError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { loginWithPhone } from "@/services/auth";
import {
  DEVICE_COOKIE,
  SESSION_COOKIE,
  deviceCookieOptions,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { bootstrapIfNeeded } from "@/services/bootstrap";

export async function POST(request: Request) {
  try {
    await bootstrapIfNeeded();
    const rl = rateLimit(clientKey(request, "login"), 15, 60_000);
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many attempts.", 429);
    const body = await parseJson<{ phoneNumber: string; password: string }>(request);
    const data = loginSchema.parse(body);
    const store = await cookies();
    const result = await loginWithPhone({
      ...data,
      userAgent: request.headers.get("user-agent") || "unknown",
      deviceToken: store.get(DEVICE_COOKIE)?.value || null,
    });
    if (result.deviceMismatch) {
      return jsonOk({
        deviceMismatch: true,
        currentDeviceName: result.currentDevice?.deviceName || "another device",
        user: { fullName: result.user.fullName },
      });
    }
    const session = await signSession(result.user);
    const res = jsonOk({ user: result.user, deviceMismatch: false });
    res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions());
    if (result.deviceToken) {
      res.cookies.set(DEVICE_COOKIE, result.deviceToken, deviceCookieOptions());
    }
    return res;
  } catch (error) {
    return handleError(error);
  }
}
