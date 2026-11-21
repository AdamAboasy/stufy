import { jsonOk, jsonError, requireAdmin } from "@/lib/http";
import { adminDb, Collections, useEmulators, useLocalBackend } from "@/lib/firebase/admin";
import { bootstrapIfNeeded } from "@/services/bootstrap";

export async function GET() {
  if ((!useEmulators() && !useLocalBackend()) || process.env.NODE_ENV === "production") {
    return jsonError("NOT_FOUND", "Not found", 404);
  }
  try {
    await requireAdmin();
    await bootstrapIfNeeded();
    const snap = await adminDb().collection(Collections.systemSettings).doc("dev").get();
    return jsonOk({
      emulator: true,
      demoCodes: snap.data()?.demoCodes || [],
      adminPhone: process.env.ADMIN_BOOTSTRAP_PHONE || "+201000000000",
    });
  } catch {
    // Public callers never learn whether demo codes exist.
    return jsonError("FORBIDDEN", "Admins only.", 403);
  }
}
