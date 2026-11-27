/**
 * تصفير النظام — بداية نظيفة من غير ما تفتح Firebase Console
 * ==========================================================
 * بيمسح كل بيانات التطبيق من Firestore (طلاب، أدوار، سجل تدقيق، أكواد،
 * ملفات كتب) **مع الإبقاء على المستخدم المسجّل و مستنده في staff** عشان
 * ما يخرجش من الجلسة ويقدر يكمّل.
 *
 * ⚠️ الحذف نهائي. بيتم على دفعات (batches) مع تقرير باللي اتحذف.
 *
 * Reset service: wipes every app collection (students, roles, audit trail,
 * activation codes, book files) but keeps the caller's own staff document so
 * the session survives.
 */
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';

export interface ResetReport {
  ok: boolean;
  deleted: Record<string, number>;
  errors: string[];
}

/** مجموعات البيانات اللي بتتمسح بالكامل */
const WIPE_COLLECTIONS: { key: string; name: string }[] = [
  { key: 'students', name: COLLECTIONS.students },
  { key: 'activationCodes', name: COLLECTIONS.activationCodes },
  { key: 'auditLogs', name: COLLECTIONS.auditLogs },
  { key: 'bookFiles', name: COLLECTIONS.bookFiles }
];

/** بيمسح مستندات collection على دفعات */
const wipeCollection = async (
  name: string
): Promise<{ count: number; errors: string[] }> => {
  const errors: string[] = [];
  let count = 0;

  const snapshot = await getDocs(collection(db, name));
  const docs: QueryDocumentSnapshot[] = snapshot.docs;

  // 400 مستند لكل batch (الحد الرسمي 500) — والشرائح بتتمسح مع أبوها يدوياً
  for (let start = 0; start < docs.length; start += 400) {
    const batch = writeBatch(db);
    docs.slice(start, start + 400).forEach(d => batch.delete(d.ref));
    try {
      await batch.commit();
      count += Math.min(400, docs.length - start);
    } catch (error) {
      errors.push(`${name}: ${(error as { code?: string })?.code || String(error)}`);
      break;
    }
  }

  // شرائح ملفات الكتب (bookFiles/{id}/chunks) — لازم تتمسح قبل/مع المستند
  if (name === COLLECTIONS.bookFiles) {
    for (const bookDoc of docs) {
      try {
        const chunks = await getDocs(collection(db, name, bookDoc.id, 'chunks'));
        if (chunks.empty) continue;
        const refs = chunks.docs.map(c => c.ref);
        for (let s = 0; s < refs.length; s += 400) {
          const b = writeBatch(db);
          refs.slice(s, s + 400).forEach(r => b.delete(r));
          await b.commit();
          count += 1;
        }
      } catch (error) {
        errors.push(`${name}/${bookDoc.id}/chunks: ${(error as { code?: string })?.code || String(error)}`);
      }
    }
  }

  return { count, errors };
};

/**
 * مسح كل الموظفين (staff) **ما عدا** صاحب الجلسة الحالية.
 * كده السوبر أدمن الحالي يفضل قادر يدخل، وأي أدوار قديمة تتشال.
 */
const wipeStaffExcept = async (
  keepUid: string
): Promise<{ count: number; errors: string[] }> => {
  const errors: string[] = [];
  let count = 0;
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.staff));
    const targets = snapshot.docs.filter(d => d.id !== keepUid);
    for (let start = 0; start < targets.length; start += 400) {
      const batch = writeBatch(db);
      targets.slice(start, start + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
      count += Math.min(400, targets.length - start);
    }
  } catch (error) {
    errors.push(`staff: ${(error as { code?: string })?.code || String(error)}`);
  }
  return { count, errors };
};

/** تصفير كل البيانات (مع الإبقاء على المستخدم الحالي) */
export const resetAllAppData = async (keepUid: string): Promise<ResetReport> => {
  const deleted: Record<string, number> = {};
  const errors: string[] = [];

  for (const target of WIPE_COLLECTIONS) {
    try {
      const result = await wipeCollection(target.name);
      deleted[target.key] = result.count;
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`${target.name}: ${(error as { code?: string })?.code || String(error)}`);
    }
  }

  const staff = await wipeStaffExcept(keepUid);
  deleted.staff = staff.count;
  errors.push(...staff.errors);

  return { ok: errors.length === 0, deleted, errors };
};

/**
 * إعادة ضبط «مؤشر التهيئة».
 *
 * المشكلة اللي بيحلها: مؤشر `appMeta/bootstrap` بيقفل نافذة إنشاء أول أدمن
 * للأبد. لو مسحت كل البيانات (أو حسابات Auth) بقى التطبيق عالق: مفيش أدمن
 * ومفيش طريقة تعمل واحد. الدالة دي بتخلي المؤشر يطابق الواقع:
 * موجود = فيه أدوار إدارة فعلاً في staff، مش موجود = مفيش.
 */
export const reconcileBootstrapFlag = async (): Promise<{
  adminCount: number;
  flagWritten: boolean;
}> => {
  const staffSnap = await getDocs(collection(db, COLLECTIONS.staff));
  const adminCount = staffSnap.docs.filter(d => {
    const role = (d.data() as { role?: string }).role;
    return role === 'SUPER_ADMIN' || role === 'STUDENT_ADMIN';
  }).length;

  const flagRef = doc(db, COLLECTIONS.meta, 'bootstrap');

  if (adminCount > 0) {
    // فيه أدوار ⇒ النافذة مقفولة
    try {
      await setDoc(flagRef, { initialized: true, initializedAt: serverTimestamp() }, { merge: true });
      return { adminCount, flagWritten: true };
    } catch {
      return { adminCount, flagWritten: false };
    }
  }

  // مفيش أي أدمن ⇒ لازم النافذة تتفتح عشان تقدر تصنع واحد
  try {
    await deleteDoc(flagRef);
    return { adminCount, flagWritten: true };
  } catch {
    return { adminCount, flagWritten: false };
  }
};
