import { FieldValue } from "firebase-admin/firestore";
import { adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import { handleError, jsonOk, parseJson, requireAdmin, ApiError } from "@/lib/http";
import { getStudentSubscription } from "@/services/subscriptions";
import { getActiveDevice } from "@/services/devices";
import { writeLog } from "@/services/logs";
import type { StudentProfile } from "@/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const snap = await adminDb().collection(Collections.students).doc(id).get();
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Student not found.", 404);
    const student = serializeDoc<StudentProfile>(snap.id, snap.data()!);
    const subscription = await getStudentSubscription(id);
    const device = await getActiveDevice(id);
    return jsonOk({ student, subscription, device });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await parseJson<{ accountStatus: "active" | "suspended" }>(request);
    await adminDb().collection(Collections.students).doc(id).update({
      accountStatus: body.accountStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await writeLog({
      actorId: admin.uid,
      actorRole: "admin",
      actorName: admin.fullName,
      action: body.accountStatus === "suspended" ? "account.suspend" : "account.restore",
      targetId: id,
    });
    return jsonOk({ updated: true });
  } catch (error) {
    return handleError(error);
  }
}
