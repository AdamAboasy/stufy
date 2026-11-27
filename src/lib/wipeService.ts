/**
 * «حذف كل البيانات» — بداية من الصفر فعلاً
 * ==========================================================
 * بيمسح كل **بيانات التطبيق**:
 *  - students (كل الطلاب وخططهم)
 *  - activationCodes (كل الأكواد)
 *  - auditLogs (سجلات التدقيق — بتتمسح من الجذر، مش أرشفة)
 *  - bookFiles (بقايا قديمة)
 *  - أي دور إدارة/طالب تاني في staff (ما عدا دورك)
 *
 * **وبيحافظ على** حساب الإدارة مالك التطبيق:
 *  - مستند `staff/{uid}` بتاعك (سوبر أدمن)
 *  - مؤشر `appMeta/bootstrap` (مقفول، عشان مفيش حد يعمل أدمن جديد)
 *  - حساب Firebase Auth نفسه
 *
 * النتيجة: بترجع لصفحة الدخول، تسجّل دخول بنفس إيميلك وكلمة سرك، وتلاقي
 * التطبيق نضيف تماماً — ومحدش تاني يقدر يدخل.
 *
 * "Delete all data" wipes every app collection (students, codes, the audit
 * trail, leftovers) and every other staff role, but keeps the owner's admin
 * account, role and bootstrap flag so only that account can sign in.
 */
import { collection, getDocs, writeBatch, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { getCurrentAuthUser } from './authService';

export interface WipeReport {
  ok: boolean;
  deleted: Record<string, number>;
  errors: string[];
  /** دايماً false: حساب الإدارة بيفضل موجود (محدش تاني يقدر يدخل) */
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

/**
 * المسح الشامل لبيانات التطبيق (بدون حساب الإدارة صاحب التطبيق).
 *
 * الترتيب مقصود:
 *  1) البيانات (طلاب/أكواد/تدقيق/ملفات) — محتاجين صلاحية أدمن.
 *  2) الأدوار التانية في staff — أي حد تاني كان أدمن بيتشال.
 *  3) حسابك ومؤشر التهيئة **بيفضلوا** زي ما هما ⇒ مفيش نافذة إنشاء أدمن جديدة.
 *
 * Wipes all app data + every other staff role, keeping the owner's admin
 * account, role and bootstrap flag so the app stays locked to that account.
 */
export const wipeAllAppData = async (): Promise<WipeReport> => {
  const deleted: Record<string, number> = {};
  const errors: string[] = [];

  const meUid = getCurrentAuthUser()?.uid || '';

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

  // 2) الأدوار — كل اللي مش إنت
  try {
    const staffSnap = await getDocs(collection(db, COLLECTIONS.staff));
    const others = staffSnap.docs.filter(d => d.id !== meUid);
    let removed = 0;
    for (let start = 0; start < others.length; start += 400) {
      const batch = writeBatch(db);
      others.slice(start, start + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
      removed += Math.min(400, others.length - start);
    }
    deleted.staff = removed;
  } catch (error) {
    errors.push(`staff: ${(error as { code?: string })?.code || String(error)}`);
  }

  clearLocalAppData();

  return {
    ok: errors.length === 0,
    deleted,
    errors,
    /** الحساب بيفضل موجود — التطبيق مقفول على إيميل الإدارة بس */
    accountDeleted: false
  };
};
