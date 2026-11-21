import { FieldValue } from "firebase-admin/firestore";
import { adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/http";
import type { Routine } from "@/types";

export async function listRoutines(studentId: string) {
  const snap = await adminDb()
    .collection(Collections.routines)
    .where("studentId", "==", studentId)
    .limit(100)
    .get();
  return snap.docs.map((d) => serializeDoc<Routine>(d.id, d.data()));
}

export async function upsertRoutine(studentId: string, data: Omit<Routine, "id" | "studentId" | "createdAt">, id?: string) {
  if (data.endTime <= data.startTime) {
    throw new ApiError("INVALID", "End time must be after start time.");
  }
  const ref = id
    ? adminDb().collection(Collections.routines).doc(id)
    : adminDb().collection(Collections.routines).doc();
  if (id) {
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.studentId !== studentId) {
      throw new ApiError("NOT_FOUND", "Routine not found.", 404);
    }
    await ref.update({ ...data });
  } else {
    await ref.set({
      ...data,
      studentId,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  const snap = await ref.get();
  return serializeDoc<Routine>(ref.id, snap.data()!);
}

export async function deleteRoutine(studentId: string, id: string) {
  const ref = adminDb().collection(Collections.routines).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Routine not found.", 404);
  }
  await ref.delete();
}
