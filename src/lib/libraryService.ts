/**
 * مكتبة الكتب المركزية
 * ====================
 * الأدمن بيرفع الكتاب **مرة واحدة**، وكل الطلاب بيختاروا منه بدل ما يرفعوا
 * نسخة من جهازهم. الكتاب بيتخزن في نفس طبقة التخزين الذكية (`booksService`):
 * Firebase Storage لو متاح، وإلا Firestore chunks (الخطة المجانية).
 *
 * كل عمليات القراءة/الكتابة بتمر من هنا، وقواعد الأمان بتسمح:
 *   - القراءة: أي مستخدم مسجّل (الطالب لازم يشوف المكتبة).
 *   - الإنشاء/التعديل/الحذف: الأدمن فقط.
 *
 * Central book library: an admin uploads a book once and every student picks
 * it, instead of re-uploading from their own device.
 */
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth, COLLECTIONS } from './firebase';
import { uploadBook, deleteBookFile } from './booksService';
import { LibraryBook } from '../types';

const libraryCol = () => collection(db, COLLECTIONS.library);

export const subscribeLibrary = (
  onData: (books: LibraryBook[]) => void,
  onError?: (error: unknown) => void
): (() => void) =>
  onSnapshot(
    query(libraryCol(), orderBy('createdAt', 'desc')),
    snapshot => {
      onData(
        snapshot.docs
          .map(d => ({ ...(d.data() as LibraryBook), id: d.id }))
          .filter(b => !b.isArchived)
      );
    },
    error => onError?.(error)
  );

export const getLibraryBook = async (id: string): Promise<LibraryBook | null> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.library, id));
    return snap.exists() ? ({ ...(snap.data() as LibraryBook), id: snap.id } as LibraryBook) : null;
  } catch {
    return null;
  }
};

export interface AddLibraryBookInput {
  title: string;
  subject: string;
  stageId?: string;
  stageLabelAr?: string;
  stageLabelEn?: string;
  pageCount: number;
  file: File;
  createdBy: string;
}

/** رفع كتاب جديد للمكتبة: ملف + بيانات وصفية */
export const addLibraryBook = async (
  input: AddLibraryBookInput,
  onProgress?: (percent: number) => void
): Promise<{ ok: boolean; book?: LibraryBook; error?: string }> => {
  const id = `lib-${Date.now()}`;

  // 1) الملف الأول — من غير ملف مفيش كتاب
  // ownerUid = 'library' ⇒ ملفات المكتبة متاحة لكل الطلاب المسجّلين في القواعد
  const uploaded = await uploadBook('library', id, input.file, onProgress, 'library');
  if (!uploaded) {
    return { ok: false, error: 'upload-failed' };
  }

  const book: LibraryBook = {
    id,
    title: input.title.trim() || input.file.name.replace(/\.pdf$/i, ''),
    subject: input.subject,
    stageId: input.stageId || '',
    stageLabelAr: input.stageLabelAr,
    stageLabelEn: input.stageLabelEn,
    originalFilename: input.file.name,
    fileSizeMb: Number((input.file.size / (1024 * 1024)).toFixed(1)),
    pageCount: Number(input.pageCount) || 1,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    storagePath: uploaded.storagePath,
    fileUrl: uploaded.url,
    useCount: 0
  };

  try {
    await setDoc(doc(db, COLLECTIONS.library, id), {
      ...book,
      ownerUid: auth.currentUser?.uid || null
    });
    return { ok: true, book };
  } catch (error) {
    // لو الميتاداتا فشلت، امسح الملف عشان مفيش ملف يتيم
    await deleteBookFile(uploaded.storagePath).catch(() => undefined);
    return { ok: false, error: (error as { code?: string })?.code || String(error) };
  }
};

/** تعديل بيانات كتاب (العنوان/المادة/المرحلة) */
export const updateLibraryBook = async (
  id: string,
  patch: Partial<Pick<LibraryBook, 'title' | 'subject' | 'stageId' | 'stageLabelAr' | 'stageLabelEn' | 'pageCount'>>
): Promise<boolean> => {
  try {
    await setDoc(doc(db, COLLECTIONS.library, id), patch, { merge: true });
    return true;
  } catch {
    return false;
  }
};

/** حذف كتاب من المكتبة نهائياً (المستند + الملف) */
export const deleteLibraryBook = async (
  book: Pick<LibraryBook, 'id' | 'storagePath'>
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.library, book.id));
  } catch (error) {
    return { ok: false, error: (error as { code?: string })?.code || String(error) };
  }
  await deleteBookFile(book.storagePath).catch(() => undefined);
  return { ok: true };
};

/** زيادة عدّاد الاستخدام لما طالب يبني خطة من الكتاب */
export const incrementLibraryUse = async (book: LibraryBook): Promise<void> => {
  try {
    await setDoc(
      doc(db, COLLECTIONS.library, book.id),
      { useCount: Number(book.useCount || 0) + 1 },
      { merge: true }
    );
  } catch {
    /* عدّاد إحصائي — مش حرج */
  }
};
