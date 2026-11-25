import React, { useMemo, useRef, useState } from 'react';
import { LibraryBook } from '../../types';
import { ACADEMIC_STAGES } from '../../data/academicStages';
import { MAX_FILE_SIZE_MB } from '../student/BookPlanBuilder';
import {
  BookOpen,
  Upload,
  Search,
  Trash2,
  Pencil,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Users,
  FolderOpen
} from 'lucide-react';

const SUBJECTS = [
  { name: 'Physics', nameAr: 'الفيزياء' },
  { name: 'Chemistry', nameAr: 'الكيمياء' },
  { name: 'Biology', nameAr: 'الأحياء' },
  { name: 'Math', nameAr: 'الرياضيات' },
  { name: 'Arabic', nameAr: 'اللغة العربية' },
  { name: 'English', nameAr: 'اللغة الإنجليزية' },
  { name: 'History', nameAr: 'التاريخ' },
  { name: 'Geography', nameAr: 'الجغرافيا' },
  { name: 'Philosophy', nameAr: 'الفلسفة والمنطق' },
  { name: 'Other', nameAr: 'مادة أخرى' }
];

export interface BooksLibraryManagerProps {
  isArabic: boolean;
  books: LibraryBook[];
  isSuperAdmin: boolean;
  storageBackend: 'storage' | 'firestore';
  /** رفع كتاب جديد — بيرجع نتيجة العملية */
  onUploadBook: (
    input: {
      title: string;
      subject: string;
      stageId: string;
      pageCount: number;
      file: File;
    },
    onProgress?: (percent: number) => void
  ) => Promise<{ success: boolean; error?: string }>;
  onUpdateBook: (
    id: string,
    patch: { title: string; subject: string; stageId: string; pageCount: number }
  ) => Promise<boolean>;
  onDeleteBook: (book: LibraryBook) => Promise<{ success: boolean; error?: string }>;
  onOpenBook: (storagePath?: string) => Promise<string | null>;
}

