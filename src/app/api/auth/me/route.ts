import { handleError, jsonOk, requireUser, getStudent } from "@/lib/http";
import { adminDb, Collections } from "@/lib/firebase/admin";
import { getStudentSubscription } from "@/services/subscriptions";
import { getActiveDevice } from "@/services/devices";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role === "admin") {
      const snap = await adminDb().collection(Collections.admins).doc(user.uid).get();
      return jsonOk({ user, profile: snap.data() || null, subscription: null });
    }
    const profile = await getStudent(user.uid);
    const subscription = await getStudentSubscription(user.uid);
    const device = await getActiveDevice(user.uid);
    return jsonOk({ user, profile, subscription, device });
  } catch (error) {
    return handleError(error);
  }
}
