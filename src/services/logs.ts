import { FieldValue } from "firebase-admin/firestore";
import { adminDb, Collections } from "@/lib/firebase/admin";
import type { ActivityLog, UserRole } from "@/types";

export async function writeLog(entry: {
  actorId: string;
  actorRole: UserRole;
  actorName: string;
  action: string;
  targetId: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const ref = adminDb().collection(Collections.activityLogs).doc();
  await ref.set({
    ...entry,
    metadata: entry.metadata || {},
    timestamp: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function listLogs(limit = 50, cursor?: string) {
  let q = adminDb()
    .collection(Collections.activityLogs)
    .orderBy("timestamp", "desc")
    .limit(limit);
  if (cursor) {
    const snap = await adminDb().collection(Collections.activityLogs).doc(cursor).get();
    if (snap.exists) q = q.startAfter(snap);
  }
  const docs = await q.get();
  const items = docs.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      actorId: data.actorId,
      actorRole: data.actorRole,
      actorName: data.actorName,
      action: data.action,
      targetId: data.targetId,
      timestamp: data.timestamp?.toDate?.().toISOString?.() || new Date().toISOString(),
      metadata: data.metadata || {},
    } as ActivityLog;
  });
  return {
    items,
    nextCursor: docs.size === limit ? docs.docs[docs.docs.length - 1].id : null,
  };
}
