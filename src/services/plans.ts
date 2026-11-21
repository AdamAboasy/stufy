import { FieldValue } from "firebase-admin/firestore";
import { adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import { ApiError } from "@/lib/http";
import { generatePlanPreview, reschedulePlan } from "@/services/ai/planner";
import { getExtraction } from "@/services/files";
import { listRoutines } from "@/services/routines";
import { notifyStudent } from "@/services/notifications";
import { ymdInZone } from "@/lib/utils";
import type { PlanPreview, StudyPlan, StudyTask } from "@/types";

export async function previewPlan(studentId: string, input: {
  fileId: string;
  title?: string;
  startDate: string;
  endDate: string;
  dailyStudyMinutes: number;
  sessionMinutes: number;
  restDays: number[];
  difficultyPreference?: "balanced" | "easy_first" | "hard_first";
}) {
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

export async function savePlan(studentId: string, preview: PlanPreview, fileId: string) {
  const fileSnap = await adminDb().collection(Collections.uploadedFiles).doc(fileId).get();
  if (!fileSnap.exists || fileSnap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "File not found.", 404);
  }
  const planRef = adminDb().collection(Collections.studyPlans).doc();
  const tasks: StudyTask[] = [];
  const batch = adminDb().batch();
  let sort = 0;
  for (const day of preview.days) {
    for (const t of day.tasks) {
      const taskRef = adminDb().collection(Collections.studyTasks).doc();
      const task: Omit<StudyTask, "createdAt"> & { createdAt: FirebaseFirestore.FieldValue } = {
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
        createdAt: FieldValue.serverTimestamp(),
        completedAt: null,
      };
      batch.set(taskRef, task);
      tasks.push({ ...task, createdAt: new Date().toISOString() } as StudyTask);
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
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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

export async function listPlans(studentId: string) {
  const snap = await adminDb()
    .collection(Collections.studyPlans)
    .where("studentId", "==", studentId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((d) => serializeDoc<StudyPlan>(d.id, d.data()));
}

export async function getPlan(studentId: string, planId: string) {
  const snap = await adminDb().collection(Collections.studyPlans).doc(planId).get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Plan not found.", 404);
  }
  return serializeDoc<StudyPlan>(snap.id, snap.data()!);
}

export async function listTasks(studentId: string, filters?: { planId?: string; date?: string; status?: string }) {
  let q: FirebaseFirestore.Query = adminDb()
    .collection(Collections.studyTasks)
    .where("studentId", "==", studentId);
  if (filters?.planId) q = q.where("planId", "==", filters.planId);
  if (filters?.date) q = q.where("scheduledDate", "==", filters.date);
  if (filters?.status) q = q.where("status", "==", filters.status);
  const snap = await q.limit(400).get();
  const items = snap.docs.map((d) => serializeDoc<StudyTask>(d.id, d.data()));
  items.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.sortOrder - b.sortOrder);
  return items;
}

export async function updateTask(studentId: string, taskId: string, patch: Partial<StudyTask>) {
  const ref = adminDb().collection(Collections.studyTasks).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Task not found.", 404);
  }
  const current = snap.data()!;
  if (current.status === "completed" && patch.status && patch.status !== "completed") {
    // allow reopening only explicitly
  }
  const allowed: Record<string, unknown> = {};
  for (const key of ["title", "scheduledDate", "estimatedDuration", "notes", "status", "pageStart", "pageEnd"] as const) {
    if (patch[key] !== undefined) allowed[key] = patch[key];
  }
  if (patch.status === "completed") {
    allowed.completedAt = FieldValue.serverTimestamp();
    await adminDb().collection(Collections.studyPlans).doc(current.planId).update({
      completedTasks: FieldValue.increment(current.status === "completed" ? 0 : 1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await ref.update(allowed);
  return serializeDoc<StudyTask>(taskId, { ...current, ...allowed });
}

export async function addTask(studentId: string, input: {
  planId: string;
  title: string;
  scheduledDate: string;
  estimatedDuration: number;
  chapter?: string;
  pageStart?: number;
  pageEnd?: number;
}) {
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
    pageSource: "estimated" as const,
    scheduledDate: input.scheduledDate,
    estimatedDuration: input.estimatedDuration,
    actualDuration: 0,
    status: "not_started",
    notes: "",
    sortOrder: 999,
    createdAt: FieldValue.serverTimestamp(),
    completedAt: null,
  };
  await ref.set(task);
  await adminDb().collection(Collections.studyPlans).doc(input.planId).update({
    totalTasks: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return serializeDoc<StudyTask>(ref.id, task);
}

export async function deleteTask(studentId: string, taskId: string) {
  const ref = adminDb().collection(Collections.studyTasks).doc(taskId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Task not found.", 404);
  }
  if (snap.data()?.status === "completed") {
    throw new ApiError("LOCKED", "Completed tasks cannot be deleted.");
  }
  await ref.delete();
  await adminDb().collection(Collections.studyPlans).doc(snap.data()!.planId).update({
    totalTasks: FieldValue.increment(-1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function startSession(studentId: string, taskId: string) {
  const taskRef = adminDb().collection(Collections.studyTasks).doc(taskId);
  const snap = await taskRef.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Task not found.", 404);
  }
  const sessionRef = adminDb().collection(Collections.studySessions).doc();
  await sessionRef.set({
    studentId,
    taskId,
    planId: snap.data()!.planId,
    startedAt: FieldValue.serverTimestamp(),
    endedAt: null,
    duration: 0,
    status: "in_progress",
  });
  await taskRef.update({ status: "in_progress" });
  return { sessionId: sessionRef.id };
}

export async function stopSession(studentId: string, sessionId: string, complete = false) {
  const ref = adminDb().collection(Collections.studySessions).doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "Session not found.", 404);
  }
  const started = snap.data()!.startedAt?.toDate?.() || new Date();
  const duration = Math.max(1, Math.round((Date.now() - started.getTime()) / 60000));
  await ref.update({
    endedAt: FieldValue.serverTimestamp(),
    duration,
    status: complete ? "completed" : "completed",
  });
  const taskRef = adminDb().collection(Collections.studyTasks).doc(snap.data()!.taskId);
  const task = await taskRef.get();
  const actual = (task.data()?.actualDuration || 0) + duration;
  await taskRef.update({
    actualDuration: actual,
    status: complete ? "completed" : "not_started",
    ...(complete ? { completedAt: FieldValue.serverTimestamp() } : {}),
  });
  if (complete && task.data()?.status !== "completed") {
    await adminDb().collection(Collections.studyPlans).doc(task.data()!.planId).update({
      completedTasks: FieldValue.increment(1),
    });
  }
  return { duration };
}

export async function proposeReschedule(studentId: string, planId: string) {
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

export async function applyReschedule(studentId: string, planId: string, preview: PlanPreview) {
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
    updatedAt: FieldValue.serverTimestamp(),
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

export async function markOverdue(studentId: string, timezone: string) {
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
    const date = d.data().scheduledDate as string;
    if (date < today) {
      batch.update(d.ref, { status: "delayed" });
      count += 1;
    }
  });
  if (count) await batch.commit();
  return count;
}
