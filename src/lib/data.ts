"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore";
import { getFirebase } from "./firebase";
import { deleteObject, ref } from "firebase/storage";
import type { PlanDay } from "./planner";
import type { ScheduledLesson } from "./lesson-planner";
import type { AcademicRegistration } from "./auth";
import type { Lesson, StudentProfile, Subject, Task, UploadedFile } from "./types";

type Live<T> = { items: T[]; loading: boolean; error: string | null };
type LiveDocument<T> = { item: T | null; loading: boolean; error: string | null };

function useLive<T extends { id: string }>(uid: string | undefined, name: "subjects" | "tasks" | "lessons" | "files", order: string): Live<T> {
  const [state, setState] = useState<Live<T>>({ items: [], loading: true, error: null });
  useEffect(() => {
    const fb = getFirebase();
    if (!uid || !fb) {
      setState({ items: [], loading: false, error: null });
      return;
    }
    setState((current) => ({ ...current, loading: true }));
    const q = query(collection(fb.db, "users", uid, name), orderBy(order));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() as object) }) as T);
      setState({ items, loading: false, error: null });
    }, (err) => setState((current) => ({ ...current, loading: false, error: err.message })));
  }, [uid, name, order]);
  return state;
}

export function useProfile(uid: string | undefined): LiveDocument<StudentProfile> {
  const [state, setState] = useState<LiveDocument<StudentProfile>>({ item: null, loading: true, error: null });
  useEffect(() => {
    const fb = getFirebase();
    if (!uid || !fb) {
      setState({ item: null, loading: false, error: null });
      return;
    }
    return onSnapshot(doc(fb.db, "users", uid), (snapshot) => {
      setState({ item: snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as StudentProfile) : null, loading: false, error: null });
    }, (err) => setState((current) => ({ ...current, loading: false, error: err.message })));
  }, [uid]);
  return state;
}

export function useSubjects(uid: string | undefined): Live<Subject> { return useLive<Subject>(uid, "subjects", "createdAt"); }
export function useLessons(uid: string | undefined): Live<Lesson> { return useLive<Lesson>(uid, "lessons", "lessonOrder"); }
export function useUploadedFiles(uid: string | undefined): Live<UploadedFile> { return useLive<UploadedFile>(uid, "files", "createdAt"); }

export function useTasks(uid: string | undefined): Live<Task> {
  const live = useLive<Task>(uid, "tasks", "date");
  const items = useMemo(() => [...live.items].sort((a, b) => a.date === b.date ? a.fromPage - b.fromPage : a.date < b.date ? -1 : 1), [live.items]);
  return { items, loading: live.loading, error: live.error };
}

function db() {
  const fb = getFirebase();
  if (!fb) throw new Error("firebase-not-configured");
  return fb.db;
}

async function commitInChunks(ops: Array<(batch: WriteBatch) => void>) {
  const firestore = db();
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(firestore);
    for (const op of ops.slice(i, i + 400)) op(batch);
    await batch.commit();
  }
}

export async function updateAcademicProfile(uid: string, academic: AcademicRegistration) {
  const ref = doc(db(), "users", uid);
  const relevant: Record<string, unknown> = {
    educationLevel: academic.educationLevel,
    academicGrade: deleteField(),
    universityName: deleteField(),
    faculty: deleteField(),
    academicYear: deleteField(),
    otherAcademicLevel: deleteField(),
    updatedAt: serverTimestamp(),
  };
  if (["primary", "preparatory", "secondary"].includes(academic.educationLevel)) relevant.academicGrade = academic.academicGrade?.trim() || deleteField();
  if (academic.educationLevel === "university") {
    relevant.universityName = academic.universityName?.trim() || deleteField();
    relevant.faculty = academic.faculty?.trim() || deleteField();
    relevant.academicYear = academic.academicYear?.trim() || deleteField();
  }
  if (academic.educationLevel === "other") relevant.otherAcademicLevel = academic.otherAcademicLevel?.trim() || deleteField();
  try {
    await updateDoc(ref, relevant);
  } catch (error) {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "not-found") throw error;
    const initial: Record<string, unknown> = {
      uid,
      role: "student",
      createdAt: serverTimestamp(),
      educationLevel: academic.educationLevel,
      updatedAt: serverTimestamp(),
    };
    if (["primary", "preparatory", "secondary"].includes(academic.educationLevel) && academic.academicGrade?.trim()) initial.academicGrade = academic.academicGrade.trim();
    if (academic.educationLevel === "university") {
      if (academic.universityName?.trim()) initial.universityName = academic.universityName.trim();
      if (academic.faculty?.trim()) initial.faculty = academic.faculty.trim();
      if (academic.academicYear?.trim()) initial.academicYear = academic.academicYear.trim();
    }
    if (academic.educationLevel === "other" && academic.otherAcademicLevel?.trim()) initial.otherAcademicLevel = academic.otherAcademicLevel.trim();
    await setDoc(ref, initial, { merge: true });
  }
}

