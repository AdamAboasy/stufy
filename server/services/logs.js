"use strict";

const { adminDb, Collections } = require("../db");

async function writeLog(entry) {
  const ref = adminDb().collection(Collections.activityLogs).doc();
  await ref.set({
    ...entry,
    metadata: entry.metadata || {},
    timestamp: new Date().toISOString(),
  });
  return ref.id;
}

async function listLogs(limit = 50, cursor) {
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
      timestamp: data.timestamp || new Date().toISOString(),
      metadata: data.metadata || {},
    };
  });
  return {
    items,
    nextCursor: docs.size === limit ? docs.docs[docs.docs.length - 1].id : null,
  };
}

module.exports = { writeLog, listLogs };
