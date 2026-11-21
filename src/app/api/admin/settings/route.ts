import { adminDb, Collections } from "@/lib/firebase/admin";
import { handleError, jsonOk, parseJson, requireAdmin } from "@/lib/http";
import { writeLog } from "@/services/logs";

export async function GET() {
  try {
    await requireAdmin();
    const snap = await adminDb().collection(Collections.systemSettings).doc("default").get();
    return jsonOk({
      settings: snap.data() || {
        maintenanceMode: false,
        allowRegistrations: true,
        maxFileSizeMb: 25,
        subscriptionReminderDays: 3,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await parseJson<Record<string, unknown>>(request);
    await adminDb().collection(Collections.systemSettings).doc("default").set(body, { merge: true });
    await writeLog({
      actorId: admin.uid,
      actorRole: "admin",
      actorName: admin.fullName,
      action: "settings.update",
      targetId: "default",
    });
    return jsonOk({ saved: true });
  } catch (error) {
    return handleError(error);
  }
}
