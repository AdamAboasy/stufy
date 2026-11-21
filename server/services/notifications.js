"use strict";

const { adminDb, Collections } = require("../db");

async function notifyStudent(input) {
  const ref = adminDb().collection(Collections.notifications).doc();
  await ref.set({
    studentId: input.studentId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link || null,
    read: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

async function listNotifications(studentId, limit = 40) {
  const snap = await adminDb()
    .collection(Collections.notifications)
    .where("studentId", "==", studentId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function markNotificationRead(studentId, id) {
  const ref = adminDb().collection(Collections.notifications).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) return false;
  await ref.update({ read: true, readAt: new Date().toISOString() });
  return true;
}

async function markAllRead(studentId) {
  const snap = await adminDb()
    .collection(Collections.notifications)
    .where("studentId", "==", studentId)
    .where("read", "==", false)
    .limit(100)
    .get();
  const batch = adminDb().batch();
  snap.docs.forEach((d) =>
    batch.update(d.ref, { read: true, readAt: new Date().toISOString() }),
  );
  if (!snap.empty) await batch.commit();
  return snap.size;
}

module.exports = { notifyStudent, listNotifications, markNotificationRead, markAllRead };
