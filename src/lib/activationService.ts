/**
 * طبقة البيانات المشتركة — إصلاح جذري لربط البيانات
 * ================================================
 * المشاكل اللي كانت بتخلي البيانات «متظبطش»:
 *
 * 1) **أكواد التفعيل**: التسجيل كان بيقرأ الكود بـ `getDoc` ثم بيكتب القائمة
 *    كلها بـ `setDoc` على مستند واحد. أي كود قديم كان بيتكتب فوق الكود
 *    الموجود (بمسح باقي الحقول) — وده كان بيخرّب البيانات.
 *    الحل: كل التحديثات بقت `updateDoc` بحقول محددة، ومعاملة ذرّية
 *    (`runTransaction`) لما الكود يتم «استهلاكه» أثناء التسجيل.
 *
 * 2) **عدّاد إحصائي**: كل التحقق/الكتابة بيتعامل مع مستند واحد.
 *
 * 3) **رسائل أخطاء حقيقية**: كل دالة بترجّع كود الخطأ الأصلي
 *    (`permission-denied`, `unavailable` …) بدل ابتلاعه.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, COLLECTIONS } from './firebase';
import { GeneratedActivationCode } from '../types';

const codesCol = () => collection(db, COLLECTIONS.activationCodes);

/** معرّف المستند = الكود (uppercase) */
const docId = (code: string) => code.trim().toUpperCase();

const errCode = (error: unknown) => (error as { code?: string })?.code || String(error);

const mapDataError = (code: string, isArabic: boolean): string => {
  const ar: Record<string, string> = {
    'permission-denied':
      'القواعد منعت العملية (permission-denied) — تأكد إنك مسجّل دخول وإن firestore.rules منشورة من Console.',
    unavailable: 'قاعدة البيانات مش متاحة دلوقتي (unavailable) — جرّب بعد لحظات.',
    unauthenticated: 'لازم تسجّل دخول الأول.',
    'not-found': 'المستند مش موجود.'
  };
  const en: Record<string, string> = {
    'permission-denied':
      'Blocked by rules (permission-denied) — make sure you are signed in and firestore.rules is published.',
    unavailable: 'The database is unavailable right now — try again in a moment.',
    unauthenticated: 'You need to sign in first.',
    'not-found': 'The document does not exist.'
  };
  const table = isArabic ? ar : en;
  return table[code] || code;
};

export const describeDataError = mapDataError;

/* ------------------------------------------------------------------ */
/*  Reads                                                             */
/* ------------------------------------------------------------------ */

/** اشتراك لحظي في كل الأكواد (أدمن فقط حسب القواعد) */
export const subscribeActivationCodes = (
  onData: (codes: GeneratedActivationCode[]) => void,
  onError?: (error: unknown) => void
): (() => void) =>
  onSnapshot(
    codesCol(),
    snapshot => {
      onData(snapshot.docs.map(d => ({ ...(d.data() as GeneratedActivationCode), id: d.id })));
    },
    error => onError?.(error)
  );

export const fetchActivationCodes = async (): Promise<GeneratedActivationCode[]> => {
  const snapshot = await getDocs(codesCol());
  return snapshot.docs.map(d => ({ ...(d.data() as GeneratedActivationCode), id: d.id }));
};

/**
 * قراءة كود واحد بالمعرّف (يشتغل حتى لغير المسجّلين — القواعد بتسمح بـ get).
 * بيرجع كود الخطأ الحقيقي بدل ما يخفي المشكلة.
 */
export const getActivationCode = async (
  code: string
): Promise<{ ok: boolean; data?: GeneratedActivationCode; error?: string }> => {
  const id = docId(code);
  if (!id) return { ok: false, error: 'invalid-code' };
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.activationCodes, id));
    if (snap.exists()) {
      return { ok: true, data: { ...(snap.data() as GeneratedActivationCode), id: snap.id } };
    }

    // توافق خلفي: مستندات قديمة معرّفها عشوائي — بحث بالقيمة على السيرفر
    try {
      const all = await getDocs(codesCol());
      const hit = all.docs
        .map(d => ({ ...(d.data() as GeneratedActivationCode), id: d.id }))
        .find(c => (c.code || '').trim().toUpperCase() === id);
      if (hit) return { ok: true, data: hit };
    } catch {
      /* القراءة بالقائمة للأدمن فقط — نتجاهل ونرجّع not-found */
    }
    return { ok: false, error: 'not-found' };
  } catch (error) {
    return { ok: false, error: errCode(error) };
  }
};

/* ------------------------------------------------------------------ */
/*  Writes                                                            */
/* ------------------------------------------------------------------ */

/** إنشاء كود جديد (الأدمن فقط حسب القواعد) */
export const saveActivationCode = async (
  code: GeneratedActivationCode
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await setDoc(doc(db, COLLECTIONS.activationCodes, docId(code.code)), {
      ...code,
      code: docId(code.code),
      createdByUid: auth.currentUser?.uid || null,
      updatedAt: serverTimestamp()
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errCode(error) };
  }
};

/**
 * استهلاك الكود + إنشاء مستند الطالب في **معاملة واحدة**.
 * لو أي خطوة فشلت، مفيش حاجة بتتغير (الكود مش هيتبلّع والطالب مش هيتعمل).
 */
export const redeemCodeAndCreateStudent = async (params: {
  code: string;
  studentId: string;
  studentData: Record<string, unknown>;
  assignedStudentId: string;
  assignedStudentName: string;
}): Promise<{ ok: boolean; error?: string }> => {
  const codeRef = doc(db, COLLECTIONS.activationCodes, docId(params.code));
  const studentRef = doc(db, COLLECTIONS.students, params.studentId);

  try {
    await runTransaction(db, async transaction => {
      const codeSnap = await transaction.get(codeRef);
      if (!codeSnap.exists()) throw new Error('code-missing');
      const data = codeSnap.data() as GeneratedActivationCode;
      if (data.status === 'Redeemed') throw new Error('code-redeemed');
      if (data.status === 'Revoked') throw new Error('code-revoked');

      transaction.set(studentRef, params.studentData);
      transaction.update(codeRef, {
        status: 'Redeemed',
        assignedStudentId: params.assignedStudentId,
        assignedStudentName: params.assignedStudentName,
        redeemedAt: new Date().toISOString(),
        redeemedByUid: params.studentId
      });
    });
    return { ok: true };
  } catch (error) {
    const message = (error as Error)?.message;
    if (message === 'code-missing') return { ok: false, error: 'code-missing' };
    if (message === 'code-redeemed') return { ok: false, error: 'code-redeemed' };
    if (message === 'code-revoked') return { ok: false, error: 'code-revoked' };
    return { ok: false, error: errCode(error) };
  }
};

/** تعليم الكود كمُستهلك لمستند طالب موجود (بدون إنشاء طالب) */
export const markCodeRedeemed = async (
  code: string,
  student: { id: string; studentId: string; fullName: string }
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.activationCodes, docId(code)), {
      status: 'Redeemed',
      assignedStudentId: student.studentId,
      assignedStudentName: student.fullName,
      redeemedAt: new Date().toISOString(),
      redeemedByUid: student.id
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errCode(error) };
  }
};

/** إلغاء كود (بحقول محددة فقط — مش بيكتب فوق المستند) */
export const revokeActivationCode = async (
  code: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.activationCodes, docId(code)), {
      status: 'Revoked',
      revokedAt: new Date().toISOString()
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errCode(error) };
  }
};

export const deleteActivationCode = async (
  code: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.activationCodes, docId(code)));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errCode(error) };
  }
};
