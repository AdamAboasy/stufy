/**
 * تخزين ملفات الكتب — بيعمل تلقائياً على أنسب وسيلة متاحة
 * ======================================================
 * الخطة المجانية (Spark) مفيهاش Firebase Storage، فبنستخدم **Firestore** كبديل:
 * الملف بيتقسّم لشرائح Base64 (~700KB) في مستند خاص بكل كتاب، وبيرجع نفس
 * شكل الناتج اللي Storage بيرجعه، فباقي التطبيق مش بيفرق معاه.
 *
 * الترتيب:
 *   1) Firebase Storage  → لو المشروع على Blaze و Storage متفعّل (الأفضل والأسرع)
 *   2) Firestore chunks  → بديل مجاني بالكامل (حد ~1MB للمستند)
 *
 * كل الدوال بترجع نفس الشكل: { url, storagePath }
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { storage, db, BOOKS_STORAGE_PATH } from './firebase';

export interface UploadedBookFile {
  url: string;
  /** مسار Storage أو معرّف مستند الشرائح في Firestore */
  storagePath: string;
  /** الوسيلة اللي اتخزن بيها الملف */
  backend?: 'storage' | 'firestore';
}

export type StorageBackend = 'storage' | 'firestore';

/** الحد الأقصى للملف على بديل Firestore (سلامة الحجم الإجمالي) */
export const FIRESTORE_FILE_LIMIT_MB = 200;

/** حجم الشريحة قبل Base64 (~512KB خام → ~683KB نص) */
const CHUNK_BYTES = 512 * 1024;

export const FILES_COLLECTION = 'bookFiles';

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

const safeFileName = (name: string) => name.replace(/[^\w.\-]+/g, '_');

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const stride = 0x8000;
  for (let i = 0; i < bytes.length; i += stride) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + stride)) as unknown as number[]
    );
  }
  return btoa(binary);
};

/** بيفك شريحة Base64 ويرجعها بايتات (كل شريحة بتتفك لوحدها لأن padding بيتكرر) */
const base64ToBytes = (data: string): Uint8Array => {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** يجمّع شرائح Base64 بايت-بايت ويرجع Blob URL صالح للفتح */
const chunksToBlobUrl = (chunks: string[], mime = 'application/pdf'): string => {
  const parts = chunks.map(base64ToBytes);
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return URL.createObjectURL(new Blob([merged], { type: mime }));
};

/** اختيار الوسيلة: Storage لو متاح، وإلا Firestore */
const detectBackend = async (): Promise<StorageBackend> => {
  try {
    // تجربة كتابة صغيرة جداً في Storage — لو اترفضت (Blaze مطلوب) بنرجع Firestore
    const probePath = `${BOOKS_STORAGE_PATH}/.probe`;
    const probeRef = ref(storage, probePath);
    await uploadBytes(probeRef, new Blob([new Uint8Array([0])], { type: 'application/octet-stream' }));
    await deleteObject(probeRef).catch(() => undefined);
    return 'storage';
  } catch (error) {
    const code = (error as { code?: string })?.code || '';
    if (code.includes('unauthorized') || code.includes('quota') || code.includes('billing') || code.includes('storage')) {
      console.info('[books] Firebase Storage unavailable (Blaze required) — using Firestore fallback');
    }
    return 'firestore';
  }
};

let cachedBackend: StorageBackend | null = null;

export const resolveStorageBackend = async (): Promise<StorageBackend> => {
  if (cachedBackend) return cachedBackend;
  cachedBackend = await detectBackend();
  return cachedBackend;
};

/* ------------------------------------------------------------------ */
/*  Upload                                                             */
/* ------------------------------------------------------------------ */

const uploadToStorage = async (
  studentId: string,
  bookId: string,
  file: File
): Promise<UploadedBookFile | null> => {
  const path = `${BOOKS_STORAGE_PATH}/${studentId}/${bookId}-${safeFileName(file.name)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
  const url = await getDownloadURL(storageRef);
  return { url, storagePath: path, backend: 'storage' };
};

const uploadToFirestore = async (
  studentId: string,
  bookId: string,
  file: File
): Promise<UploadedBookFile | null> => {
  const fileDocId = `${studentId}__${bookId}`;
  const buffer = await file.arrayBuffer();
  const totalChunks = Math.ceil(buffer.byteLength / CHUNK_BYTES);

  // 1) مستند البيانات الوصفية (من غير الشرائح)
  await setDoc(doc(db, FILES_COLLECTION, fileDocId), {
    studentId,
    bookId,
    fileName: file.name,
    mime: 'application/pdf',
    size: file.size,
    totalChunks,
    backend: 'firestore',
    createdAt: serverTimestamp()
  });

  // 2) مستند لكل شريحة — عشان مفيش مستند يعدي حد الـ 1MB
  for (let index = 0; index < totalChunks; index++) {
    const slice = buffer.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
    await setDoc(doc(db, FILES_COLLECTION, fileDocId, 'chunks', String(index)), {
      index,
      data: arrayBufferToBase64(slice)
    });
  }

  return {
    url: `firestore://${FILES_COLLECTION}/${fileDocId}`,
    storagePath: `firestore:${fileDocId}`,
    backend: 'firestore'
  };
};

