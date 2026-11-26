import React, { useMemo, useState } from 'react';
import { BookPdf, GeneratedPlan, Student, StudySession } from '../../types';
import { Logo } from '../brand/Logo';
import { BookPlanBuilder } from './BookPlanBuilder';
import { StudentSettings } from './StudentSettings';
import { formatDateAr, planProgressPercent } from '../../lib/planEngine';
import {
  Flame,
  Calendar,
  Clock,
  CheckCircle,
  BookOpen,
  Award,
  Sparkles,
  KeyRound,
  TrendingUp,
  FileText,
  LogOut,
  Shield,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  Library,
  GraduationCap,
  ShieldCheck,
  Target,
  Home,
  Settings,
  PlusCircle,
  RefreshCw,
  Globe,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';

interface StudentDashboardViewProps {
  student: Student;
  isArabic: boolean;
  isAdmin?: boolean;
  onGoToActivation: () => void;
  onSwitchToAdmin: () => void;
  onLogout: () => void;
  onToggleLanguage?: () => void;
  onUpdateStudent?: (updated: Student) => void;
  /** baseStudent: أحدث نسخة من الملف (لو فيه تعديل لسه مش ظاهر في الـ state) */
  onSavePlan?: (plan: GeneratedPlan, baseStudent?: Student) => void;
  /** رفع ملف الكتاب على Firebase Storage */
  onUploadBookFile?: (file: File, bookId: string) => Promise<{ url: string; storagePath: string } | null>;
  /** حذف ملف كتاب من التخزين */
  onDeleteBookFile?: (storagePath?: string) => Promise<void>;
  /** فتح الملف (Storage مباشرة أو تجميع شرائح Firestore) */
  onOpenBookFile?: (storagePath?: string) => Promise<string | null>;
  /** الوسيلة المستخدمة لتخزين الكتب */
  bookStorageBackend?: 'storage' | 'firestore';
}

type SubTab = 'home' | 'plan' | 'books' | 'exam' | 'settings' | 'devices';

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
};

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  student,
  isArabic,
  isAdmin = false,
  onGoToActivation,
  onSwitchToAdmin,
  onLogout,
  onToggleLanguage,
  onUpdateStudent,
  onSavePlan,
  onUploadBookFile,
  onDeleteBookFile,
  onOpenBookFile,
  bookStorageBackend = 'firestore'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('home');
  const [showBuilder, setShowBuilder] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<BookPdf | null>(null);
  const [bookToDelete, setBookToDelete] = useState<BookPdf | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const plan = student.generatedPlan || null;
  const today = todayIso();
  const todaySessions = useMemo(
    () => (plan ? plan.sessions.filter(s => s.date === today) : []),
    [plan, today]
  );
  const nextSessions = useMemo(() => {
    if (!plan) return [];
    const upcoming = plan.sessions.filter(s => s.date > today).slice(0, 5);
    if (upcoming.length >= 5) return upcoming;
    const past = plan.sessions.filter(s => s.date <= today && !s.isCompleted).slice(0, 5 - upcoming.length);
    return [...past, ...upcoming];
  }, [plan, today]);

  const examDaysLeft = plan?.examDate
    ? Math.max(0, Math.round((new Date(`${plan.examDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000))
    : student.revisionPlanner?.daysRemaining || 0;

  const completedSessions = plan ? plan.sessions.filter(s => s.isCompleted).length : 0;
  const overallPlanProgress = planProgressPercent(plan);

  const activeStudent = student;

  const flash = (msg: string) => {
    setSaveNote(msg);
    setTimeout(() => setSaveNote(null), 3000);
  };

  /* ---------- actions ---------- */

  const handleToggleSession = (session: StudySession) => {
    if (!plan || !onUpdateStudent) return;
    const updatedPlan: GeneratedPlan = {
      ...plan,
      sessions: plan.sessions.map(s => (s.id === session.id ? { ...s, isCompleted: !s.isCompleted } : s))
    };
    onUpdateStudent({ ...activeStudent, generatedPlan: updatedPlan });
  };

  const handleCreatePlan = (book: BookPdf, generated: GeneratedPlan) => {
    if (!onUpdateStudent || !onSavePlan) return;
    // 1) register the uploaded book on the student record
    const withBook: Student = {
      ...activeStudent,
      uploadedPdfs: [book, ...(activeStudent.uploadedPdfs || [])],
      subjects: activeStudent.subjects?.length
        ? activeStudent.subjects
        : [
            {
              id: `sub-${book.subject}`,
              name: book.subject,
              nameAr: book.subject,
              code: book.subject.slice(0, 3).toUpperCase(),
              icon: 'BookOpen',
              color: '#00D2FF',
              totalLessons: generated.chapters.length,
              completedLessons: 0,
              progressPercent: 0,
              chapters: []
            }
          ]
    };
    onUpdateStudent(withBook);
    // 2) build the schedule from the book (بنمرّر الملف المحدّث عشان الكتاب يتحفظ معاه)
    onSavePlan(generated, withBook);
    setShowBuilder(false);
    setActiveSubTab('plan');
    flash(isArabic ? 'تم بناء خطة المذاكرة من كتابك!' : 'Your study plan was built from your book!');
  };

  const handleToggleLegacyTask = (taskId: string) => {
    if (!onUpdateStudent) return;
    onUpdateStudent({
      ...activeStudent,
      dailyTasks: (activeStudent.dailyTasks || []).map(t =>
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      )
    });
  };

  const handleDeleteBook = (book: BookPdf) => {
    if (!onUpdateStudent) return;

    // امسح ملف الـ PDF من Firebase Storage كمان
    if (book.storagePath && onDeleteBookFile) {
      onDeleteBookFile(book.storagePath);
    }

    // لو الخطة الحالية مبنية على الكتاب ده، بنمسح الخطة مع الكتاب
    const planUsesBook = plan?.bookId === book.id;
    onUpdateStudent({
      ...activeStudent,
      uploadedPdfs: (activeStudent.uploadedPdfs || []).filter(p => p.id !== book.id),
      generatedPlan: planUsesBook ? null : activeStudent.generatedPlan
    });
    setBookToDelete(null);
    setSelectedPdf(null);
    flash(
      planUsesBook
        ? (isArabic ? 'تم حذف الكتاب والخطة المرتبطة به.' : 'Book and its linked plan were deleted.')
        : (isArabic ? 'تم حذف الكتاب.' : 'Book deleted.')
    );
  };

  const [openingBookId, setOpeningBookId] = useState<string | null>(null);

  const handleOpenBook = async (pdf: BookPdf) => {
    if (!onOpenBookFile || !pdf.storagePath) return;
    setOpeningBookId(pdf.id);
    try {
      const url = await onOpenBookFile(pdf.storagePath);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        flash(isArabic ? 'تعذّر فتح الملف. جرّب ترفعه تاني.' : 'Could not open the file. Try re-uploading.');
      }
    } finally {
      setOpeningBookId(null);
    }
  };

  const handleDeletePlan = () => {
    if (!onUpdateStudent) return;
    onUpdateStudent({ ...activeStudent, generatedPlan: null });
    flash(isArabic ? 'تم حذف الخطة الحالية، يمكنك بناء خطة جديدة.' : 'Plan removed. You can build a new one.');
  };

  /* ---------- small UI helpers ---------- */

  const kindStyles = (kind: StudySession['kind']) => {
    if (kind === 'revision') return { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-500/30', labelAr: 'مراجعة', labelEn: 'Revision' };
    if (kind === 'mock') return { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-500/30', labelAr: 'امتحان تجريبي', labelEn: 'Mock exam' };
    return { bg: 'bg-brand-blue/15', text: 'text-brand-blue-electric', border: 'border-brand-blue/30', labelAr: 'مذاكرة', labelEn: 'Study' };
  };

  const navItems: { key: SubTab; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { key: 'home', labelAr: 'الرئيسية', labelEn: 'Home', icon: <Home className="w-5 h-5" /> },
    { key: 'plan', labelAr: 'خطتي', labelEn: 'My plan', icon: <Calendar className="w-5 h-5" /> },
    { key: 'books', labelAr: 'كتبي', labelEn: 'Books', icon: <Library className="w-5 h-5" /> },
    { key: 'exam', labelAr: 'الامتحان', labelEn: 'Exam', icon: <Target className="w-5 h-5" /> },
    { key: 'settings', labelAr: 'إعداداتي', labelEn: 'Settings', icon: <Settings className="w-5 h-5" /> }
  ];

  const desktopTabs: { key: SubTab; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    ...navItems,
    { key: 'devices', labelAr: 'الأجهزة والاشتراك', labelEn: 'Devices & Plan', icon: <ShieldCheck className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-blue selection:text-white">

      {/* ============ Header ============ */}
      <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2">

          <button onClick={() => setActiveSubTab('home')} className="flex items-center gap-2 min-w-0">
            <Logo variant="student-dash" size="sm" isArabic={isArabic} />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">

            {/* Subscription badge (desktop) */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-purple/20 to-brand-blue/20 border border-brand-purple/40 text-xs font-bold text-white">
              <Award className="w-4 h-4 text-brand-purple-light" />
              <span>{student.subscriptionPlan}</span>
            </div>

            {onToggleLanguage && (
              <button
                onClick={onToggleLanguage}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                title={isArabic ? 'Switch to English' : 'التحويل للعربية'}
              >
                <Globe className="w-4 h-4" />
              </button>
            )}

            {/* Account menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 p-1 pl-2 rtl:pl-1 rtl:pr-2 rounded-xl bg-slate-800 hover:bg-slate-700"
              >
                <span className="hidden sm:inline text-xs font-bold text-slate-200 max-w-[110px] truncate">
                  {isArabic ? student.fullNameAr || student.fullName : student.fullName}
                </span>
                <img
                  src={student.avatarUrl}
                  alt={student.fullName}
                  className="w-8 h-8 rounded-lg object-cover border border-brand-blue/40"
                />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute z-50 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 end-0">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <div className="text-xs font-bold text-white truncate">
                        {isArabic ? student.fullNameAr || student.fullName : student.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{student.studentId}</div>
                    </div>

                    <button
                      onClick={() => { setMenuOpen(false); setActiveSubTab('settings'); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      <Settings className="w-4 h-4 text-brand-blue-electric" />
                      {isArabic ? 'إعدادات الحساب' : 'Account settings'}
                    </button>

                    <button
                      onClick={() => { setMenuOpen(false); onGoToActivation(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      <KeyRound className="w-4 h-4 text-brand-blue-electric" />
                      {isArabic ? 'تفعيل كود' : 'Redeem code'}
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => { setMenuOpen(false); onSwitchToAdmin(); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-purple-200 hover:bg-purple-950/50"
                      >
                        <Shield className="w-4 h-4 text-purple-400" />
                        {isArabic ? 'لوحة الإدارة' : 'Admin dashboard'}
                      </button>
                    )}

                    <button
                      onClick={() => { setMenuOpen(false); onLogout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-300 hover:bg-red-950/50"
                    >
                      <LogOut className="w-4 h-4" />
                      {isArabic ? 'تسجيل الخروج' : 'Log out'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop sub-navigation */}
        <div className="hidden md:block border-t border-slate-800/70">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-1.5">
            {desktopTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeSubTab === tab.key
                    ? 'bg-brand-blue text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{isArabic ? tab.labelAr : tab.labelEn}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ============ Body ============ */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 space-y-4 sm:space-y-6 pb-28 md:pb-8">

        {saveNote && (
          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {saveNote}
          </div>
        )}

        {/* ---------- HOME ---------- */}
        {activeSubTab === 'home' && (
          <div className="space-y-4 sm:space-y-6">

            {/* Welcome hero */}
            <div className="glass-panel rounded-3xl p-5 sm:p-7 border border-slate-800 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-brand-navy-900/40">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-purple/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30">
                    <Sparkles className="w-3 h-3" />
                    {isArabic ? student.academicYearAr || student.academicYear : student.academicYear}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    {isArabic ? `باقة ${student.subscriptionPlan}` : `${student.subscriptionPlan} plan`}
                  </span>
                </div>

                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                    {isArabic
                      ? `أهلاً ${student.fullNameAr || student.fullName} 👋`
                      : `Welcome back, ${student.fullName} 👋`}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                    {plan
                      ? (isArabic
                          ? `خطتك جاهزة: باقي ${examDaysLeft} يوم على الامتحان، ومحتاج تخلص ${todaySessions.filter(s => !s.isCompleted).length} جلسة النهاردة.`
                          : `Your plan is ready: ${examDaysLeft} days to the exam, ${todaySessions.filter(s => !s.isCompleted).length} session(s) left today.`)
                      : (isArabic
                          ? 'ابدأ برفع كتابك وتحديد يوم الامتحان، والبرنامج هيبني لك خطة مذاكرة ومراجعة منظمة.'
                          : 'Start by uploading your book and setting the exam date — we build the schedule for you.')}
                  </p>
                </div>

                {/* Primary CTA */}
                <button
                  onClick={() => setShowBuilder(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-brand-blue to-brand-purple text-white text-sm font-bold shadow-glow-combo active:scale-[0.99]"
                >
                  <PlusCircle className="w-5 h-5" />
                  {plan
                    ? (isArabic ? 'بناء خطة جديدة من كتاب آخر' : 'Build a new plan from another book')
                    : (isArabic ? 'ارفع كتابك وابنِ خطتك' : 'Upload your book & build your plan')}
                </button>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-400 text-[10px] font-bold mb-0.5">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" />
                      {isArabic ? 'التزام' : 'Streak'}
                    </div>
                    <div className="text-lg font-black text-white">
                      {student.performanceReport?.studyStreakDays || 0}
                      <span className="text-[10px] font-normal text-slate-400 mr-1 rtl:mr-0 rtl:ml-1">{isArabic ? 'يوم' : 'd'}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                    <div className="flex items-center justify-center gap-1 text-brand-blue-electric text-[10px] font-bold mb-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {isArabic ? 'الخطة' : 'Plan'}
                    </div>
                    <div className="text-lg font-black text-brand-blue-electric">{overallPlanProgress}%</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-400 text-[10px] font-bold mb-0.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {isArabic ? 'خلصت' : 'Done'}
                    </div>
                    <div className="text-lg font-black text-white">{completedSessions}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                    <div className="flex items-center justify-center gap-1 text-purple-400 text-[10px] font-bold mb-0.5">
                      <Target className="w-3.5 h-3.5" />
                      {isArabic ? 'للامتحان' : 'Exam in'}
                    </div>
                    <div className="text-lg font-black text-purple-300">
                      {examDaysLeft}
                      <span className="text-[10px] font-normal text-slate-400 mr-1 rtl:mr-0 rtl:ml-1">{isArabic ? 'يوم' : 'd'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!plan ? (
              /* Empty state: no ready-made tasks, the student creates their own plan */
              <div className="glass-panel rounded-3xl border border-slate-800 p-6 sm:p-10 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-brand-blue-electric" />
                </div>
                <h2 className="text-lg font-bold text-white">
                  {isArabic ? 'مفيش مهام جاهزة — إنت اللي بتحدد خطتك' : 'No preset tasks — you own your plan'}
                </h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {isArabic
                    ? 'ارفع كتابك، حدد يوم الامتحان، وقولنا عايز تراجع كام مرة. البرنامج هيقسم الكتاب على الأيام ويبني لك جدول مذاكرة ومراجعة دقيق.'
                    : 'Upload your book, set the exam date and pick how many revision rounds you want. We split the book across your days and build the schedule.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-lg mx-auto pt-2 text-start">
                  {[
                    { ar: '١. ارفع الكتاب', en: '1. Upload the book', icon: <Library className="w-4 h-4" /> },
                    { ar: '٢. حدد يوم الامتحان', en: '2. Set the exam date', icon: <Calendar className="w-4 h-4" /> },
                    { ar: '٣. اختار مراجعاتك', en: '3. Choose revisions', icon: <RefreshCw className="w-4 h-4" /> }
                  ].map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-2">
                      <span className="text-brand-blue-electric">{s.icon}</span>
                      {isArabic ? s.ar : s.en}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowBuilder(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-bold"
                >
                  <Sparkles className="w-4 h-4" />
                  {isArabic ? 'ابدأ وابنِ خطتي' : 'Start & build my plan'}
                </button>

                {/* Existing tasks (if any) stay available until a new plan is built */}
                {activeStudent.dailyTasks?.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 text-start space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-brand-blue-electric" />
                      {isArabic ? 'مهامك الحالية' : 'Your current tasks'}
                    </h3>
                    {activeStudent.dailyTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleLegacyTask(task.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 ${
                          task.isCompleted ? 'bg-slate-900/40 border-emerald-500/25' : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                          task.isCompleted ? 'bg-emerald-500' : 'border-2 border-slate-600'
                        }`}>
                          {task.isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[11px] font-semibold truncate ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                            {isArabic ? task.titleAr || task.title : task.title}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {task.subject} • {task.scheduledTime} • {task.durationMinutes}m
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

                {/* Today's sessions */}
                <div className="lg:col-span-2 glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-brand-blue-electric" />
                      {isArabic ? 'مهام النهاردة' : "Today's sessions"}
                    </h2>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {todaySessions.filter(s => s.isCompleted).length}/{todaySessions.length}
                    </span>
                  </div>

                  {todaySessions.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 text-center text-xs text-slate-400">
                      {isArabic ? 'مفيش جلسات النهاردة (يوم راحة أو الخطة لسه ما بدأتش).' : 'No sessions today (rest day or plan not started).'}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {todaySessions.map(session => {
                        const st = kindStyles(session.kind);
                        return (
                          <div
                            key={session.id}
                            onClick={() => handleToggleSession(session)}
                            className={`p-3.5 rounded-2xl border cursor-pointer active:scale-[0.99] transition-all flex items-start gap-3 ${
                              session.isCompleted
                                ? 'bg-slate-900/40 border-emerald-500/30'
                                : 'bg-slate-900/90 border-slate-700'
                            }`}
                          >
                            <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                              session.isCompleted ? 'bg-emerald-500 text-white' : 'border-2 border-slate-600'
                            }`}>
                              {session.isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className={`text-xs sm:text-sm font-bold ${session.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                                {isArabic ? session.titleAr : session.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                                <span className={`px-1.5 py-0.5 rounded ${st.bg} ${st.text} border ${st.border} font-bold`}>
                                  {isArabic ? st.labelAr : st.labelEn}
                                </span>
                                <span>{session.durationMinutes} {isArabic ? 'دقيقة' : 'min'}</span>
                                <span>•</span>
                                <span className="font-mono">{session.date}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={() => setActiveSubTab('plan')}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-brand-blue-light text-xs font-bold border border-slate-700"
                  >
                    {isArabic ? 'عرض الخطة كاملة' : 'View the full plan'}
                  </button>
                </div>

                {/* Side: exam countdown + next up */}
                <div className="space-y-4">
                  <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3 bg-gradient-to-br from-brand-purple/10 to-transparent">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-purple-light" />
                      {isArabic ? 'الامتحان' : 'Exam'}
                    </h3>
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-[11px] text-slate-400">{isArabic ? 'تاريخ الامتحان' : 'Exam date'}</div>
                      <div className="text-sm font-black text-white">{formatDateAr(plan.examDate)}</div>
                      <div className="text-brand-purple-light font-bold text-xs">
                        {isArabic ? `باقي ${examDaysLeft} يوم` : `${examDaysLeft} days left`}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isArabic
                        ? `${plan.revisionRounds} جولة مراجعة • ${plan.sessions.length} جلسة إجمالاً`
                        : `${plan.revisionRounds} revision round(s) • ${plan.sessions.length} sessions`}
                    </div>
                  </div>

                  <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-2.5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-blue-electric" />
                      {isArabic ? 'الجاي في خطتك' : 'Up next'}
                    </h3>
                    {nextSessions.length === 0 && (
                      <p className="text-[11px] text-slate-400">{isArabic ? 'مفيش جلسات قادمة.' : 'No upcoming sessions.'}</p>
                    )}
                    {nextSessions.map(s => (
                      <div key={`next-${s.id}`} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] flex items-center justify-between gap-2">
                        <span className="text-slate-300 truncate">{isArabic ? s.titleAr : s.title}</span>
                        <span className="text-slate-500 font-mono shrink-0">{s.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------- PLAN ---------- */}
        {activeSubTab === 'plan' && (
          <div className="space-y-4">
            {!plan ? (
              <div className="glass-panel rounded-3xl border border-slate-800 p-8 text-center space-y-3">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-300 font-bold">{isArabic ? 'لسه ما بنيتش خطة' : 'No plan yet'}</p>
                <button
                  onClick={() => setShowBuilder(true)}
                  className="px-5 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold"
                >
                  {isArabic ? 'ابنِ خطتي الآن' : 'Build my plan now'}
                </button>
              </div>
            ) : (
              <>
                {/* Plan header */}
                <div className="glass-panel rounded-3xl border border-slate-800 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-bold text-white truncate">{plan.bookTitle}</h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {plan.subject} • {plan.totalPages} {isArabic ? 'صفحة' : 'pages'} • {plan.chapters.length} {isArabic ? 'فصل' : 'chapters'}
                      </p>
                    </div>
                    <button
                      onClick={handleDeletePlan}
                      className="p-2 rounded-xl bg-red-950/60 text-red-300 border border-red-500/30 shrink-0"
                      title={isArabic ? 'حذف الخطة' : 'Delete plan'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">{isArabic ? 'تقدم الخطة' : 'Plan progress'}</span>
                      <span className="font-bold text-brand-blue-electric">{overallPlanProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-brand-blue to-emerald-400 h-full transition-all duration-500"
                        style={{ width: `${overallPlanProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">{isArabic ? 'البداية' : 'Start'}</div>
                      <div className="text-[11px] font-bold text-white font-mono">{plan.startDate.slice(5)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">{isArabic ? 'نهاية القراءة' : 'First pass'}</div>
                      <div className="text-[11px] font-bold text-white font-mono">{plan.firstPassEndDate.slice(5)}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">{isArabic ? 'الامتحان' : 'Exam'}</div>
                      <div className="text-[11px] font-bold text-purple-300 font-mono">{plan.examDate.slice(5)}</div>
                    </div>
                  </div>
                </div>

                {/* Revision rounds */}
                {plan.rounds.length > 0 && (
                  <div className="glass-panel rounded-3xl border border-slate-800 p-5 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-brand-purple-light" />
                      {isArabic ? 'جولات المراجعة' : 'Revision rounds'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {plan.rounds.map(r => (
                        <div key={r.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple-light border border-brand-purple/30">
                              {isArabic ? `جولة ${r.roundNumber}` : `Round ${r.roundNumber}`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{r.status}</span>
                          </div>
                          <h4 className="text-[11px] font-bold text-white leading-snug">{isArabic ? r.titleAr : r.title}</h4>
                          <div className="text-[10px] text-slate-400 font-mono">{r.startDate} → {r.targetDate}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full schedule grouped by date */}
                <div className="glass-panel rounded-3xl border border-slate-800 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white">{isArabic ? 'جدول المذاكرة كامل' : 'Full schedule'}</h3>
                  <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
                    {plan.sessions.map(session => {
                      const st = kindStyles(session.kind);
                      return (
                        <div
                          key={session.id}
                          onClick={() => handleToggleSession(session)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 ${
                            session.isCompleted ? 'bg-slate-900/40 border-emerald-500/25' : 'bg-slate-900 border-slate-800'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                            session.isCompleted ? 'bg-emerald-500' : 'border-2 border-slate-600'
                          }`}>
                            {session.isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[11px] font-semibold truncate ${session.isCompleted ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                              {isArabic ? session.titleAr : session.title}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              <span className={`px-1 rounded ${st.bg} ${st.text}`}>{isArabic ? st.labelAr : st.labelEn}</span>
                              <span className="font-mono">{session.date}</span>
                              <span>• {session.durationMinutes}m</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------- BOOKS ---------- */}
        {activeSubTab === 'books' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Library className="w-5 h-5 text-brand-blue-electric" />
                {isArabic ? 'كتبي' : 'My books'}
                <span className="text-[11px] text-slate-400 font-mono">({student.uploadedPdfs?.length || 0})</span>
              </h2>
              <button
                onClick={() => setShowBuilder(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-blue text-white text-[11px] font-bold"
              >
                <PlusCircle className="w-4 h-4" />
                {isArabic ? 'ارفع كتاب' : 'Upload'}
              </button>
            </div>

            {(!student.uploadedPdfs || student.uploadedPdfs.length === 0) ? (
              <div className="glass-panel rounded-3xl border border-slate-800 p-8 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">{isArabic ? 'لسه ما رفعتش أي كتاب.' : 'No books uploaded yet.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {student.uploadedPdfs.map(pdf => (
                  <div key={pdf.id} className="glass-panel rounded-2xl border border-slate-800 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-brand-blue-electric uppercase">{pdf.subject}</span>
                        <h3 className="text-xs font-bold text-white line-clamp-2">{pdf.title}</h3>
                      </div>
                      <button
                        onClick={() => setBookToDelete(pdf)}
                        className="p-1.5 rounded-lg bg-red-950/60 text-red-300 border border-red-500/30 shrink-0 active:scale-95"
                        title={isArabic ? 'حذف الكتاب' : 'Delete book'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{pdf.pageCount} {isArabic ? 'صفحة' : 'pages'}</span>
                      <span>{pdf.fileSizeMb} MB</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setSelectedPdf(pdf)}
                        className="py-2 rounded-xl bg-slate-900 text-brand-blue-light text-[11px] font-bold border border-slate-700"
                      >
                        {isArabic ? 'تفاصيل' : 'Details'}
                      </button>
                      {pdf.storagePath ? (
                        <button
                          onClick={() => handleOpenBook(pdf)}
                          disabled={openingBookId === pdf.id}
                          className="py-2 rounded-xl bg-emerald-950/50 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 text-center disabled:opacity-60"
                        >
                          {openingBookId === pdf.id
                            ? (isArabic ? 'جاري الفتح...' : 'Opening...')
                            : (isArabic ? 'فتح الملف' : 'Open file')}
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowBuilder(true)}
                          className="py-2 rounded-xl bg-brand-purple/20 text-brand-purple-light text-[11px] font-bold border border-brand-purple/30"
                        >
                          {isArabic ? 'خطة' : 'Plan'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- EXAM ---------- */}
        {activeSubTab === 'exam' && (
          <div className="space-y-4">
            <div className="glass-panel rounded-3xl border border-slate-800 p-5 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-purple-light" />
                {isArabic ? 'خطة الامتحان' : 'Exam plan'}
              </h2>

              {!plan ? (
                <div className="text-center py-6 space-y-3">
                  <p className="text-xs text-slate-400">{isArabic ? 'حدد امتحانك وابنِ خطتك عشان نحسب لك العد التنازلي والمراجعات.' : 'Set your exam and build a plan to see the countdown and revisions.'}</p>
                  <button
                    onClick={() => setShowBuilder(true)}
                    className="px-5 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold"
                  >
                    {isArabic ? 'حدد الامتحان' : 'Set the exam'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-purple/15 to-slate-900 border border-brand-purple/30 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-slate-400">{isArabic ? 'يوم الامتحان' : 'Exam date'}</div>
                      <div className="text-base font-black text-white">{formatDateAr(plan.examDate)}</div>
                    </div>
                    <div className="text-center shrink-0">
                      <div className="text-2xl font-black text-purple-300">{examDaysLeft}</div>
                      <div className="text-[10px] text-slate-400">{isArabic ? 'يوم متبقي' : 'days left'}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-300">{isArabic ? 'خطة المراجعة' : 'Revision plan'}</h3>
                    {plan.rounds.length === 0 && (
                      <p className="text-[11px] text-slate-400">{isArabic ? 'بدون جولات مراجعة (اخترت بدون).' : 'No revision rounds selected.'}</p>
                    )}
                    {plan.rounds.map(r => (
                      <div key={`exam-${r.id}`} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-white truncate">{isArabic ? r.titleAr : r.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.startDate} → {r.targetDate}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 shrink-0">{r.status}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowBuilder(true)}
                      className="py-2.5 rounded-xl bg-slate-800 text-slate-200 text-[11px] font-bold"
                    >
                      {isArabic ? 'تعديل الخطة' : 'Adjust plan'}
                    </button>
                    <button
                      onClick={() => setActiveSubTab('plan')}
                      className="py-2.5 rounded-xl bg-brand-blue text-white text-[11px] font-bold"
                    >
                      {isArabic ? 'جدول المذاكرة' : 'Study schedule'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ---------- SETTINGS ---------- */}
        {activeSubTab === 'settings' && onUpdateStudent && (
          <StudentSettings
            student={student}
            isArabic={isArabic}
            onSave={(updated) => {
              onUpdateStudent(updated);
              flash(isArabic ? 'تم تحديث بياناتك.' : 'Profile updated.');
            }}
            onBack={() => setActiveSubTab('home')}
          />
        )}

        {/* ---------- DEVICES & SUBSCRIPTION ---------- */}
        {activeSubTab === 'devices' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-blue-electric" />
                {isArabic ? 'باقة الاشتراك' : 'Subscription'}
              </h2>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-brand-blue/30 space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">{isArabic ? 'الباقة' : 'Plan'}</span>
                  <span className="font-black text-brand-blue-electric">{student.subscriptionPlan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isArabic ? 'التفعيل' : 'Activated'}</span>
                  <span className="text-white font-mono">{student.registrationDate?.split('T')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isArabic ? 'الانتهاء' : 'Expires'}</span>
                  <span className="text-emerald-400 font-mono font-bold">{student.subscriptionExpiryDate?.split('T')[0]}</span>
                </div>
              </div>
              <button
                onClick={onGoToActivation}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-brand-blue-electric border border-brand-blue/40 text-[11px] font-bold flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {isArabic ? 'تفعيل كود تجديد' : 'Redeem renewal code'}
              </button>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                {isArabic ? 'الأجهزة المسجلة' : 'Devices'}
              </h2>
              <div className="space-y-2">
                {student.registeredDevices?.map(dev => (
                  <div key={dev.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-brand-blue-light shrink-0">
                        {dev.deviceType === 'desktop' && <Laptop className="w-4 h-4" />}
                        {dev.deviceType === 'mobile' && <Smartphone className="w-4 h-4" />}
                        {dev.deviceType === 'tablet' && <Tablet className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{dev.deviceName}</div>
                        <div className="text-slate-400 text-[10px] truncate">{dev.os} • {dev.browser}</div>
                      </div>
                    </div>
                    {dev.isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 shrink-0">
                        {isArabic ? 'الحالي' : 'Current'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ============ Mobile bottom navigation ============ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1.5 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-5 gap-0.5">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveSubTab(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                activeSubTab === item.key ? 'bg-brand-blue/15 text-brand-blue-electric' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span>{isArabic ? item.labelAr : item.labelEn}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ============ Build plan modal ============ */}
      {showBuilder && (
        <BookPlanBuilder
          student={student}
          isArabic={isArabic}
          onCancel={() => setShowBuilder(false)}
          onSubmit={handleCreatePlan}
          onUpload={onUploadBookFile}
          storageBackend={bookStorageBackend}
        />
      )}

      {/* ============ Delete book confirmation ============ */}
      {bookToDelete && (
        <div className="fixed inset-0 z-[65] bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-red-500/40 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-red-950 text-red-400 border border-red-500/40 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-base">
                  {isArabic ? 'تأكيد حذف الكتاب' : 'Confirm book deletion'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words">
                  {isArabic
                    ? `سيتم حذف (${bookToDelete.title}) نهائياً من مكتبتك${plan?.bookId === bookToDelete.id ? '، ومعاه الخطة المبنية عليه' : ''}.`
                    : `(${bookToDelete.title}) will be permanently removed from your library${plan?.bookId === bookToDelete.id ? ' along with the plan built on it' : ''}.`}
                </p>
              </div>
              <button
                onClick={() => setBookToDelete(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button
                onClick={() => setBookToDelete(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeleteBook(bookToDelete)}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isArabic ? 'حذف نهائي' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Book details modal ============ */}
      {selectedPdf && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-white text-sm">{selectedPdf.title}</h3>
              <button onClick={() => setSelectedPdf(null)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{selectedPdf.analyzedSummary}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">{isArabic ? 'الصفحات' : 'Pages'}: </span>
                <span className="font-bold text-white">{selectedPdf.pageCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">{isArabic ? 'المفاهيم' : 'Concepts'}: </span>
                <span className="font-bold text-emerald-400">{selectedPdf.keyConceptsCount}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { setSelectedPdf(null); setShowBuilder(true); }}
                className="w-full py-3 rounded-xl bg-brand-blue text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isArabic ? 'ابنِ خطة لهذا الكتاب' : 'Build a plan for this book'}
              </button>
              <button
                onClick={() => setBookToDelete(selectedPdf)}
                className="w-full py-2.5 rounded-xl bg-red-950/60 text-red-300 border border-red-500/30 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isArabic ? 'حذف هذا الكتاب' : 'Delete this book'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-7xl mx-auto w-full text-center text-[11px] text-slate-500 py-4 border-t border-slate-800/60 mb-16 md:mb-0">
        © 2026 Smart Study Planner • {isArabic ? 'خطة مذاكرة مبنية على كتابك' : 'Plans built from your own book'}
      </footer>

    </div>
  );
};
