import { FieldValue } from "firebase-admin/firestore";
import { adminDb, Collections } from "@/lib/firebase/admin";
import { handleError, jsonOk, parseJson, ApiError } from "@/lib/http";
import { phoneSchema } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const rl = rateLimit(clientKey(request, "forgot"), 8, 60_000);
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many attempts.", 429);
    const body = await parseJson<{ phoneNumber: string }>(request);
    const phoneNumber = phoneSchema.parse(body.phoneNumber);
    const snap = await adminDb()
      .collection(Collections.students)
      .where("phoneNumber", "==", phoneNumber)
      .limit(1)
      .get();
    if (!snap.empty) {
      await adminDb().collection(Collections.passwordRecoveryRequests).add({
        studentId: snap.docs[0].id,
        phoneNumber,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    return jsonOk({
      submitted: true,
      message: "If an account exists, a recovery request was sent to the administrator.",
    });
  } catch (error) {
    return handleError(error);
  }
}
