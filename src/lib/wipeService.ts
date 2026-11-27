/**
 * «حذف كل البيانات» — بداية من الصفر فعلاً
 * ==========================================================
 * بيمسح:
 *  - students (كل الطلاب وخططهم)
 *  - activationCodes (كل الأكواد)
 *  - auditLogs (سجلات التدقيق — بتتمسح من الجذر، مش أرشفة)
 *  - bookFiles (بقايا قديمة)
 *  - appMeta (مؤشر التهيئة يترجع زي أول مرة)
 *  - staff (كل الأدوار) + حساب الدخول الحالي نفسه (Firebase Auth)
 *
 * النتيجة: بعد الريفريش التطبيق بيرجع لنفس الشاشة النضيفة (خطوة
 * إنشاء أول سوبر أدمن)، من غير أي بيانات قديمة.
 *
 * "Delete all data" wipes every app collection (students, codes, the audit
 * trail, leftovers) plus the admin's own staff doc and Auth account, leaving
 * the app exactly as if it had just been installed.
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
import { getCurrentAuthUser } from './authService';

export interface WipeReport {
  ok: boolean;
  deleted: Record<string, number>;
  errors: string[];
  /** true = حساب الدخول نفسه اتمسح (التطبيق اترجع لشاشة التأسيس) */
  accountDeleted: boolean;
}

const WIPE_COLLECTIONS: { key: string; name: string }[] = [
  { key: 'students', name: COLLECTIONS.students },
  { key: 'activationCodes', name: COLLECTIONS.activationCodes },
  { key: 'auditLogs', name: COLLECTIONS.auditLogs },
  { key: 'bookFiles', name: COLLECTIONS.bookFiles },
  { key: 'staff', name: COLLECTIONS.staff }
];

/** بيمسح كل مستندات مجموعة على دفعات (400 لكل batch) */
const wipeCollection = async (name: string): Promise<{ count: number; errors: string[] }> => {
  const errors: string[] = [];
  let count = 0;

  const snapshot = await getDocs(collection(db, name));
  const docs: QueryDocumentSnapshot[] = snapshot.docs;

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

  // بقايا شرائح الملفات القديمة (لو موجودة)
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
        }
      } catch {
        /* best effort — المستند الأب بيتمسح على أي حال */
      }
    }
  }

  return { count, errors };
};

/** بيمسح مؤشر التهيئة (يرجع التطبيق لحالة أول مرة) */
const wipeMeta = async (): Promise<{ count: number; errors: string[] }> => {
  const errors: string[] = [];
  let count = 0;
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.meta));
    for (const metaDoc of snapshot.docs) {
      await deleteDoc(doc(db, COLLECTIONS.meta, metaDoc.id));
      count += 1;
    }
  } catch (error) {
    errors.push(`appMeta: ${(error as { code?: string })?.code || String(error)}`);
  }
  return { count, errors };
};

/** بيمسح كل localStorage الخاص بالتطبيق (مفيش أي أثر بيفضل في المتصفح) */
export const clearLocalAppData = (): void => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ssp_')) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch {
    /* localStorage ممكن يكون مقفول — مش مشكلة */
  }
};

/** حذف حساب الدخول الحالي من Firebase Auth */
const deleteCurrentAccount = async (): Promise<{ ok: boolean; error?: string }> => {
  const user = getCurrentAuthUser();
  if (!user) return { ok: true };
  try {
    await user.delete();
    return { ok: true };
  } catch (error) {
    const code = (error as { code?: string })?.code || 'unknown';
    // محتاج تسجيل دخول حديث — بعد الريفريش الحساب بيفضل لو ماتمسحش
    return { ok: false, error: code };
  }
};

/**
 * المسح الشامل: كل البيانات + سجل التدقيق + الأدوار + حساب الدخول.
 *
 * الترتيب مقصود:
 *  1) البيانات (طلاب/أكواد/تدقيق/ملفات) — محتاجين صلاحية أدمن.
 *  2) مؤشر التهيئة — إزالته تفتح «نافذة التأسيس» تاني.
 *  3) الأدوار (staff) — آخر كتابة على Firestore.
 *  4) حذف حساب الدخول نفسه (مش محتاج قواعد).
 *  5) لو Firebase رفض حذف الحساب (requires-recent-login) بنرجّع دورك
 *     من «نافذة التأسيس» اللي فتحناها، عشان تفضل قادر تدخل وتكرر الحذف
 *     بعد تسجيل خروج ودخول — بدل ما تعلق بره اللوحة.
 *
 * Wipes every app collection, the audit trail, the bootstrap flag, all roles
 * and finally the admin's own Auth account. If Firebase refuses the account
 * deletion (stale sign-in) the admin role is restored so a retry is possible.
 */
export const wipeAllAppData = async (currentRole: 'SUPER_ADMIN' | 'STUDENT_ADMIN' = 'SUPER_ADMIN'): Promise<WipeReport> => {
  const deleted: Record<string, number> = {};
  const errors: string[] = [];

  const account = getCurrentAuthUser();
  const meUid = account?.uid || '';
  const meEmail = account?.email || '';

  // 1) كل البيانات
  for (const target of WIPE_COLLECTIONS.filter(c => c.key !== 'staff')) {
    try {
      const result = await wipeCollection(target.name);
      deleted[target.key] = result.count;
      errors.push(...result.errors);
    } catch (error) {
      errors.push(`${target.name}: ${(error as { code?: string })?.code || String(error)}`);
    }
  }

  // 2) مؤشر التهيئة (تفتح نافذة التأسيس تاني)
  const meta = await wipeMeta();
  deleted.appMeta = meta.count;
  errors.push(...meta.errors);

  // 3) الأدوار
  const staff = await wipeCollection(COLLECTIONS.staff);
  deleted.staff = staff.count;
  errors.push(...staff.errors);

  // 4) حساب الدخول
  const accountResult = await deleteCurrentAccount();

  // 5) استرجاع الدور لو الحساب فضل موجود (محتاج دخول حديث)
  if (!accountResult.ok) {
    if (accountResult.error) errors.push(`auth: ${accountResult.error}`);
    if (meUid) {
      try {
        await setDoc(doc(db, COLLECTIONS.staff, meUid), {
          uid: meUid,
          email: meEmail.toLowerCase(),
          role: currentRole,
          studentId: null,
          updatedAt: serverTimestamp()
        });
        // نقفل نافذة التأسيس تاني بعد استرجاع الدور
        await setDoc(doc(db, COLLECTIONS.meta, 'bootstrap'), {
          initialized: true,
          initializedAt: serverTimestamp()
        }, { merge: true });
      } catch {
        /* لو فشل الاسترجاع، الرسالة في الواجهة بتشرح الحل اليدوي */
      }
    }
  }

  clearLocalAppData();

  return {
    ok: errors.length === 0,
    deleted,
    errors,
    accountDeleted: accountResult.ok
  };
};
