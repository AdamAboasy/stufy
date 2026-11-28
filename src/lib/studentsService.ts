/**
 * studentsService — المصدر الوحيد للحقيقة (Single Source of Truth)
 * ================================================================
 * كل عمليات الطلاب بتمر من هنا، ومفيش أي نسخة محلية بتتخلط مع السيرفر.
 * Firestore هي القاعدة المشتركة: أي تسجيل من أي موبايل/جهاز بيظهر فوراً
 * عند الأدمن على كل الأجهزة، والدخول بيدوّر في نفس القاعدة.
 *
 * All student operations go through this module. Firestore is the shared
 * database — nothing is merged from a per-device copy.
 */
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  getDoc,
  getDocsFromServer,
  getCountFromServer,
  getDocFromServer,
  onSnapshot,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db, auth, COLLECTIONS } from './firebase';
import { Student } from '../types';
import { toLocalIsoDate, withDerivedStats } from './studentStats';

/** كل قراءة بتمرّ هنا: الإحصائيات بتتحسب من الخطة الفعلية (مش أصفار قديمة) */
const hydrate = (data: unknown, id: string): Student =>
  withDerivedStats({ ...(data as Student), id }, toLocalIsoDate(new Date()));

const studentsCol = () => collection(db, COLLECTIONS.students);

export type SyncStatus = 'connecting' | 'online' | 'offline';

export interface SyncState {
  status: SyncStatus;
  error?: string;
  lastSyncAt?: string;
  total?: number;
}

/* ------------------------------------------------------------------ */
/*  Realtime subscription (shared database view)                       */
/* ------------------------------------------------------------------ */

export const subscribeStudents = (
  onData: (students: Student[], meta: { fromCache: boolean }) => void,
  onState: (state: SyncState) => void
): (() => void) => {
  onState({ status: 'connecting' });

  return onSnapshot(
    studentsCol(),
    { includeMetadataChanges: true },
    snapshot => {
      const list = snapshot.docs.map(d => hydrate(d.data(), d.id));
      onData(list, { fromCache: snapshot.metadata.fromCache });
      onState({
        status: snapshot.metadata.fromCache ? 'connecting' : 'online',
        lastSyncAt: new Date().toISOString(),
        total: list.length
      });
    },
    error => {
      const code = (error as { code?: string })?.code || String(error);
      onState({
        status: 'offline',
        error:
          code === 'permission-denied'
            ? 'permission-denied — قواعد Firestore مش بتسمح بالقراءة. الصق محتوى firestore.rules في Console → Firestore → Rules → Publish.'
            : code
      });
    }
  );
};

/**
 * اشتراك لحظي في مستند طالب واحد — للطالب نفسه (قواعد الأمان بتسمح له
 * بقراءة ملفه فقط، فمينفعش يشترك في القائمة كلها).
 */
export const subscribeStudentById = (
  id: string,
  onData: (student: Student | null) => void,
  onError?: (error: unknown) => void
): (() => void) =>
  onSnapshot(
    doc(db, COLLECTIONS.students, id),
    snapshot => {
      onData(snapshot.exists() ? hydrate(snapshot.data(), snapshot.id) : null);
    },
    error => onError?.(error)
  );

/* ------------------------------------------------------------------ */
/*  Reads (always from the server for auth-critical lookups)           */
/* ------------------------------------------------------------------ */

export const fetchStudentsFromServer = async (): Promise<Student[]> => {
  const snapshot = await getDocsFromServer(studentsCol());
  return snapshot.docs.map(d => hydrate(d.data(), d.id));
};

/**
 * بحث بالإيميل — بيرجّع كود الخطأ الحقيقي بدل ما يرجّع null في كل الحالات.
 * (الأدمن بيقرأ القائمة؛ الطالب بيقرأ مستنده هو من `subscribeStudentById`.)
 */
