import { cookies } from "next/headers";
import { handleError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { loginWithPhone } from "@/services/auth";
import { createDeviceChangeRequest } from "@/services/devices";
import { DEVICE_COOKIE, deviceCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await parseJson<{ phoneNumber: string; password: string }>(request);
    const data = loginSchema.parse(body);
    const store = await cookies();
    const result = await loginWithPhone({
      ...data,
      userAgent: request.headers.get("user-agent") || "unknown",
      deviceToken: store.get(DEVICE_COOKIE)?.value || null,
    });
    if (result.user.role !== "student") {
      throw new ApiError("FORBIDDEN", "Administrators do not use device locking.");
    }
    const created = await createDeviceChangeRequest({
      studentId: result.user.uid,
      studentName: result.user.fullName,
      userAgent: request.headers.get("user-agent") || "unknown",
    });
    const res = jsonOk({ requestId: created.requestId, pending: true });
    res.cookies.set(DEVICE_COOKIE, created.token, deviceCookieOptions());
    return res;
  } catch (error) {
    return handleError(error);
  }
}