/**
 * رفع ملف الكتاب. بيرجع null لو كل الوسائل فشلت
 * (الملف نفسه بيتحفظ في بيانات الطالب على Firestore في الحالتين).
 */
export const uploadBook = async (
  studentId: string,
  bookId: string,
  file: File
): Promise<UploadedBookFile | null> => {
  const backend = await resolveStorageBackend();

  if (backend === 'storage') {
    try {
      return await uploadToStorage(studentId, bookId, file);
    } catch (error) {
      console.warn('[books] storage upload failed, falling back to Firestore', error);
      cachedBackend = 'firestore';
    }
  }

  if (file.size > FIRESTORE_FILE_LIMIT_MB * 1024 * 1024) {
    console.warn('[books] file too large for the Firestore fallback');
    return null;
  }

  try {
    return await uploadToFirestore(studentId, bookId, file);
  } catch (error) {
    console.warn('[books] firestore upload failed', error);
    return null;
  }
};

/* ------------------------------------------------------------------ */
/*  Open / download                                                    */
/* ------------------------------------------------------------------ */

/**
 * بيرجع رابط قابل للفتح للملف.
 * - ملفات Storage: رابط مباشر
 * - ملفات Firestore: بيجمّع الشرائح ويرجع Blob URL
 */
export const getBookFileUrl = async (
  storagePath?: string
): Promise<string | null> => {
  if (!storagePath) return null;

  if (storagePath.startsWith('firestore:')) {
    const fileDocId = storagePath.replace('firestore:', '');
    try {
      const meta = await getDoc(doc(db, FILES_COLLECTION, fileDocId));
      if (!meta.exists()) return null;
      const totalChunks = Number(meta.data()?.totalChunks || 0);
      const parts: string[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunk = await getDoc(doc(db, FILES_COLLECTION, fileDocId, 'chunks', String(i)));
        if (!chunk.exists()) continue;
        parts.push(String(chunk.data()?.data || ''));
      }
      return chunksToBlobUrl(parts, 'application/pdf');
    } catch (error) {
      console.warn('[books] could not assemble firestore file', error);
      return null;
    }
  }

  // ملف Storage عادي
  try {
    return await getDownloadURL(ref(storage, storagePath));
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */

export const deleteBookFile = async (storagePath?: string): Promise<void> => {
  if (!storagePath) return;

  // ملف على بديل Firestore
  if (storagePath.startsWith('firestore:')) {
    const fileDocId = storagePath.replace('firestore:', '');
    try {
      const meta = await getDoc(doc(db, FILES_COLLECTION, fileDocId));
      const totalChunks = Number(meta.data()?.totalChunks || 0);
      for (let i = 0; i < totalChunks; i++) {
        await deleteDoc(doc(db, FILES_COLLECTION, fileDocId, 'chunks', String(i))).catch(() => undefined);
      }
      await deleteDoc(doc(db, FILES_COLLECTION, fileDocId)).catch(() => undefined);
    } catch {
      /* ignore */
    }
    return;
  }

  // ملف Storage
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    /* already gone */
  }
};