export const BooksLibraryManager: React.FC<BooksLibraryManagerProps> = ({
  isArabic,
  books,
  isSuperAdmin,
  storageBackend,
  onUploadBook,
  onUpdateBook,
  onDeleteBook,
  onOpenBook
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [stageId, setStageId] = useState('');
  const [pageCount, setPageCount] = useState(200);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');

  const [editing, setEditing] = useState<LibraryBook | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('Physics');
  const [editStage, setEditStage] = useState('');
  const [editPages, setEditPages] = useState(200);
  const [confirmDelete, setConfirmDelete] = useState<LibraryBook | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return books.filter(b => {
      if (filterStage && b.stageId !== filterStage) return false;
      if (!term) return true;
      return (
        b.title.toLowerCase().includes(term) ||
        b.subject.toLowerCase().includes(term) ||
        (b.stageLabelAr || '').includes(term) ||
        (b.stageLabelEn || '').toLowerCase().includes(term)
      );
    });
  }, [books, search, filterStage]);

  const handlePickFile = (picked: File | null) => {
    if (!picked) return;
    if (!/\.pdf$/i.test(picked.name)) {
      setError(isArabic ? 'الملفات المدعومة هي PDF فقط.' : 'Only PDF files are supported.');
      return;
    }
    if (picked.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(
        isArabic
          ? `حجم الملف كبير جداً (الحد ${MAX_FILE_SIZE_MB} ميجابايت).`
          : `File is too large (${MAX_FILE_SIZE_MB}MB limit).`
      );
      return;
    }
    setError(null);
    setFile(picked);
    if (!title) setTitle(picked.name.replace(/\.pdf$/i, ''));
    setPageCount(Math.min(900, Math.max(40, Math.round(picked.size / 1024 / 38))));
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setSubject('Physics');
    setStageId('');
    setPageCount(200);
    setProgress(0);
    setError(null);
    setShowUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) {
      setError(isArabic ? 'اختار ملف الكتاب الأول.' : 'Please choose the book file first.');
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const stage = ACADEMIC_STAGES.find(s => s.id === stageId);
      const result = await onUploadBook(
        {
          title: title.trim() || file.name.replace(/\.pdf$/i, ''),
          subject,
          stageId: stage?.id || '',
          pageCount: Number(pageCount) || 1,
          file
        },
        setProgress
      );
      if (!result.success) {
        setError(result.error || (isArabic ? 'تعذّر رفع الكتاب.' : 'Could not upload the book.'));
        return;
      }
      flash(isArabic ? '✅ اتضاف الكتاب للمكتبة وكل الطلاب هيشوفوه.' : '✅ Book added to the library for every student.');
      resetForm();
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (book: LibraryBook) => {
    setEditing(book);
    setEditTitle(book.title);
    setEditSubject(book.subject || 'Physics');
    setEditStage(book.stageId || '');
    setEditPages(book.pageCount || 1);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const stage = ACADEMIC_STAGES.find(s => s.id === editStage);
    const ok = await onUpdateBook(editing.id, {
      title: editTitle.trim() || editing.title,
      subject: editSubject,
      stageId: stage?.id || '',
      pageCount: Number(editPages) || 1
    });
    if (!ok) {
      flash(isArabic ? '⚠️ تعذّر حفظ التعديلات.' : '⚠️ Could not save the changes.');
      return;
    }
    setEditing(null);
    flash(isArabic ? 'تم تحديث بيانات الكتاب.' : 'Book details updated.');
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await onDeleteBook(confirmDelete);
    setConfirmDelete(null);
    flash(
      result.success
        ? isArabic
          ? 'تم حذف الكتاب من المكتبة نهائياً.'
          : 'Book permanently removed from the library.'
        : isArabic
        ? `⚠️ تعذّر الحذف (${result.error}).`
        : `⚠️ Delete failed (${result.error}).`
    );
  };

  const handleOpen = async (book: LibraryBook) => {
    const url = await onOpenBook(book.storagePath);
    if (!url) {
      flash(isArabic ? '⚠️ تعذّر فتح الملف.' : '⚠️ Could not open the file.');
      return;
    }
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-brand-purple/20 text-brand-purple-light border border-brand-purple/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm sm:text-base">
                {isArabic ? 'مكتبة الكتب المركزية' : 'Central Books Library'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                {isArabic
                  ? 'ارفع الكتب مرة واحدة هنا، وكل الطلاب هيختاروا منها وأنت بتعمل خططهم — مفيش رفع من موبايل الطالب.'
                  : 'Upload a book once here and every student picks it while building their plan — no uploads from student devices.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold">
              {books.length} {isArabic ? 'كتاب' : 'books'}
            </span>
            {isSuperAdmin && (
              <button
                onClick={() => setShowUpload(v => !v)}
                className="px-3 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                {isArabic ? 'إضافة كتاب' : 'Add book'}
              </button>
            )}
          </div>
        </div>

        {!isSuperAdmin && (
          <p className="mt-3 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5">
            {isArabic
              ? 'إضافة/حذف الكتب للسوبر أدمن فقط — تقدر تفتح الكتب وتشوف المكتبة.'
              : 'Adding/removing books is limited to the Super Admin — you can open and browse the library.'}
          </p>
        )}
      </div>

      {/* Upload form */}
      {showUpload && isSuperAdmin && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">
              {isArabic ? 'كتاب جديد للمكتبة' : 'New library book'}
            </h3>
            <button onClick={resetForm} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={e => handlePickFile(e.target.files?.[0] || null)}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full rounded-2xl border-2 border-dashed p-5 flex flex-col items-center gap-1.5 transition-colors ${
              file ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-brand-blue/40 bg-brand-blue/5 hover:bg-brand-blue/10'
            }`}
          >
            {file ? (
              <>
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <span className="text-xs font-bold text-white break-all text-center">{file.name}</span>
                <span className="text-[10px] text-slate-400">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB •{' '}
                  {isArabic ? 'اضغط للتغيير' : 'Tap to change'}
                </span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-brand-blue-electric" />
                <span className="text-xs font-bold text-white">
                  {isArabic ? 'اختار ملف PDF للكتاب' : 'Choose the book PDF'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {storageBackend === 'storage'
                    ? isArabic
                      ? `حتى ${MAX_FILE_SIZE_MB} ميجابايت • Firebase Storage`
                      : `Up to ${MAX_FILE_SIZE_MB}MB • Firebase Storage`
                    : isArabic
                    ? `حتى ${MAX_FILE_SIZE_MB} ميجابايت • Firestore (الخطة المجانية)`
                    : `Up to ${MAX_FILE_SIZE_MB}MB • Firestore (free plan)`}
                </span>
              </>
            )}
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isArabic ? 'اسم الكتاب' : 'Book title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={isArabic ? 'مثال: كتاب الامتحان في الفيزياء' : 'e.g. Physics Exam Book'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-blue-electric text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isArabic ? 'المادة' : 'Subject'}
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              >
                {SUBJECTS.map(s => (
                  <option key={s.name} value={s.name}>
                    {isArabic ? s.nameAr : s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-brand-purple-light" />
                {isArabic ? 'المرحلة الدراسية' : 'Academic stage'}
              </label>
              <select
                value={stageId}
                onChange={e => setStageId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              >
                <option value="">{isArabic ? 'كل المراحل' : 'All stages'}</option>
                {ACADEMIC_STAGES.map(st => (
                  <option key={st.id} value={st.id}>
                    {isArabic ? st.labelAr : st.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isArabic ? 'عدد الصفحات' : 'Pages'}
              </label>
              <input
                type="number"
                min={10}
                max={2000}
                value={pageCount}
                onChange={e => setPageCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {uploading && (
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 text-center font-mono">
                {progress}% {isArabic ? 'جاري الرفع...' : 'uploading...'}
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                {isArabic ? 'جاري الرفع...' : 'Uploading...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {isArabic ? 'أضف الكتاب للمكتبة' : 'Add book to library'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isArabic ? 'ابحث بالاسم أو المادة...' : 'Search by title or subject...'}
            className="w-full px-3.5 py-2.5 pr-9 rtl:pr-3.5 rtl:pl-9 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
          />
          <Search className="w-4 h-4 text-slate-500 absolute top-2.5 right-3 rtl:right-auto rtl:left-3" />
        </div>
        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
        >
          <option value="">{isArabic ? 'كل المراحل' : 'All stages'}</option>
          {ACADEMIC_STAGES.map(st => (
            <option key={st.id} value={st.id}>
              {isArabic ? st.labelAr : st.labelEn}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/50 p-10 text-center space-y-2">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">
            {books.length === 0
              ? isArabic
                ? 'المكتبة فاضية'
                : 'The library is empty'
              : isArabic
              ? 'مفيش نتائج للبحث'
              : 'No results'}
          </p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            {isArabic
              ? 'أضف أول كتاب، وبعدها كل الطلاب هيلاقوه جاهز وقت بناء الخطة.'
              : 'Add the first book — students will find it ready when building a plan.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {filtered.map(book => (
            <div key={book.id} className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-red-950/50 text-red-400 border border-red-500/25 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white break-words leading-snug">{book.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {SUBJECTS.find(s => s.name === book.subject)
                      ? isArabic
                        ? SUBJECTS.find(s => s.name === book.subject)?.nameAr
                        : book.subject
                      : book.subject}
                    {' • '}
                    {book.pageCount} {isArabic ? 'صفحة' : 'pages'}
                    {' • '}
                    {book.fileSizeMb} MB
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold">
                      <GraduationCap className="w-3 h-3" />
                      {book.stageId
                        ? isArabic
                          ? book.stageLabelAr || book.stageId
                          : book.stageLabelEn || book.stageId
                        : isArabic
                        ? 'كل المراحل'
                        : 'All stages'}
                    </span>
                    {!!book.useCount && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/50 text-emerald-300 text-[10px] font-bold">
                        <Users className="w-3 h-3" />
                        {book.useCount} {isArabic ? 'استخدام' : 'uses'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpen(book)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {isArabic ? 'فتح الملف' : 'Open'}
                </button>
                {isSuperAdmin && (
                  <>
                    <button
                      onClick={() => startEdit(book)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={isArabic ? 'تعديل' : 'Edit'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(book)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-400"
                      title={isArabic ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">{isArabic ? 'تعديل بيانات الكتاب' : 'Edit book details'}</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              placeholder={isArabic ? 'اسم الكتاب' : 'Book title'}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              >
                {SUBJECTS.map(s => (
                  <option key={s.name} value={s.name}>
                    {isArabic ? s.nameAr : s.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={10}
                value={editPages}
                onChange={e => setEditPages(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
              />
            </div>
            <select
              value={editStage}
              onChange={e => setEditStage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
            >
              <option value="">{isArabic ? 'كل المراحل' : 'All stages'}</option>
              {ACADEMIC_STAGES.map(st => (
                <option key={st.id} value={st.id}>
                  {isArabic ? st.labelAr : st.labelEn}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setEditing(null)} className="py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold">
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={saveEdit} className="py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold">
                {isArabic ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-red-500/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-300 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              {isArabic ? 'حذف نهائي' : 'Permanent delete'}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isArabic
                ? `هيتحذف «${confirmDelete.title}» من المكتبة والملف بتاعه نهائياً. الخطط اللي اتبنت منه عند الطلاب هتفضل زي ما هي.`
                : `“${confirmDelete.title}” and its file will be permanently removed. Plans students already built stay as they are.`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmDelete(null)} className="py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold">
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleDelete} className="py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold">
                {isArabic ? 'حذف نهائي' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
