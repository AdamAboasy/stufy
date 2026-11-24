import React, { useMemo, useRef, useState } from 'react';
import { BookPdf, GeneratedPlan, Student } from '../../types';
import { checkFeasibility, formatDateAr, generateStudyPlan } from '../../lib/planEngine';
import {
  BookOpen,
  Upload,
  CalendarDays,
  Repeat,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  ListChecks,
  Coffee
} from 'lucide-react';

interface BookPlanBuilderProps {
  student: Student;
  isArabic: boolean;
  onCancel?: () => void;
  onSubmit: (book: BookPdf, plan: GeneratedPlan) => void;
}

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

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** أقصى حجم مسموح للكتاب */
export const MAX_FILE_SIZE_MB = 100;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
};

export const BookPlanBuilder: React.FC<BookPlanBuilderProps> = ({
  student,
  isArabic,
  onCancel,
  onSubmit
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 1: the book
  const [fileName, setFileName] = useState('');
  const [fileSizeMb, setFileSizeMb] = useState(0);
  const [bookTitle, setBookTitle] = useState('');
  const [subject, setSubject] = useState(student.subjects?.[0]?.name || 'Physics');
  const [pageCount, setPageCount] = useState(200);

  // Step 2: the exam
  const [examDate, setExamDate] = useState(student.studyPreferences?.examDate || '');
  const [dailyMinutes, setDailyMinutes] = useState(student.studyPreferences?.dailyMinutes || 90);
  const [daysOff, setDaysOff] = useState<number[]>(student.studyPreferences?.daysOff || []);

  // Step 3: revision rounds
  const [revisionRounds, setRevisionRounds] = useState(student.studyPreferences?.revisionRounds ?? 2);

  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const draftBook: BookPdf = useMemo(
    () => ({
      id: `pdf-${Date.now()}`,
      title: bookTitle.trim() || fileName.replace(/\.pdf$/i, '') || (isArabic ? 'كتاب بدون عنوان' : 'Untitled book'),
      subject,
      originalFilename: fileName || 'book.pdf',
      fileSizeMb,
      pageCount: Number(pageCount) || 1,
      uploadDate: new Date().toISOString(),
      isIndexed: true,
      analyzedSummary: isArabic
        ? `تم تحليل الكتاب وتقسيمه إلى فصول تقديرية لبناء خطة مذاكرة منظمة.`
        : 'Book analysed and split into estimated chapters for scheduling.',
      keyConceptsCount: Math.max(20, Math.round((Number(pageCount) || 1) * 0.6))
    }),
    [bookTitle, fileName, fileSizeMb, pageCount, subject, isArabic]
  );

  const feasibility = useMemo(
    () => (examDate ? checkFeasibility(draftBook, examDate, revisionRounds) : null),
    [draftBook, examDate, revisionRounds]
  );

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      setError(isArabic ? 'الملفات المدعومة هي PDF فقط.' : 'Only PDF files are supported.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(
        isArabic
          ? `حجم الملف كبير جداً (الحد ${MAX_FILE_SIZE_MB} ميجابايت).`
          : `File is too large (${MAX_FILE_SIZE_MB}MB limit).`
      );
      return;
    }
    setError(null);
    setFileName(file.name);
    setFileSizeMb(Number((file.size / (1024 * 1024)).toFixed(1)));
    if (!bookTitle) setBookTitle(file.name.replace(/\.pdf$/i, ''));
    // تقدير أولي لعدد الصفحات من حجم الملف (الطالب يقدر يعدله)
    const estimate = Math.min(900, Math.max(40, Math.round(file.size / 1024 / 38)));
    setPageCount(estimate);
  };

  const toggleDayOff = (day: number) => {
    setDaysOff(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));
  };

  const canBuild = !!examDate && new Date(`${examDate}T00:00:00`).getTime() > Date.now();

  const handleBuild = () => {
    if (!canBuild) {
      setError(isArabic ? 'اختار تاريخ امتحان في المستقبل أولاً.' : 'Pick a future exam date first.');
      return;
    }
    const plan = generateStudyPlan({
      book: draftBook,
      examDate,
      revisionRounds,
      dailyMinutes,
      daysOff
    });
    onSubmit(draftBook, plan);
  };

  const steps = [
    { n: 1, labelAr: 'الكتاب', labelEn: 'Book', icon: BookOpen },
    { n: 2, labelAr: 'الامتحان', labelEn: 'Exam', icon: CalendarDays },
    { n: 3, labelAr: 'المراجعة', labelEn: 'Revision', icon: Repeat }
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl max-h-[95vh] overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white text-sm sm:text-base truncate">
                  {isArabic ? 'ابنِ خطة مذاكرتك من كتابك' : 'Build your study plan from your book'}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {isArabic ? 'ارفع الكتاب + حدد الامتحان + عدد المراجعات' : 'Upload book + exam date + revision rounds'}
                </p>
              </div>
            </div>
            {onCancel && (
              <button onClick={onCancel} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Steps indicator */}
          <div className="px-4 sm:px-6 pt-4">
            <div className="grid grid-cols-3 gap-2">
              {steps.map(s => {
                const Icon = s.icon;
                const active = step === s.n;
                const done = step > s.n;
                return (
                  <button
                    key={s.n}
                    onClick={() => setStep(s.n as 1 | 2 | 3)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold border transition-colors ${
                      active
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : done
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{isArabic ? s.labelAr : s.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">

            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: BOOK */}
            {step === 1 && (
              <div className="space-y-4">
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
                  className={`w-full rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center gap-2 transition-colors ${
                    fileName
                      ? 'border-emerald-500/40 bg-emerald-950/20'
                      : 'border-brand-blue/40 bg-brand-blue/5 hover:bg-brand-blue/10'
                  }`}
                >
                  {fileName ? (
                    <>
                      <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                      <span className="text-sm font-bold text-white break-all text-center">{fileName}</span>
                      <span className="text-[11px] text-slate-400">
                        {fileSizeMb} MB • {isArabic ? 'اضغط لتغيير الكتاب' : 'Tap to change book'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-9 h-9 text-brand-blue-electric" />
                      <span className="text-sm font-bold text-white">
                        {isArabic ? 'اضغط لرفع كتاب PDF' : 'Tap to upload your PDF book'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {isArabic ? `الحد الأقصى ${MAX_FILE_SIZE_MB} ميجابايت` : `Up to ${MAX_FILE_SIZE_MB}MB`}
                      </span>
                    </>
                  )}
                </button>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {isArabic ? 'اسم الكتاب' : 'Book title'}
                  </label>
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    placeholder={isArabic ? 'مثال: كتاب الامتحان في الفيزياء' : 'e.g. Physics Exam Book'}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isArabic ? 'المادة' : 'Subject'}
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm"
                    >
                      {SUBJECTS.map(sub => (
                        <option key={sub.name} value={sub.name}>
                          {isArabic ? sub.nameAr : sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {isArabic ? 'عدد صفحات الكتاب' : 'Number of pages'}
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={pageCount}
                      onChange={(e) => setPageCount(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isArabic ? 'عدّل الرقم لو التقدير التلقائي مش دقيق.' : 'Adjust if the auto estimate is off.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-bold flex items-center justify-center gap-2"
                >
                  <span>{isArabic ? 'التالي: موعد الامتحان' : 'Next: exam date'}</span>
                  {isArabic ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* STEP 2: EXAM DATE + AVAILABILITY */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-brand-purple-light" />
                    {isArabic ? 'يوم الامتحان' : 'Exam date'}
                  </label>
                  <input
                    type="date"
                    min={todayIso()}
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-purple-light text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-brand-blue-electric" />
                    {isArabic ? `وقت المذاكرة اليومي: ${dailyMinutes} دقيقة` : `Daily study time: ${dailyMinutes} min`}
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={300}
                    step={15}
                    value={dailyMinutes}
                    onChange={(e) => setDailyMinutes(Number(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>30</span><span>90</span><span>180</span><span>300</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-amber-400" />
                    {isArabic ? 'أيام الراحة (اختياري)' : 'Rest days (optional)'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(isArabic ? DAY_NAMES_AR : DAY_NAMES_EN).map((d, idx) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDayOff(idx)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
                          daysOff.includes(idx)
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="py-3.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-bold"
                  >
                    {isArabic ? 'السابق' : 'Back'}
                  </button>
                  <button
                    onClick={() => {
                      if (!examDate) {
                        setError(isArabic ? 'اختار يوم الامتحان.' : 'Please pick the exam date.');
                        return;
                      }
                      setError(null);
                      setStep(3);
                    }}
                    className="py-3.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-bold"
                  >
                    {isArabic ? 'التالي: المراجعة' : 'Next: revision'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVISION ROUNDS + SUMMARY */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-brand-purple-light" />
                    {isArabic ? 'كام مرة عايز تراجع الكتاب قبل الامتحان؟' : 'How many revision rounds before the exam?'}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRevisionRounds(n)}
                        className={`py-3 rounded-xl text-sm font-black border transition-colors ${
                          revisionRounds === n
                            ? 'bg-brand-purple text-white border-brand-purple shadow-glow-purple/40'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        {n === 0 ? (isArabic ? 'بدون' : '0') : n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {isArabic
                      ? 'البرنامج هيحسب لك إيقاع المذاكرة على أساس الوقت المتاح قبل الامتحان.'
                      : 'The planner distributes the book across the days you have left.'}
                  </p>
                </div>

                {feasibility && (
                  <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                    feasibility.isTight
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
                      : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {feasibility.isTight ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{isArabic ? 'تقييم الخطة' : 'Plan feasibility'}</span>
                    </div>
                    <p>{isArabic ? feasibility.messageAr : feasibility.messageEn}</p>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="p-2 rounded-xl bg-slate-950/60 text-center">
                        <div className="text-[10px] text-slate-400">{isArabic ? 'أيام متاحة' : 'Days'}</div>
                        <div className="font-black text-white">{feasibility.availableDays}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 text-center">
                        <div className="text-[10px] text-slate-400">{isArabic ? 'صفحات/يوم' : 'Pages/day'}</div>
                        <div className="font-black text-white">{feasibility.pagesPerDay}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 text-center">
                        <div className="text-[10px] text-slate-400">{isArabic ? 'الامتحان' : 'Exam'}</div>
                        <div className="font-black text-white text-[11px]">{formatDateAr(examDate)}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <ListChecks className="w-4 h-4 text-brand-blue-electric" />
                    {isArabic ? 'ملخص الخطة' : 'Plan summary'}
                  </div>
                  <div className="text-[11px] text-slate-300 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-red-400" />{draftBook.title}</span>
                    <span className="font-mono">{draftBook.pageCount} {isArabic ? 'صفحة' : 'pages'}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 flex items-center justify-between gap-2">
                    <span>{isArabic ? 'جولات المراجعة' : 'Revision rounds'}</span>
                    <span className="font-mono">{revisionRounds}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 flex items-center justify-between gap-2">
                    <span>{isArabic ? 'المذاكرة اليومية' : 'Daily study'}</span>
                    <span className="font-mono">{dailyMinutes} {isArabic ? 'دقيقة' : 'min'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setStep(2)}
                    className="py-3.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-bold"
                  >
                    {isArabic ? 'السابق' : 'Back'}
                  </button>
                  <button
                    onClick={handleBuild}
                    disabled={!canBuild}
                    className="py-3.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isArabic ? 'ابنِ خطتي' : 'Build my plan'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
