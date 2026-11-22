"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore";
import { getFirebase } from "./firebase";
import type { PlanDay } from "./planner";
import type { Subject, Task } from "./types";

type Live<T> = { items: T[]; loading: boolean; error: string | null };

function useLive<T extends { id: string }>(uid: string | undefined, name: "subjects" | "tasks", order: string): Live<T> {
  const [state, setState] = useState<Live<T>>({ items: [], loading: true, error: null });

  useEffect(() => {
    const fb = getFirebase();
    if (!uid || !fb) {
      setState({ items: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const q = query(collection(fb.db, "users", uid, name), orderBy(order));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
        setState({ items, loading: false, error: null });
      },
      (err) => setState((s) => ({ ...s, loading: false, error: err.message })),
    );
  }, [uid, name, order]);

  return state;
}

export function useSubjects(uid: string | undefined): Live<Subject> {
  return useLive<Subject>(uid, "subjects", "createdAt");
}

export function useTasks(uid: string | undefined): Live<Task> {
  const live = useLive<Task>(uid, "tasks", "date");
  const items = useMemo(
    () =>
      [...live.items].sort((a, b) =>
        a.date === b.date ? a.fromPage - b.fromPage : a.date < b.date ? -1 : 1,
      ),
    [live.items],
  );
  return { items, loading: live.loading, error: live.error };
}

function db() {
  const fb = getFirebase();
  if (!fb) throw new Error("firebase-not-configured");
  return fb.db;
}

/** Firestore allows 500 writes per batch; stay well below it. */
async function commitInChunks(ops: Array<(batch: WriteBatch) => void>) {
  const firestore = db();
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(firestore);
    for (const op of ops.slice(i, i + 400)) op(batch);
    await batch.commit();
  }
}

export async function addSubject(uid: string, data: Omit<Subject, "id" | "createdAt">) {
  await addDoc(collection(db(), "users", uid, "subjects"), { ...data, createdAt: Date.now() });
}

/** Deletes a subject together with all of its tasks. */
export async function deleteSubject(uid: string, subjectId: string) {
  const firestore = db();
  const tasks = await getDocs(
    query(collection(firestore, "users", uid, "tasks"), where("subjectId", "==", subjectId)),
  );
  const ops: Array<(batch: WriteBatch) => void> = tasks.docs.map((d) => (batch) => batch.delete(d.ref));
  ops.push((batch) => batch.delete(doc(firestore, "users", uid, "subjects", subjectId)));
  await commitInChunks(ops);
}

/**
 * Saves a generated plan. Existing tasks are only touched when `replacePending` is true,
 * and then only the ones that are not done yet (completed work is never removed).
 */
export async function savePlan(uid: string, subject: Subject, days: PlanDay[], replacePending: boolean) {
  const firestore = db();
  const ops: Array<(batch: WriteBatch) => void> = [];

  if (replacePending) {
    const existing = await getDocs(
      query(collection(firestore, "users", uid, "tasks"), where("subjectId", "==", subject.id)),
    );
    for (const d of existing.docs) {
      if (!(d.data() as Task).done) ops.push((batch) => batch.delete(d.ref));
    }
  }

  const tasks = collection(firestore, "users", uid, "tasks");
  for (const day of days) {
    const ref = doc(tasks);
    const data: Omit<Task, "id"> = {
      subjectId: subject.id,
      subjectName: subject.name,
      color: subject.color,
      date: day.date,
      fromPage: day.fromPage,
      toPage: day.toPage,
      minutes: day.minutes,
      done: false,
      doneAt: null,
    };
    ops.push((batch) => batch.set(ref, data));
  }

  await commitInChunks(ops);
}

export async function setTaskDone(uid: string, taskId: string, done: boolean) {
  await updateDoc(doc(db(), "users", uid, "tasks", taskId), {
    done,
    doneAt: done ? Date.now() : null,
  });
}

export async function deleteTask(uid: string, taskId: string) {
  await deleteDoc(doc(db(), "users", uid, "tasks", taskId));
}