export const findStudentByEmail = async (
  email: string
): Promise<{ ok: boolean; student?: Student | null; error?: string }> => {
  const clean = email.trim().toLowerCase();
  if (!clean) return { ok: false, error: 'invalid-email' };

  try {
    const snapshot = await getDocsFromServer(
      query(studentsCol(), where('email', '==', clean), limit(1))
    );
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return { ok: true, student: hydrate(d.data(), d.id) };
    }
    // fallback: حالة أحرف مختلفة (بيانات قديمة)
    const all = await fetchStudentsFromServer();
    return { ok: true, student: all.find(s => (s.email || '').toLowerCase() === clean) || null };
  } catch (error) {
    return { ok: false, error: (error as { code?: string })?.code || String(error) };
  }
};

export const getStudentById = async (id: string): Promise<Student | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.students, id));
  return snap.exists() ? hydrate(snap.data(), snap.id) : null;
};

export const emailExists = async (email: string): Promise<boolean> => {
  const found = await findStudentByEmail(email);
  return !!found.student;
};

export const countStudents = async (): Promise<number> => {
  // عدّاد على السيرفر — مش بيحمّل كل المستندات
  const snapshot = await getCountFromServer(studentsCol());
  return snapshot.data().count;
};

/* ------------------------------------------------------------------ */
/*  Writes                                                             */
/* ------------------------------------------------------------------ */

export const upsertStudent = async (
  student: Student
): Promise<{ ok: boolean; error?: string }> => {
  try {
    // تنظيف أي حقل قيمته undefined قبل الكتابة (Firestore بيرفضها بـ invalid-argument)
    const withStats = withDerivedStats(student, toLocalIsoDate(new Date()));
    const clean = Object.fromEntries(
      Object.entries(withStats).filter(([, value]) => value !== undefined)
    ) as Student;

    await setDoc(
      doc(db, COLLECTIONS.students, student.id),
      {
        ...clean,
        email: (clean.email || '').toLowerCase(),
        // ملكية المستند — قواعد الأمان بتتحقق منها للطالب
        ownerUid: clean.ownerUid || auth.currentUser?.uid || null,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return { ok: true };
  } catch (error) {
    const code = (error as { code?: string })?.code || String(error);
    return { ok: false, error: code };
  }
};

export const removeStudent = async (
  student: Student
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.students, student.id));
  } catch (error) {
    const code = (error as { code?: string })?.code || String(error);
    return { ok: false, error: code };
  }

  return { ok: true };
};

export const getStudentFromServer = async (id: string): Promise<Student | null> => {
  try {
    const snap = await getDocFromServer(doc(db, COLLECTIONS.students, id));
    return snap.exists() ? hydrate(snap.data(), snap.id) : null;
  } catch {
    return null;
  }
};

/** بيتأكد إن مستند الطالب مش موجود فعلاً بعد الحذف */
export const verifyDeleted = async (id: string): Promise<boolean> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.students, id));
    return !snap.exists();
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------------ */
/*  Legacy local-cache cleanup                                         */
/* ------------------------------------------------------------------ */

/**
 * بيمسح أي أثر للطالب من نسخ المتصفح القديمة **ومن كاش Firestore المحلي**
 * عشان ما يرجعش أبداً بعد الحذف.
 */
export const forgetLocalStudent = (studentId: string): void => {
  try {
    const raw = localStorage.getItem('ssp_students');
    if (raw) {
      const cached = JSON.parse(raw) as Student[];
      if (Array.isArray(cached)) {
        localStorage.setItem('ssp_students', JSON.stringify(cached.filter(s => s.id !== studentId)));
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const pendingRaw = localStorage.getItem('ssp_pending_students');
    if (pendingRaw) {
      const pending = JSON.parse(pendingRaw) as { id: string }[];
      if (Array.isArray(pending)) {
        localStorage.setItem(
          'ssp_pending_students',
          JSON.stringify(pending.filter(s => s.id !== studentId))
        );
      }
    }
  } catch {
    /* ignore */
  }

  // ملاحظة: كاش Firestore (IndexedDB) بيتحدّث تلقائياً بالحذف، فمش بنمسحه
  // عشان ما نضيّعش الاتصالات اللحظية الشغالة.
};
