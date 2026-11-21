import { handleError, jsonOk, requireAdmin } from "@/lib/http";
import { adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import type { StudentProfile } from "@/types";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() || "";
    const status = url.searchParams.get("status");
    let query: FirebaseFirestore.Query = adminDb().collection(Collections.students);
    if (status) query = query.where("accountStatus", "==", status);
    const snap = await query.limit(200).get();
    let items = snap.docs.map((d) => serializeDoc<StudentProfile>(d.id, d.data()));
    if (q) {
      items = items.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.phoneNumber.includes(q) ||
          s.uid.toLowerCase().includes(q),
      );
    }
    return jsonOk({ items });
  } catch (error) {
    return handleError(error);
  }
}
