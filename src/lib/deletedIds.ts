/**
 * «شواهد القبور» للطلاب المحذوفين
 * ================================
 * المشكلة اللي كانت بتحصل: الطالب بيتحذف من الواجهة، ولو الكتابة على Firestore
 * فشلت (قواعد/شبكة) بيرجع تاني من الـ realtime snapshot. وكمان البيانا�� التجريبية
 * كانت بتترفع تاني لو المجموعة فضيت.
 *
 * الحل: بنسجّل كل ID بيتحذف في قائمة محلية، وأي طالب في القائمة دي بيتم تجاهله
 * مهما رجع من السيرفر، ومش بنسمح برفعه تاني.
 *
 * Any student id present here is ignored from remote snapshots and blocked from
 * being re-uploaded.
 */

const DELETED_KEY = 'ssp_deleted_ids';
const PENDING_KEY = 'ssp_pending_students';
const SEEDED_KEY = 'ssp_demo_seeded_v1';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
};

/* ---------------- deleted tombstones ---------------- */

export const getDeletedIds = (): string[] => readJson<string[]>(DELETED_KEY, []);

export const isDeleted = (id: string): boolean => getDeletedIds().includes(id);

export const markDeleted = (id: string): void => {
  const ids = getDeletedIds();
  if (!ids.includes(id)) writeJson(DELETED_KEY, [...ids, id]);
};

export const unmarkDeleted = (id: string): void => {
  writeJson(DELETED_KEY, getDeletedIds().filter(x => x !== id));
};

/** استبعاد أي طالب محذوف من قائمة جاية من السيرفر */
export const withoutDeleted = <T extends { id: string }>(list: T[]): T[] => {
  const dead = new Set(getDeletedIds());
  return list.filter(item => !dead.has(item.id));
};

/* ---------------- pending (offline) writes ---------------- */

/** طلاب اتسجلوا والتطبيق أوفلاين — بنرفعهم أول ما الاتصال يرجع */
export const getPendingStudents = <T,>(): T[] => readJson<T[]>(PENDING_KEY, []);

export const queuePendingStudent = <T extends { id: string }>(student: T): void => {
  const pending = getPendingStudents<T>();
  if (!pending.some(p => p.id === student.id)) {
    writeJson(PENDING_KEY, [...pending, student]);
  }
};

export const removePendingStudent = (id: string): void => {
  writeJson(PENDING_KEY, getPendingStudents<{ id: string }>().filter(p => p.id !== id));
};

/* ---------------- one-time demo seed ---------------- */

export const hasSeededDemo = (): boolean => {
  try {
    return localStorage.getItem(SEEDED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markSeededDemo = (): void => {
  try {
    localStorage.setItem(SEEDED_KEY, 'true');
  } catch {
    /* ignore */
  }
};
