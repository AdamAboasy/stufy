import React, { useMemo, useRef, useState } from 'react';
import { BookStudyPlan } from '../../types';
import {
  addDays,
  buildBookPlan,
  detectPdfPageCount,
  titleFromFilename,
  todayISO
} from '../../utils/studyPlanner';
import { AlertCircle, CalendarDays, FileUp, Loader2, Minus, Plus, Sparkles, X, CheckCircle2 } from 'lucide-react';

interface BookPlanModalProps {
  isArabic: boolean;
  onClose: () => void;
  onCreate: (plan: BookStudyPlan, fileSizeMb: number) => void;
}

const MAX_PDF_BYTES = 200 * 1024 * 1024;

export const BookPlanModal: React.FC<BookPlanModalProps> = ({ isArabic, onClose, onCreate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tomorrow = addDays(todayISO(), 1);

  const [file, setFile] = useState<File | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [pageCount, setPageCount] = useState<string>('');
  const [examDate, setExamDate] = useState('');
  const [rounds, setRounds] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (selected: File | null) => {
    setError(null);
    setDetectedNote(null);
    if (!selected) return;

    const isPdf = selected.type === 'application/pdf' || /\.pdf$/i.test(selected.name);
    if (!isPdf) {
      setError(isArabic ? 'من فضلك اختر ملف PDF فقط.' : 'Please choose a PDF file.');
      return;
    }
    if (selected.size > MAX_PDF_BYTES) {
      setError(isArabic ? 'حجم الملف كبير جداً (الحد الأقصى 200 ميجا).' : 'File is too large (max 200 MB).');
      return;
    }

    setFile(selected);
    if (!title.trim()) setTitle(titleFromFilename(selected.name));

    setDetecting(true);
    const pages = await detectPdfPageCount(selected);
    setDetecting(false);
    if (pages > 0) {
      setPageCount(String(pages));
      setDetectedNote(
        isArabic ? `تم اكتشاف ${pages} صفحة تلقائياً، عدّلها لو مش صح.` : `Detected ${pages} pages automatically. Edit if wrong.`
      );
    } else {
      setPageCount('');
      setDetectedNote(
        isArabic ? 'مقدرناش نعرف عدد الصفحات تلقائياً، اكتبه بنفسك.' : "Couldn't detect the page count. Please enter it."
      );
    }
  };

  const pagesNumber = parseInt(pageCount, 10);
  const pagesValid = Number.isFinite(pagesNumber) && pagesNumber >= 1 && pagesNumber <= 5000;
  const examValid = examDate >= tomorrow;

  // Live preview of what the plan will look like.
  const preview = useMemo(() => {
    if (!pagesValid || !examValid) return null;
    try {
      const plan = buildBookPlan({
        bookTitle: title || 'book',
        subject: subject || 'subject',
        originalFilename: file?.name || '',
        pageCount: pagesNumber,
        examDate,
        revisionRounds: rounds
      });
      const study = plan.tasks.filter(t => t.round === 0);
      const revision = plan.tasks.filter(t => t.round > 0);
      const avg = (list: typeof plan.tasks) =>
        list.length === 0 ? 0 : Math.round(list.reduce((s, t) => s + (t.pagesTo - t.pagesFrom + 1), 0) / list.length);
      const avgMinutes = (list: typeof plan.tasks) =>
        list.length === 0 ? 0 : Math.round(list.reduce((s, t) => s + t.estimatedMinutes, 0) / list.length);
      return {
        usedRounds: plan.revisionRounds,
        studyDays: study.length,
        studyPagesPerDay: avg(study),
        studyMinutes: avgMinutes(study),
        revisionDays: revision.length,
        revisionPagesPerDay: avg(revision)
      };
    } catch {
      return null;
    }
  }, [pagesValid, examValid, pagesNumber, examDate, rounds, title, subject, file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError(isArabic ? 'ارفع ملف الكتاب (PDF) الأول.' : 'Upload the book PDF first.');
      return;
    }
    if (!title.trim()) {
      setError(isArabic ? 'اكتب اسم الكتاب.' : 'Enter the book title.');
      return;
    }
    if (!subject.trim()) {
      setError(isArabic ? 'اكتب اسم المادة.' : 'Enter the subject.');
      return;
    }
    if (!pagesValid) {
      setError(isArabic ? 'اكتب عدد صفحات صحيح (من 1 إلى 5000).' : 'Enter a valid page count (1–5000).');
      return;
    }
    if (!examValid) {
      setError(isArabic ? 'يوم الامتحان لازم يكون من بكرة فصاعداً.' : 'The exam date must be tomorrow or later.');
      return;
    }

    try {
      const plan = buildBookPlan({
        bookTitle: title,
        subject,
        originalFilename: file.name,
        pageCount: pagesNumber,
        examDate,
        revisionRounds: rounds
      });
      onCreate(plan, file.size / 1024 / 1024);
    } catch {
      setError(isArabic ? 'تعذر إنشاء الخطة، راجع البيانات.' : 'Could not build the plan. Check the details.');
    }
  };

  const inputClass =
    'w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-blue-electric text-white text-sm';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="glass-panel w-full max-w-lg max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-blue-electric" />
            <span>{isArabic ? 'ارفع كتابك واعمل خطة مذاكرة' : 'Upload a book & build a study plan'}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label={isArabic ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PDF picker */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-4 rounded-2xl border-2 border-dashed transition-colors flex items-center gap-3 text-start ${
                file
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-brand-blue/60 bg-slate-950/60'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                {detecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {file ? file.name : isArabic ? 'اضغط لاختيار ملف الكتاب (PDF)' : 'Tap to choose the book (PDF)'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                    : isArabic ? 'الملف بيتقري على جهازك ومش بيتخزن' : 'The file is read on your device and not stored'}
                </div>
              </div>
            </button>
            {detectedNote && !detecting && (
              <p className="mt-2 text-[11px] text-emerald-300 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{detectedNote}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'اسم الكتاب' : 'Book title'}</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'المادة' : 'Subject'}</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={isArabic ? 'مثال: فيزياء' : 'e.g. Physics'}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'عدد الصفحات' : 'Number of pages'}</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={5000}
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                className={inputClass}
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-brand-purple-light" />
                <span>{isArabic ? 'يوم الامتحان' : 'Exam date'}</span>
              </label>
              <input
                type="date"
                min={tomorrow}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className={inputClass}
                dir="ltr"
              />
            </div>
          </div>

          {/* Revision rounds stepper */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white">{isArabic ? 'كام مرة عايز تراجع قبل الامتحان؟' : 'Revision rounds before the exam'}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isArabic ? 'كل جولة مراجعة بتغطي الكتاب كله' : 'Each round covers the whole book'}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setRounds(r => Math.max(0, r - 1))}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                aria-label="-"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-lg font-black text-white">{rounds}</span>
              <button
                type="button"
                onClick={() => setRounds(r => Math.min(6, r + 1))}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                aria-label="+"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live preview */}
          {preview && (
            <div className="p-3.5 rounded-2xl bg-brand-blue/10 border border-brand-blue/30 text-xs text-slate-200 space-y-1.5">
              <div className="font-bold text-brand-blue-electric">{isArabic ? 'شكل الخطة المتوقع' : 'Plan preview'}</div>
              <div>
                {isArabic
                  ? `المذاكرة الأولى: ${preview.studyDays} يوم، حوالي ${preview.studyPagesPerDay} صفحة في اليوم (≈ ${preview.studyMinutes} دقيقة).`
                  : `First pass: ${preview.studyDays} days, ~${preview.studyPagesPerDay} pages/day (≈ ${preview.studyMinutes} min).`}
              </div>
              {preview.usedRounds > 0 && (
                <div>
                  {isArabic
                    ? `المراجعة: ${preview.usedRounds} جولة على ${preview.revisionDays} يوم، حوالي ${preview.revisionPagesPerDay} صفحة في اليوم.`
                    : `Revision: ${preview.usedRounds} round(s) over ${preview.revisionDays} days, ~${preview.revisionPagesPerDay} pages/day.`}
                </div>
              )}
              {preview.usedRounds < rounds && (
                <div className="text-amber-300">
                  {isArabic
                    ? `الوقت قليل: هنعمل ${preview.usedRounds} جولة مراجعة بس.`
                    : `Not enough time: only ${preview.usedRounds} revision round(s) fit.`}
                </div>
              )}
              <div className="text-[10px] text-slate-400">
                {isArabic
                  ? 'الأوقات تقديرية، والخطة بتتقسم على عدد الصفحات والأيام المتاحة.'
                  : 'Times are estimates; the plan is split by page count and available days.'}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={detecting}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isArabic ? 'اعمل خطة المذاكرة' : 'Build my study plan'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
