import { handleError, jsonOk, requireAdmin } from "@/lib/http";
import { adminDb, Collections } from "@/lib/firebase/admin";
import { listLogs } from "@/services/logs";

export async function GET() {
  try {
    await requireAdmin();
    const db = adminDb();
    const [
      students,
      activeSubs,
      expiredSubs,
      availableCodes,
      activeCodes,
      suspended,
      pendingDevices,
      logs,
    ] = await Promise.all([
      db.collection(Collections.students).count().get(),
      db.collection(Collections.subscriptions).where("status", "==", "active").count().get(),
      db.collection(Collections.subscriptions).where("status", "==", "expired").count().get(),
      db.collection(Collections.activationCodes).where("status", "==", "available").count().get(),
      db.collection(Collections.activationCodes).where("status", "==", "active").count().get(),
      db.collection(Collections.students).where("accountStatus", "==", "suspended").count().get(),
      db.collection(Collections.deviceChangeRequests).where("status", "==", "pending").count().get(),
      listLogs(8),
    ]);
    return jsonOk({
      totalStudents: students.data().count,
      activeSubscriptions: activeSubs.data().count,
      expiredSubscriptions: expiredSubs.data().count,
      availableCodes: availableCodes.data().count,
      activeCodes: activeCodes.data().count,
      suspendedAccounts: suspended.data().count,
      pendingDeviceRequests: pendingDevices.data().count,
      recentActivities: logs.items,
    });
  } catch (error) {
    return handleError(error);
  }
}
