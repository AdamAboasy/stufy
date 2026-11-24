/**
 * ملفات الكتب على Firebase Storage
 * =================================
 * كل كتاب بيترفع على مسار ثابت واسم فريد، والرابط بينحفظ في بيانات الطالب
 * داخل Firestore — فأي جهاز بيشوف نفس الكتاب.
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, BOOKS_STORAGE_PATH } from './firebase';

export interface UploadedBookFile {
  url: string;
  storagePath: string;
}

export const uploadBook = async (
  studentId: string,
  bookId: string,
  file: File
): Promise<UploadedBookFile | null> => {
  try {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${BOOKS_STORAGE_PATH}/${studentId}/${bookId}-${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
    const url = await getDownloadURL(storageRef);
    return { url, storagePath: path };
  } catch (error) {
    console.warn('[storage] upload failed', error);
    return null;
  }
};

export const deleteBookFile = async (storagePath?: string): Promise<void> => {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    /* already gone */
  }
};
