"use strict";

const { adminDb, Collections } = require("../db");
const { ApiError } = require("../errors");
const { generatePlanPreview, reschedulePlan } = require("./planner");
const { getExtraction } = require("./files");
const { listRoutines } = require("./routines");
const { notifyStudent } = require("./notifications");
const { ymdInZone } = require("../utils");

async function previewPlan(studentId, input) {
  const extraction = await getExtraction(studentId, input.fileId);
  if (!extraction || extraction.chapters.length === 0) {
    throw new ApiError("NO_EXTRACTION", "This file has no usable extraction yet.");
  }
  const fileSnap = await adminDb().collection(Collections.uploadedFiles).doc(input.fileId).get();
  const routines = await listRoutines(studentId);
  return generatePlanPreview({
    extraction,
    fileName: fileSnap.data()?.originalName || "Material",
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    restDays: input.restDays,
    dailyStudyMinutes: input.dailyStudyMinutes,
    sessionMinutes: input.sessionMinutes,
    routines,
    difficultyPreference: input.difficultyPreference,
  });
}

async function savePlan(studentId, preview, fileId) {
  const fileSnap = await adminDb().collection(Collections.uploadedFiles).doc(fileId).get();
  if (!fileSnap.exists || fileSnap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "File not found.", 404);
  }
  const planRef = adminDb().collection(Collections.studyPlans).doc();
  const tasks = [];
  const batch = adminDb().batch();
  let sort = 0;
  for (const day of preview.days) {
    for (const t of day.tasks) {
      const taskRef = adminDb().collection(Collections.studyTasks).doc();
      const task = {
        id: taskRef.id,
        planId: planRef.id,
        studentId,
        title: t.title,
        subject: t.subject,
        sourceFileId: fileId,
        sourceFileName: fileSnap.data()?.originalName || "",
        chapter: t.chapter,
        topicId: t.topicId,
        pageStart: t.pageStart,
        pageEnd: t.pageEnd,
        pageSource: t.pageSource,
        scheduledDate: day.date,
        estimatedDuration: t.estimatedDuration,
        actualDuration: 0,
        status: "not_started",
        notes: "",
        sortOrder: sort++,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      batch.set(taskRef, task);
      tasks.push({ ...task });
    }
  }
  batch.set(planRef, {
    studentId,
    title: preview.title,
    sourceFileId: fileId,
    sourceFileName: fileSnap.data()?.originalName || "",
    startDate: preview.startDate,
    endDate: preview.endDate,
    status: "active",
    restDays: preview.restDays,
    dailyStudyMinutes: preview.dailyStudyMinutes,
    sessionMinutes: preview.sessionMinutes,
    totalChapters: preview.totalChapters,
    totalPages: preview.totalPages,
    totalTasks: tasks.length,
    completedTasks: 0,
    explanation: preview.explanation,
    warnings: preview.warnings,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await batch.commit();
  await notifyStudent({
    studentId,
    type: "plan_created",
    title: "Study plan created",
    body: `${preview.title} is ready. ${tasks.length} tasks were scheduled.`,
    link: `/plans/${planRef.id}`,
  });
  return { planId: planRef.id, totalTasks: tasks.length };
}

async function listPlans(studentId) {
  const snap = await adminDb()
    .collection(Collections.studyPlans)
    .where("studentId", "==", studentId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getPlan(studentId, planId) {
  const snap = await adminDb().collection(Collections.studyPlans).doc(planId).get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Plan not found.", 404);
  }
  return { id: snap.id, ...snap.data() };
}

async function listTasks(studentId, filters = {}) {
  let q = adminDb()
    .collection(Collections.studyTasks)
    .where("studentId", "==", studentId);
  if (filters.planId) q = q.where("planId", "==", filters.planId);
  if (filters.date) q = q.where("scheduledDate", "==", filters.date);
  if (filters.status) q = q.where("status", "==", filters.status);
  const snap = await q.limit(400).get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  items.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.sortOrder - b.sortOrder);
  return items;
}

async function updateTask(studentId, taskId, patch) {
  const ref = adminDb().collection(Collections.studyTasks).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Task not found.", 404);
  }
  const current = snap.data();
  const allowed = {};
  for (const key of ["title", "scheduledDate", "estimatedDuration", "notes", "status", "pageStart", "pageEnd"]) {
    if (patch[key] !== undefined) allowed[key] = patch[key];
  }
  if (patch.status === "completed") {
    allowed.completedAt = new Date().toISOString();
    await adminDb().collection(Collections.studyPlans).doc(current.planId).update({
      completedTasks: (current.status === "completed" ? 0 : 1),
      updatedAt: new Date().toISOString(),
    });
  }
  await ref.update(allowed);
  return { id: taskId, ...current, ...allowed };
}

async function addTask(studentId, input) {
  const plan = await getPlan(studentId, input.planId);
  const ref = adminDb().collection(Collections.studyTasks).doc();
  const task = {
    planId: input.planId,
    studentId,
    title: input.title,
    subject: input.chapter || plan.title,
    sourceFileId: plan.sourceFileId,
    sourceFileName: plan.sourceFileName,
    chapter: input.chapter || "",
    topicId: null,
    pageStart: input.pageStart || 1,
    pageEnd: input.pageEnd || input.pageStart || 1,
    pageSource: "estimated",
    scheduledDate: input.scheduledDate,
    estimatedDuration: input.estimatedDuration,
    actualDuration: 0,
    status: "not_started",
    notes: "",
    sortOrder: 999,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  await ref.set(task);
  await adminDb().collection(Collections.studyPlans).doc(input.planId).update({
    totalTasks: (plan.totalTasks || 0) + 1,
    updatedAt: new Date().toISOString(),
  });
  return { id: ref.id, ...task };
}

async function deleteTask(studentId, taskId) {
  const ref = adminDb().collection(Collections.studyTasks).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Task not found.", 404);
  }
  if (snap.data()?.status === "completed") {
    throw new ApiError("LOCKED", "Completed tasks cannot be deleted.");
  }
  await ref.delete();
  await adminDb().collection(Collections.studyPlans).doc(snap.data().planId).update({
    totalTasks: Math.max(0, (snap.data().totalTasks || 1) - 1),
    updatedAt: new Date().toISOString(),
  });
}

async function startSession(studentId, taskId) {
  const taskRef = adminDb().collection(Collections.studyTasks).doc(taskId);
  const snap = await taskRef.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Task not found.", 404);
  }
  const sessionRef = adminDb().collection(Collections.studySessions).doc();
  await sessionRef.set({
    studentId,
    taskId,
    planId: snap.data().planId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    duration: 0,
    status: "in_progress",
  });
  await taskRef.update({ status: "in_progress" });
  return { sessionId: sessionRef.id };
}

