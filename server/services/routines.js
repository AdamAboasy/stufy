"use strict";

const { adminDb, Collections } = require("../db");
const { ApiError } = require("../errors");

async function listRoutines(studentId) {
  const snap = await adminDb()
    .collection(Collections.routines)
    .where("studentId", "==", studentId)
    .limit(100)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function upsertRoutine(studentId, data, id) {
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
      createdAt: new Date().toISOString(),
    });
  }
  const snap = await ref.get();
  return { id: ref.id, ...snap.data() };
}

async function deleteRoutine(studentId, id) {
  const ref = adminDb().collection(Collections.routines).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Routine not found.", 404);
  }
  await ref.delete();
}

module.exports = { listRoutines, upsertRoutine, deleteRoutine };
