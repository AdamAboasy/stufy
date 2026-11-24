/**
 * سجل التدقيق على Firestore (إضافة فقط)
 * Append-only audit trail shared across devices.
 */
import { collection, doc, setDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { AuditLog } from '../types';

export const pushAuditLog = async (log: AuditLog): Promise<boolean> => {
  try {
    await setDoc(doc(db, COLLECTIONS.auditLogs, log.id), log, { merge: true });
    return true;
  } catch (error) {
    console.warn('[audit] push failed', error);
    return false;
  }
};

export const subscribeAuditLogs = (
  onData: (logs: AuditLog[]) => void,
  onError?: (error: unknown) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, COLLECTIONS.auditLogs), orderBy('timestamp', 'desc'), limit(300)),
    snapshot => onData(snapshot.docs.map(d => ({ ...(d.data() as AuditLog), id: d.id }))),
    error => onError?.(error)
  );