async function stopSession(studentId, sessionId, complete = false) {
  const ref = adminDb().collection(Collections.studySessions).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }
  const started = snap.data().startedAt ? new Date(snap.data().startedAt) : new Date();
  const duration = Math.max(1, Math.round((Date.now() - started.getTime()) / 60000));
  await ref.update({
    endedAt: new Date().toISOString(),
    duration,
    status: "completed",
  });
  const taskRef = adminDb().collection(Collections.studyTasks).doc(snap.data().taskId);
  const task = await taskRef.get();
  const actual = (task.data()?.actualDuration || 0) + duration;
  await taskRef.update({
    actualDuration: actual,
    status: complete ? "completed" : "not_started",
    ...(complete ? { completedAt: new Date().toISOString() } : {}),
  });
  if (complete && task.data()?.status !== "completed") {
    await adminDb().collection(Collections.studyPlans).doc(task.data().planId).update({
      completedTasks: (task.data().completedTasks || 0) + 1,
    });
  }
  return { duration };
}

async function proposeReschedule(studentId, planId) {
  const plan = await getPlan(studentId, planId);
  const tasks = await listTasks(studentId, { planId });
  const routines = await listRoutines(studentId);
  const today = ymdInZone(new Date(), "Africa/Cairo");
  const startDate = today > plan.startDate ? today : plan.startDate;
  const proposal = reschedulePlan({
    tasks,
    startDate,
    endDate: plan.endDate,
    restDays: plan.restDays,
    dailyStudyMinutes: plan.dailyStudyMinutes,
    sessionMinutes: plan.sessionMinutes,
    routines,
    title: plan.title,
    totalChapters: plan.totalChapters,
    totalPages: plan.totalPages,
  });
  return proposal;
}

async function applyReschedule(studentId, planId, preview) {
  const tasks = await listTasks(studentId, { planId });
  const unfinished = tasks.filter((t) => t.status !== "completed");
  const remaining = [...unfinished];
  const batch = adminDb().batch();
  for (const day of preview.days) {
    for (const item of day.tasks) {
      const matchIndex = remaining.findIndex(
        (t) => (item.topicId && t.topicId === item.topicId) || t.title === item.title,
      );
      const match = matchIndex >= 0 ? remaining.splice(matchIndex, 1)[0] : null;
      if (match) {
        batch.update(adminDb().collection(Collections.studyTasks).doc(match.id), {
          scheduledDate: day.date,
          estimatedDuration: item.estimatedDuration,
          title: item.title,
          status: match.status === "delayed" ? "not_started" : match.status,
        });
      }
    }
  }
  batch.update(adminDb().collection(Collections.studyPlans).doc(planId), {
    updatedAt: new Date().toISOString(),
    explanation: preview.explanation,
    warnings: preview.warnings,
  });
  await batch.commit();
  await notifyStudent({
    studentId,
    type: "schedule_changed",
    title: "Schedule updated",
    body: "Your study plan was recalculated after you approved the new schedule.",
    link: `/plans/${planId}`,
  });
}

async function markOverdue(studentId, timezone) {
  const today = ymdInZone(new Date(), timezone);
  const snap = await adminDb()
    .collection(Collections.studyTasks)
    .where("studentId", "==", studentId)
    .where("status", "in", ["not_started", "in_progress"])
    .limit(200)
    .get();
  const batch = adminDb().batch();
  let count = 0;
  snap.docs.forEach((d) => {
    const date = d.data().scheduledDate;
    if (date < today) {
      batch.update(d.ref, { status: "delayed" });
      count += 1;
    }
  });
  if (count) await batch.commit();
  return count;
}

module.exports = {
  previewPlan,
  savePlan,
  listPlans,
  getPlan,
  listTasks,
  updateTask,
  addTask,
  deleteTask,
  startSession,
  stopSession,
  proposeReschedule,
  applyReschedule,
  markOverdue,
};
