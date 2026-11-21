import { FieldValue } from "firebase-admin/firestore";
import { adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import type { AppNotification, NotificationType } from "@/types";

export async function notifyStudent(input: {
  studentId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
}) {
  const ref = adminDb().collection(Collections.notifications).doc();
  await ref.set({
    studentId: input.studentId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link || null,
    read: false,
    readAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function listNotifications(studentId: string, limit = 40) {
  const snap = await adminDb()
    .collection(Collections.notifications)
    .where("studentId", "==", studentId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => serializeDoc<AppNotification>(d.id, d.data()));
}

export async function markNotificationRead(studentId: string, id: string) {
  const ref = adminDb().collection(Collections.notifications).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) return false;
  await ref.update({ read: true, readAt: FieldValue.serverTimestamp() });
  return true;
}

export async function markAllRead(studentId: string) {
  const snap = await adminDb()
    .collection(Collections.notifications)
    .where("studentId", "==", studentId)
    .where("read", "==", false)
    .limit(100)
    .get();
  const batch = adminDb().batch();
  snap.docs.forEach((d) =>
    batch.update(d.ref, { read: true, readAt: FieldValue.serverTimestamp() }),
  );
  if (!snap.empty) await batch.commit();
  return snap.size;
}
