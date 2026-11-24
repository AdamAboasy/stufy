/**
 * أكواد التفعيل على Firestore
 * ===========================
 * الكود نفسه هو معرّف المستند (uppercase) — فالتحقق بيحصل بقراءة واحدة
 * ومن أي جهاز، والحالة بتتحدّث للكل فوراً (Redeemed / Revoked).
 */
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocsFromServer,
  getDocsFromCache
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { GeneratedActivationCode } from '../types';

const codesCol = () => collection(db, COLLECTIONS.activationCodes);

const docId = (code: string) => code.trim().toUpperCase();

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
  const snapshot = await getDocsFromServer(codesCol());
  return snapshot.docs.map(d => ({ ...(d.data() as GeneratedActivationCode), id: d.id }));
};

export const getActivationCode = async (
  code: string
): Promise<GeneratedActivationCode | null> => {
  const id = docId(code);
  if (!id) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.activationCodes, id));
    if (snap.exists()) return { ...(snap.data() as GeneratedActivationCode), id: snap.id };
  } catch {
    /* ignore - fall through to server scan */
  }

  // fallback للبيانات القديمة اللي معرّفها random id — من الكاش المحلي فقط
  // (قراءة القائمة من السيرفر للأدمن بس، فمش بنعملها هنا)
  try {
    const cached = await getDocsFromCache(codesCol());
    const hit = cached.docs
      .map(d => ({ ...(d.data() as GeneratedActivationCode), id: d.id }))
      .find(c => (c.code || '').trim().toUpperCase() === id);
    return hit || null;
  } catch {
    return null;
  }
};

export const saveActivationCode = async (
  code: GeneratedActivationCode
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await setDoc(
      doc(db, COLLECTIONS.activationCodes, docId(code.code)),
      { ...code, code: docId(code.code) },
      { merge: true }
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as { code?: string })?.code || String(error) };
  }
};

/** تحديث حالة الكود (Redeemed + بيانات الطالب) */
export const markCodeRedeemed = async (
  code: string,
  student: { id: string; studentId: string; fullName: string }
): Promise<void> => {
  const id = docId(code);
  try {
    const existing = await getActivationCode(code);
    if (!existing) return;
    await setDoc(
      doc(db, COLLECTIONS.activationCodes, existing.id),
      {
        ...existing,
        status: 'Redeemed',
        assignedStudentId: student.studentId,
        assignedStudentName: student.fullName,
        redeemedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch {
    /* ignore */
  }
};

export const revokeActivationCode = async (id: string): Promise<boolean> => {
  try {
    const refDoc = doc(db, COLLECTIONS.activationCodes, id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) return false;
    await setDoc(refDoc, { status: 'Revoked' }, { merge: true });
    return true;
  } catch {
    return false;
  }
};
