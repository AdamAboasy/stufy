/**
 * طبقة الوصول للبيانات على Firebase
 * ==================================
 * - الطلاب: مجموعة `students` في Firestore (مستند لكل طالب بنفس شكل Student).
 * - سجل التدقيق: مجموعة `auditLogs` (الإضافة فقط).
 * - أكواد التفعيل: مجموعة `activationCodes`.
 * - الكتب: نرفع ملف الـ PDF على Firebase Storage ونحفظ بياناته الوصفية في مستند الطالب.
 *
 * كل الدوال بترجع نتائج آمنة: لو Firebase غير متاح (شبكة/صلاحيات/إعداد)
 * بترجع null أو بتعيد الخطأ للمتصل، والتطبيق بيكمل شغل محلياً.
 */
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, COLLECTIONS, BOOKS_STORAGE_PATH } from './firebase';
import { Student, AuditLog, GeneratedActivationCode } from '../types';

/* ------------------------------------------------------------------ */
/*  Connection / availability check                                    */
/* ------------------------------------------------------------------ */

/** بيتحقق إن Firestore قابل للوصول فعلاً (بيقرأ مستند واحد). */
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    await getDocs(query(collection(db, COLLECTIONS.meta), limit(1)));
    return true;
  } catch {
    return false;
  }
};

/* ------------------------------------------------------------------ */
/*  Students                                                           */
/* ------------------------------------------------------------------ */

const studentsCol = () => collection(db, COLLECTIONS.students);

/**
 * الاستماع اللحظي لقائمة الطلاب. بيرجع دالة لإلغاء الاشتراك.
 * onError بيتم نداؤه لو الصلاحيات/الاتصال رفضت القراءة.
 */
export const subscribeToStudents = (
  onData: (students: Student[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  return onSnapshot(
    studentsCol(),
    snapshot => {
      const list = snapshot.docs.map(d => ({ ...(d.data() as Student), id: d.id }));
      onData(list);
    },
    error => {
      onError?.(error);
    }
  );
};

/** إنشاء/تحديث طالب (المستند بيستخدم نفس `id` الداخلي للطالب). */
export const saveStudent = async (student: Student): Promise<boolean> => {
  try {
    await setDoc(doc(db, COLLECTIONS.students, student.id), student, { merge: true });
    return true;
  } catch (error) {
    console.warn('[firebase] saveStudent failed', error);
    return false;
  }
};

/** حذف طالب نهائياً + حذف ملفات كتبه من Storage. */
export const deleteStudent = async (student: Student): Promise<boolean> => {
  try {
    await Promise.all(
      (student.uploadedPdfs || [])
        .filter(book => !!book.storagePath)
        .map(book =>
          deleteObject(ref(storage, book.storagePath as string)).catch(() => {
            /* الملف قد يكون محذوف مسبقاً */
          })
        )
    );
    await deleteDoc(doc(db, COLLECTIONS.students, student.id));
    return true;
  } catch (error) {
    console.warn('[firebase] deleteStudent failed', error);
    return false;
  }
};

/** بذّر البيانات الابتدائية لو مجموعة الطلاب فاضية تماماً. */
export const seedStudentsIfEmpty = async (seed: Student[]): Promise<boolean> => {
  try {
    const snapshot = await getDocs(query(studentsCol(), limit(1)));
    if (!snapshot.empty) return false;
    await Promise.all(seed.map(student => setDoc(doc(db, COLLECTIONS.students, student.id), student)));
    return true;
  } catch (error) {
    console.warn('[firebase] seedStudents failed', error);
    return false;
  }
};

/* ------------------------------------------------------------------ */
/*  Books (Firebase Storage)                                           */
/* ------------------------------------------------------------------ */

export interface UploadedBookFile {
  url: string;
  storagePath: string;
}

/** رفع ملف PDF على Firebase Storage وإرجاع رابطه الدائم. */
export const uploadBookFile = async (
  studentId: string,
  bookId: string,
  file: File
): Promise<UploadedBookFile | null> => {
  try {
    const path = `${BOOKS_STORAGE_PATH}/${studentId}/${bookId}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type || 'application/pdf' });
    const url = await getDownloadURL(storageRef);
    return { url, storagePath: path };
  } catch (error) {
    console.warn('[firebase] uploadBookFile failed', error);
    return null;
  }
};

/** حذف ملف كتاب من Storage (لو موجود). */
export const deleteBookFile = async (storagePath?: string): Promise<void> => {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    /* ignore */
  }
};

/* ------------------------------------------------------------------ */
/*  Audit logs                                                         */
/* ------------------------------------------------------------------ */

export const pushAuditLog = async (log: AuditLog): Promise<boolean> => {
  try {
    await setDoc(doc(db, COLLECTIONS.auditLogs, log.id), log, { merge: true });
    return true;
  } catch (error) {
    console.warn('[firebase] pushAuditLog failed', error);
    return false;
  }
};

export const subscribeToAuditLogs = (
  onData: (logs: AuditLog[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  return onSnapshot(
    query(collection(db, COLLECTIONS.auditLogs), orderBy('timestamp', 'desc'), limit(300)),
    snapshot => {
      onData(snapshot.docs.map(d => ({ ...(d.data() as AuditLog), id: d.id })));
    },
    error => onError?.(error)
  );
};

/* ------------------------------------------------------------------ */
/*  Activation codes                                                   */
/* ------------------------------------------------------------------ */

export const saveActivationCode = async (code: GeneratedActivationCode): Promise<boolean> => {
  try {
    await setDoc(doc(db, COLLECTIONS.activationCodes, code.id), code, { merge: true });
    return true;
  } catch (error) {
    console.warn('[firebase] saveActivationCode failed', error);
    return false;
  }
};

export const subscribeToActivationCodes = (
  onData: (codes: GeneratedActivationCode[]) => void,
  onError?: (error: unknown) => void
): (() => void) => {
  return onSnapshot(
    collection(db, COLLECTIONS.activationCodes),
    snapshot => {
      onData(snapshot.docs.map(d => ({ ...(d.data() as GeneratedActivationCode), id: d.id })));
    },
    error => onError?.(error)
  );
};

export const seedActivationCodesIfEmpty = async (seed: GeneratedActivationCode[]): Promise<boolean> => {
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.activationCodes), limit(1)));
    if (!snapshot.empty) return false;
    await Promise.all(seed.map(code => addDoc(collection(db, COLLECTIONS.activationCodes), code)));
    return true;
  } catch (error) {
    console.warn('[firebase] seedActivationCodes failed', error);
    return false;
  }
};