export async function addSubject(uid: string, data: Omit<Subject, "id" | "createdAt">) {
  await addDoc(collection(db(), "users", uid, "subjects"), { ...data, createdAt: Date.now() });
}

export async function deleteSubject(uid: string, subjectId: string) {
  const firestore = db();
  const tasks = await getDocs(query(collection(firestore, "users", uid, "tasks"), where("subjectId", "==", subjectId)));
  const ops: Array<(batch: WriteBatch) => void> = tasks.docs.map((snapshot) => (batch) => batch.delete(snapshot.ref));
  ops.push((batch) => batch.delete(doc(firestore, "users", uid, "subjects", subjectId)));
  await commitInChunks(ops);
}

/** Legacy page-plan writer retained for already existing page-based records. */
export async function savePlan(uid: string, subject: Subject, days: PlanDay[], replacePending: boolean) {
  const firestore = db();
  const ops: Array<(batch: WriteBatch) => void> = [];
  if (replacePending) {
    const existing = await getDocs(query(collection(firestore, "users", uid, "tasks"), where("subjectId", "==", subject.id)));
    for (const snapshot of existing.docs) if (!(snapshot.data() as Task).done) ops.push((batch) => batch.delete(snapshot.ref));
  }
  const tasks = collection(firestore, "users", uid, "tasks");
  for (const day of days) {
    const ref = doc(tasks);
    const data: Omit<Task, "id"> = { subjectId: subject.id, subjectName: subject.name, color: subject.color, date: day.date, fromPage: day.fromPage, toPage: day.toPage, minutes: day.minutes, done: false, doneAt: null };
    ops.push((batch) => batch.set(ref, data));
  }
  await commitInChunks(ops);
}

export async function setTaskDone(uid: string, taskId: string, done: boolean) {
  await updateDoc(doc(db(), "users", uid, "tasks", taskId), { done, doneAt: done ? Date.now() : null });
}
export async function deleteTask(uid: string, taskId: string) { await deleteDoc(doc(db(), "users", uid, "tasks", taskId)); }

export async function updateLesson(uid: string, lessonId: string, patch: Partial<Pick<Lesson, "title" | "subject" | "chapterName" | "description" | "lessonOrder" | "difficulty" | "estimatedDuration" | "actualDuration" | "scheduledDate" | "status" | "notes">>) {
  await updateDoc(doc(db(), "users", uid, "lessons", lessonId), { ...patch, updatedAt: serverTimestamp() });
}

export async function saveLessonAssignments(uid: string, assignments: ScheduledLesson[]) {
  const firestore = db();
  const planId = doc(collection(firestore, "users", uid, "plans")).id;
  const operations = assignments.map((item) => (batch: WriteBatch) => batch.update(
    doc(firestore, "users", uid, "lessons", item.lessonId),
    { scheduledDate: item.scheduledDate, estimatedDuration: item.estimatedDuration, planId, updatedAt: serverTimestamp() },
  ));
  await commitInChunks(operations);
}

export async function deleteLesson(uid: string, lessonId: string) { await deleteDoc(doc(db(), "users", uid, "lessons", lessonId)); }

export async function createUploadedFileRecord(uid: string, input: { originalName: string; fileType: string; fileSize: number }) {
  const files = collection(db(), "users", uid, "files");
  const ref = doc(files);
  const storagePath = `users/${uid}/files/${ref.id}`;
  await setDoc(ref, {
    id: ref.id, studentId: uid, originalName: input.originalName, storagePath,
    fileType: input.fileType, fileSize: input.fileSize, processingStatus: "uploaded",
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return { id: ref.id, storagePath };
}

export async function removeUploadedFileRecord(uid: string, fileId: string) {
  await deleteDoc(doc(db(), "users", uid, "files", fileId));
}

export async function deleteUploadedFileAndLessons(uid: string, fileId: string, storagePath: string) {
  const fb = getFirebase();
  if (!fb) throw new Error("firebase-not-configured");
  try { await deleteObject(ref(fb.storage, storagePath)); }
  catch (error) {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "storage/object-not-found") throw error;
  }
  const firestore = fb.db;
  const extracted = await getDocs(query(collection(firestore, "users", uid, "lessons"), where("sourceFileId", "==", fileId)));
  const operations: Array<(batch: WriteBatch) => void> = extracted.docs.map((snapshot) => (batch) => batch.delete(snapshot.ref));
  operations.push((batch) => batch.delete(doc(firestore, "users", uid, "files", fileId)));
  await commitInChunks(operations);
}
