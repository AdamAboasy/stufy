import React, { useState } from 'react';
import { BookPdf, BookStudyPlan, Student, StudyPlanTask } from '../../types';
import { Logo } from '../brand/Logo';
import { WhatsAppButton } from '../whatsapp/WhatsAppButton';
import { Avatar } from '../common/Avatar';
import { BookPlanModal } from './BookPlanModal';
import { stageLabel } from '../../utils/studentFactory';
import {
  PlannedTask,
  computeStreak,
  daysBetween,
  flattenTasks,
  nearestExam,
  overdueTasks,
  parseLocalDate,
  planProgress,
  tasksOnDate,
  todayISO,
  upcomingTasks
} from '../../utils/studyPlanner';
import {
  Flame,
  Calendar,
  Clock,
  CheckCircle,
  Award,
  Sparkles,
  KeyRound,
  TrendingUp,
  FileText,
  LogOut,
  Shield,
  PlusCircle,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  ListTodo,
  Library,
  ShieldCheck,
  Target,
  Settings,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface StudentDashboardViewProps {
  student: Student;
  isArabic: boolean;
  onGoToActivation: () => void;
  onGoToSettings: () => void;
  onSwitchToAdmin: () => void;
  onLogout: () => void;
  onToggleLanguage?: () => void;
  onUpdateStudent?: (updated: Student) => void;
}

type SubTab = 'plan' | 'books' | 'devices';

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  student,
  isArabic,
  onGoToActivation,
  onGoToSettings,
  onSwitchToAdmin,
  onLogout,
  onToggleLanguage,
  onUpdateStudent
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('plan');
  const [showBookModal, setShowBookModal] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const plans: BookStudyPlan[] = student.bookPlans || [];
  const today = todayISO();

  const displayName = isArabic ? student.fullNameAr || student.fullName : student.fullName;
  const locale = isArabic ? 'ar-EG' : 'en-US';
  const formatDate = (iso: string, withWeekday = true) =>
    parseLocalDate(iso).toLocaleDateString(locale, {
      weekday: withWeekday ? 'long' : undefined,
      day: 'numeric',
      month: 'long'
    });

  const todayTasks = tasksOnDate(plans, today);
  const lateTasks = overdueTasks(plans, today);
  const nextTasks = upcomingTasks(plans, today, 7);
  const allTasks = flattenTasks(plans);

  const todayDone = todayTasks.filter(pt => pt.task.isCompleted).length;
  const todayPercent = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0;
  const overallPercent =
    allTasks.length > 0 ? Math.round((allTasks.filter(pt => pt.task.isCompleted).length / allTasks.length) * 100) : 0;
  const streak = computeStreak(plans, today);
  const exam = nearestExam(plans, today);

  /* ---------------- mutations ---------------- */

  const commit = (nextPlans: BookStudyPlan[], extra?: Partial<Student>) => {
    onUpdateStudent?.({ ...student, ...extra, bookPlans: nextPlans });
  };

  const toggleTask = (planId: string, taskId: string) => {
    const nowIso = new Date().toISOString();
    commit(
      plans.map(p =>
        p.id !== planId
          ? p
          : {
              ...p,
              tasks: p.tasks.map(t =>
                t.id !== taskId
                  ? t
                  : { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? nowIso : undefined }
              )
            }
      )
    );
  };

  const handleCreatePlan = (plan: BookStudyPlan, fileSizeMb: number) => {
    const pdf: BookPdf = {
      id: plan.id,
      title: plan.bookTitle,
      subject: plan.subject,
      originalFilename: plan.originalFilename,
      fileSizeMb: Math.round(fileSizeMb * 10) / 10,
      pageCount: plan.pageCount,
      uploadDate: plan.createdAt,
      isIndexed: false,
      analyzedSummary: `خطة من ${plan.pageCount} صفحة — الامتحان ${plan.examDate} — ${plan.revisionRounds} جولات مراجعة`,
      keyConceptsCount: 0
    };
    commit([...plans, plan], { uploadedPdfs: [...(student.uploadedPdfs || []), pdf] });
    setShowBookModal(false);
    setActiveSubTab('plan');
  };

  const handleDeletePlan = (planId: string) => {
    commit(
      plans.filter(p => p.id !== planId),
      { uploadedPdfs: (student.uploadedPdfs || []).filter(p => p.id !== planId) }
    );
    setConfirmDeleteId(null);
    if (expandedPlanId === planId) setExpandedPlanId(null);
  };

  /* ---------------- small render helpers ---------------- */

  const taskTitle = (pt: PlannedTask) =>
    pt.task.kind === 'study'
      ? `${pt.plan.subject}: ${isArabic ? 'مذاكرة' : 'Study'}`
      : `${pt.plan.subject}: ${isArabic ? `مراجعة ${pt.task.round}` : `Revision ${pt.task.round}`}`;

  const pagesLabel = (t: StudyPlanTask) => {
    const count = t.pagesTo - t.pagesFrom + 1;
    return isArabic
      ? `ص ${t.pagesFrom}–${t.pagesTo} (${count} صفحة)`
      : `p. ${t.pagesFrom}–${t.pagesTo} (${count} pages)`;
  };

  const renderTaskRow = (pt: PlannedTask, opts?: { showDate?: boolean; late?: boolean }) => (
    <button
      type="button"
      key={pt.task.id}
      onClick={() => toggleTask(pt.plan.id, pt.task.id)}
      className={`w-full text-start p-3.5 sm:p-4 rounded-2xl border transition-all select-none ${
        pt.task.isCompleted
          ? 'bg-slate-900/40 border-emerald-500/30'
          : opts?.late
          ? 'bg-red-950/20 border-red-500/30 hover:border-red-400/60'
          : 'bg-slate-900/90 border-slate-700 hover:border-brand-blue/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            pt.task.isCompleted ? 'bg-emerald-500 text-white' : 'border-2 border-slate-600'
          }`}
        >
          {pt.task.isCompleted && <CheckCircle className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-bold ${pt.task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
            {taskTitle(pt)}
          </h3>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-brand-blue-electric font-semibold">{pagesLabel(pt.task)}</span>
            <span>•</span>
            <span>≈ {pt.task.estimatedMinutes} {isArabic ? 'دقيقة' : 'min'}</span>
            {opts?.showDate && (
              <>
                <span>•</span>
                <span className={opts.late ? 'text-red-300' : ''}>{formatDate(pt.task.date)}</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">{pt.plan.bookTitle}</div>
        </div>
      </div>
    </button>
  );

  const tabButton = (id: SubTab, icon: React.ReactNode, label: string, badge?: string) => (
    <button
      type="button"
      onClick={() => setActiveSubTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
        activeSubTab === id
          ? 'bg-brand-blue text-white shadow-glow-blue/40'
          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span className="px-1.5 rounded-full text-[10px] bg-slate-950/60 font-mono">{badge}</span>
      )}
    </button>
  );

  const addBookButton = (
    <button
      type="button"
      onClick={() => setShowBookModal(true)}
      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-opacity shrink-0"
    >
      <PlusCircle className="w-4 h-4" />
      <span>{isArabic ? 'رفع كتاب جديد' : 'Upload a book'}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-blue selection:text-white">
      {/* ---------------- Header ---------------- */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Logo variant="student-dash" size="md" isArabic={isArabic} />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-purple/20 to-brand-blue/20 border border-brand-purple/40 text-xs font-bold text-white">
              <Award className="w-4 h-4 text-brand-purple-light" />
              <span>{student.subscriptionPlan}</span>
            </div>

            {onToggleLanguage && (
              <button
                type="button"
                onClick={onToggleLanguage}
                className="h-10 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title={isArabic ? 'تبديل للغة الإنجليزية' : 'Switch to Arabic'}
              >
                {isArabic ? 'EN' : 'عربي'}
              </button>
            )}

            <button
              type="button"
              onClick={onGoToActivation}
              className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-brand-blue-electric border border-brand-blue/30 transition-colors"
              title={isArabic ? 'تفعيل كود إضافي' : 'Enter Code'}
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden lg:inline">{isArabic ? 'تفعيل كود' : 'Enter Code'}</span>
            </button>

            {student.isAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30 transition-colors"
                title={isArabic ? 'لوحة الإدارة' : 'Admin Panel'}
              >
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="hidden sm:inline">{isArabic ? 'لوحة الإدارة' : 'Admin'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onGoToSettings}
              className="h-10 pe-2 ps-1 inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title={isArabic ? 'إعدادات الحساب' : 'Account settings'}
            >
              <Avatar src={student.avatarUrl} name={displayName} gender={student.gender} className="w-8 h-8 rounded-lg" />
              <Settings className="w-4 h-4 text-slate-300" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors"
              title={isArabic ? 'تسجيل الخروج' : 'Log Out'}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'خروج' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-3 sm:p-6 lg:p-8 flex-1 space-y-5 sm:space-y-6">
        {/* ---------------- Hero ---------------- */}
        <div className="glass-panel rounded-3xl p-5 sm:p-8 border border-slate-800 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-brand-navy-900/40">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-purple/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {student.educationStage && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{stageLabel(student.educationStage, isArabic)}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? `باقة ${student.subscriptionPlan} مفعلة` : `${student.subscriptionPlan} Plan Active`}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                {isArabic ? `مرحباً بك يا ${displayName}! 🚀` : `Welcome back, ${displayName}! 🚀`}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                {plans.length === 0
                  ? isArabic
                    ? 'ارفع كتابك وحدد يوم الامتحان وعدد المراجعات، وهنقسم لك المذاكرة على الأيام.'
                    : 'Upload your book, set the exam day and how many revisions you want, and we will split the studying across your days.'
                  : isArabic
                  ? 'أكمل مهام اليوم للحفاظ على سلسلة الالتزام والتفوق!'
                  : "Complete today's tasks to protect your streak!"}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full lg:w-auto shrink-0">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-bold mb-1">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>{isArabic ? 'الالتزام' : 'Streak'}</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {streak} <span className="text-xs font-normal text-slate-400">{isArabic ? 'يوم' : 'days'}</span>
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-brand-blue-electric text-xs font-bold mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{isArabic ? 'الإنجاز' : 'Progress'}</span>
                </div>
                <div className="text-2xl font-black text-brand-blue-electric">{overallPercent}%</div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold mb-1">
                  <Clock className="w-4 h-4" />
                  <span>{isArabic ? 'مهام اليوم' : 'Today'}</span>
                </div>
                <div className="text-2xl font-black text-white">
                  {todayDone}/{todayTasks.length}
                </div>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-purple-400 text-xs font-bold mb-1">
                  <Target className="w-4 h-4" />
                  <span>{isArabic ? 'الامتحان' : 'Exam'}</span>
                </div>
                <div className="text-2xl font-black text-purple-300">
                  {exam ? exam.daysLeft : '—'}{' '}
                  {exam && <span className="text-xs font-normal text-slate-400">{isArabic ? 'يوم' : 'd'}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <WhatsAppButton isArabic={isArabic} variant="banner" />

        {/* ---------------- Tabs ---------------- */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none border-b border-slate-800/80">
          {tabButton('plan', <ListTodo className="w-4 h-4" />, isArabic ? 'جدول المذاكرة' : 'Study Schedule', `${todayDone}/${todayTasks.length}`)}
          {tabButton('books', <Library className="w-4 h-4" />, isArabic ? 'كتبي' : 'My Books', String(plans.length))}
          {tabButton('devices', <ShieldCheck className="w-4 h-4" />, isArabic ? 'الأجهزة والاشتراك' : 'Subscription & Devices')}
        </div>

        {/* ---------------- TAB: study schedule ---------------- */}
        {activeSubTab === 'plan' && plans.length === 0 && (
          <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-dashed border-slate-700 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {isArabic ? 'لسه معندكش جدول مذاكرة' : 'You have no study schedule yet'}
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              {isArabic
                ? 'ارفع كتاب المادة، قول يوم الامتحان وعايز تراجع كام مرة، والبرنامج هيقسم لك الصفحات على الأيام المتاحة.'
                : 'Upload your textbook, tell us the exam day and how many revisions you want, and we will split the pages over your available days.'}
            </p>
            <div className="flex justify-center">{addBookButton}</div>
          </div>
        )}

        {activeSubTab === 'plan' && plans.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
            <div className="lg:col-span-2 glass-panel rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-blue-electric" />
                    <span>{isArabic ? 'مهام النهاردة' : "Today's tasks"}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(today)} — {isArabic ? 'اضغط على المهمة لتعليمها كمكتملة' : 'tap a task to mark it done'}
                  </p>
                </div>
                {addBookButton}
              </div>

              {todayTasks.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300">{isArabic ? 'إنجاز النهاردة' : "Today's completion"}</span>
                    <span className="font-extrabold text-brand-blue-electric font-mono">{todayPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-brand-blue to-emerald-400 h-full transition-all duration-500"
                      style={{ width: `${todayPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {lateTasks.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-sm font-bold text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{isArabic ? `متأخرة (${lateTasks.length})` : `Overdue (${lateTasks.length})`}</span>
                  </h3>
                  {lateTasks.map(pt => renderTaskRow(pt, { showDate: true, late: true }))}
                </div>
              )}

              <div className="space-y-2.5">
                {todayTasks.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-sm text-slate-400">
                    {isArabic ? 'مفيش مهام النهاردة، يوم راحة 🎉' : 'No tasks today, enjoy your rest day 🎉'}
                  </div>
                ) : (
                  todayTasks.map(pt => renderTaskRow(pt))
                )}
              </div>

              {nextTasks.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-purple-light" />
                    <span>{isArabic ? 'الأيام الجاية' : 'Coming up'}</span>
                  </h3>
                  {nextTasks.map(pt => renderTaskRow(pt, { showDate: true }))}
                </div>
              )}
            </div>

            <div className="space-y-5 sm:space-y-6">
              <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-blue-electric" />
                  <span>{isArabic ? 'مواعيد الامتحانات' : 'Exam dates'}</span>
                </h3>
                <div className="space-y-2">
                  {[...plans]
                    .sort((a, b) => a.examDate.localeCompare(b.examDate))
                    .map(p => {
                      const left = daysBetween(today, p.examDate);
                      return (
                        <div key={p.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                          <div className="text-slate-400 truncate">{p.subject} — {p.bookTitle}</div>
                          <div className="text-base font-black text-white">{formatDate(p.examDate, false)}</div>
                          <div className={`font-bold ${left < 0 ? 'text-slate-500' : 'text-brand-purple-light'}`}>
                            {left < 0
                              ? isArabic ? 'انتهى الموعد' : 'Date passed'
                              : isArabic ? `متبقي ${left} يوماً` : `${left} days left`}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-3 bg-gradient-to-br from-brand-purple/10 to-transparent">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-purple-light" />
                  <span>{isArabic ? 'نصيحة' : 'Tip'}</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isArabic
                    ? 'ذاكر على جلسات 45 دقيقة وخد استراحة 10 دقائق بينهم (طريقة بومودورو)، وبلاش تأجل مهمة لبكرة عشان الجدول ميتراكمش عليك.'
                    : 'Study in 45-minute blocks with 10-minute breaks (Pomodoro) and avoid pushing tasks to tomorrow so the schedule does not pile up.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- TAB: my books ---------------- */}
        {activeSubTab === 'books' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">{isArabic ? 'كتبي وخطط المذاكرة' : 'My books & plans'}</h2>
              {addBookButton}
            </div>

            {plans.length === 0 && (
              <div className="glass-panel rounded-3xl p-8 border border-dashed border-slate-700 text-center text-sm text-slate-400">
                {isArabic ? 'لسه مرفعتش أي كتاب.' : "You haven't uploaded any book yet."}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {plans.map(plan => {
                const progress = planProgress(plan);
                const left = daysBetween(today, plan.examDate);
                const expanded = expandedPlanId === plan.id;
                return (
                  <div key={plan.id} className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-brand-blue-electric">{plan.subject}</span>
                        <h3 className="text-sm font-bold text-white truncate">{plan.bookTitle}</h3>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {plan.pageCount} {isArabic ? 'صفحة' : 'pages'} • {plan.revisionRounds}{' '}
                          {isArabic ? 'جولات مراجعة' : 'revision rounds'}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30 shrink-0">
                        {progress}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-brand-blue to-brand-purple h-full" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {isArabic ? 'الامتحان: ' : 'Exam: '}
                        <span className="text-white font-semibold">{formatDate(plan.examDate, false)}</span>
                      </span>
                      <span className={left < 0 ? 'text-slate-500' : 'text-brand-purple-light font-bold'}>
                        {left < 0 ? (isArabic ? 'انتهى' : 'Passed') : isArabic ? `${left} يوم` : `${left} d`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedPlanId(expanded ? null : plan.id)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-brand-blue-light border border-slate-700/80 transition-colors flex items-center justify-center gap-1.5"
                      >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span>{isArabic ? (expanded ? 'إخفاء الجدول' : 'عرض الجدول كامل') : expanded ? 'Hide schedule' : 'Full schedule'}</span>
                      </button>

                      {confirmDeleteId === plan.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="px-3 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
                          >
                            {isArabic ? 'تأكيد الحذف' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300"
                          >
                            {isArabic ? 'إلغاء' : 'Cancel'}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(plan.id)}
                          className="p-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-500/30"
                          title={isArabic ? 'حذف الكتاب وخطته' : 'Delete book & plan'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {expanded && (
                      <div className="max-h-80 overflow-y-auto space-y-1.5 pe-1">
                        {plan.tasks.map(t => (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => toggleTask(plan.id, t.id)}
                            className={`w-full text-start flex items-center gap-3 p-2.5 rounded-xl border text-xs transition-colors ${
                              t.isCompleted
                                ? 'bg-slate-900/40 border-emerald-500/30 text-slate-400'
                                : t.date < today
                                ? 'bg-red-950/20 border-red-500/30 text-slate-200'
                                : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-brand-blue/50'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                t.isCompleted ? 'bg-emerald-500 text-white' : 'border-2 border-slate-600'
                              }`}
                            >
                              {t.isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400 w-20 shrink-0">{formatDate(t.date, false)}</span>
                            <span className="flex-1 min-w-0 truncate">
                              {t.kind === 'study'
                                ? isArabic ? 'مذاكرة' : 'Study'
                                : isArabic ? `مراجعة ${t.round}` : `Revision ${t.round}`}{' '}
                              • {pagesLabel(t)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- TAB: subscription & devices ---------------- */}
        {activeSubTab === 'devices' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-blue-electric" />
                <span>{isArabic ? 'تفاصيل باقة الاشتراك' : 'Subscription Details'}</span>
              </h2>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-brand-navy-900/60 border border-brand-blue/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">{isArabic ? 'الخطة الحالية' : 'Current Plan'}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-brand-blue text-white">{student.subscriptionPlan}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">{isArabic ? 'تاريخ التفعيل' : 'Activated On'}</span>
                  <span className="text-white font-mono">{student.registrationDate?.split('T')[0]}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">{isArabic ? 'تاريخ الانتهاء' : 'Expires At'}</span>
                  <span className="text-emerald-400 font-mono font-bold">{student.subscriptionExpiryDate?.split('T')[0]}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onGoToActivation}
                className="w-full py-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-brand-blue-electric border border-brand-blue/40 transition-colors flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isArabic ? 'تفعيل كود تجديد أو ترقية باقة' : 'Redeem Renewal / Upgrade Code'}</span>
              </button>
            </div>

            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>{isArabic ? 'الأجهزة المسجلة لحسابك' : 'Connected Devices'}</span>
              </h2>

              <div className="space-y-3">
                {student.registeredDevices?.map(dev => (
                  <div key={dev.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-brand-blue-light shrink-0">
                        {dev.deviceType === 'desktop' && <Laptop className="w-4 h-4" />}
                        {dev.deviceType === 'mobile' && <Smartphone className="w-4 h-4" />}
                        {dev.deviceType === 'tablet' && <Tablet className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white flex flex-wrap items-center gap-2">
                          <span className="truncate">{dev.deviceName}</span>
                          {dev.isCurrent && (
                            <span className="px-1.5 rounded-full text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                              {isArabic ? 'جهازك الحالي' : 'Current'}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5 truncate">{dev.os}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {showBookModal && (
        <BookPlanModal isArabic={isArabic} onClose={() => setShowBookModal(false)} onCreate={handleCreatePlan} />
      )}

      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 py-4 border-t border-slate-800/60">
        © 2026 Smart Study Planner (مخطط الدراسة الذكي)
      </footer>
    </div>
  );
};
