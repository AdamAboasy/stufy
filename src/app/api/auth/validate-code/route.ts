import { NextResponse } from "next/server";
import { activationCodeSchema } from "@/lib/validation";
import { handleError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { validateActivationCode } from "@/services/auth";
import { signRegistrationToken, REGISTRATION_COOKIE, registrationCookieOptions } from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { bootstrapIfNeeded } from "@/services/bootstrap";

export async function POST(request: Request) {
  try {
    await bootstrapIfNeeded();
    const rl = rateLimit(clientKey(request, "validate"), 20, 60_000);
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many attempts. Try again shortly.", 429);
    const body = await parseJson<{ code: string }>(request);
    const code = activationCodeSchema.parse(body.code);
    const result = await validateActivationCode(code);
    const token = await signRegistrationToken(result);
    const res = jsonOk({ planType: result.planType, valid: true });
    res.cookies.set(REGISTRATION_COOKIE, token, registrationCookieOptions());
    return res;
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ ok: false, error: { code: "INVALID", message: "Invalid code format." } }, { status: 400 });
    }
    return handleError(error);
  }
}
