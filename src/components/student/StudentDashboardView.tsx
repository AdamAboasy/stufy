import React, { useState } from 'react';
import { Student, DailyTask, BookPdf } from '../../types';
import { Logo } from '../brand/Logo';
import { WhatsAppButton } from '../whatsapp/WhatsAppButton';
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
  PlusCircle,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  ListTodo,
  Library,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Target
} from 'lucide-react';

interface StudentDashboardViewProps {
  student: Student;
  isArabic: boolean;
  onGoToActivation: () => void;
  onSwitchToAdmin: () => void;
  onLogout: () => void;
  onToggleLanguage?: () => void;
  onUpdateStudent?: (updated: Student) => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  student,
  isArabic,
  onGoToActivation,
  onSwitchToAdmin,
  onLogout,
  onToggleLanguage,
  onUpdateStudent
}) => {
  // Navigation Sub-tab within Student Home Page
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'subjects' | 'pdfs' | 'revision' | 'devices'>('tasks');
  
  // Interactive Tasks State
  const [tasks, setTasks] = useState<DailyTask[]>(student.dailyTasks || []);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState(student.subjects[0]?.name || 'Physics');
  const [newTaskDuration, setNewTaskDuration] = useState(45);
  const [newTaskTime, setNewTaskTime] = useState('06:00 PM');

  // Selected PDF for AI Summary Inspection
  const [selectedPdf, setSelectedPdf] = useState<BookPdf | null>(null);

  // Toggle Task Completion
  const toggleTask = (taskId: string) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t);
    setTasks(updated);
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        dailyTasks: updated
      });
    }
  };

  // Add Custom Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: DailyTask = {
      id: `task-custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      titleAr: newTaskTitle.trim(),
      subject: newTaskSubject,
      scheduledTime: newTaskTime,
      durationMinutes: Number(newTaskDuration),
      isCompleted: false,
      streakDays: 1,
      isOverdue: false
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    setNewTaskTitle('');
    setShowAddTaskModal(false);

    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        dailyTasks: updated
      });
    }
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-blue selection:text-white">
      
      {/* Top Header: Student Portal Navigation */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <Logo variant="student-dash" size="md" isArabic={isArabic} />
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/40">
              <Sparkles className="w-3 h-3" />
              <span>{isArabic ? 'الصفحة الرئيسية' : 'Home Dashboard'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Subscription Plan Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-purple/20 to-brand-blue/20 border border-brand-purple/40 text-xs font-bold text-white shadow-glow-combo">
              <Award className="w-4 h-4 text-brand-purple-light" />
              <span>{student.subscriptionPlan}</span>
              <span className="text-[10px] text-emerald-400">● {isArabic ? 'نشط' : 'Active'}</span>
            </div>

            {/* Language Toggle */}
            {onToggleLanguage && (
              <button
                onClick={onToggleLanguage}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title={isArabic ? 'تبديل للغة الإنجليزية' : 'Switch to Arabic'}
              >
                {isArabic ? 'English' : 'عربي'}
              </button>
            )}

            {/* Direct Activation CTA Button */}
            <button
              onClick={onGoToActivation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-brand-blue-electric border border-brand-blue/30 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isArabic ? 'تفعيل كود إضافي' : 'Enter Code'}</span>
            </button>

            {/* Super Admin Switch */}
            <button
              onClick={onSwitchToAdmin}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>{isArabic ? 'لوحة الإدارة' : 'Admin'}</span>
            </button>

            {/* Student Avatar & Name */}
            <div className="flex items-center gap-2 pr-1 rtl:pr-0 rtl:pl-1">
              <img
                src={student.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'}
                alt={student.fullName}
                className="w-8 h-8 rounded-xl object-cover border border-brand-blue/50"
              />
              <span className="hidden xl:inline text-xs font-bold text-slate-200 truncate max-w-[120px]">
                {isArabic ? student.fullNameAr || student.fullName : student.fullName}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors"
              title={isArabic ? 'تسجيل الخروج' : 'Log Out'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isArabic ? 'خروج' : 'Logout'}</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Student Portal Content */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        
        {/* HERO WELCOME BANNER (Official Brand Theme) */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-brand-navy-900/40">
          
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-purple/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isArabic ? student.academicYearAr || student.academicYear : student.academicYear}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? `باقة ${student.subscriptionPlan} مفعلة` : `${student.subscriptionPlan} Plan Active`}</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                {isArabic 
                  ? `مرحباً بك يا ${student.fullNameAr || student.fullName}! 🚀` 
                  : `Welcome back, ${student.fullName}! 🚀`}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                {isArabic 
                  ? 'جدولك الدراسي منظم ومحدث بالذكاء الاصطناعي.. أكمل مهام اليوم للحفاظ على سلسلة الالتزام والتفوق!'
                  : 'Your personalized AI syllabus is active. Complete today’s goals to protect your study streak and maximize scores.'}
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto shrink-0">
              
              {/* Metric 1: Streak */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-bold mb-1">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>{isArabic ? 'سلسلة الالتزام' : 'Streak'}</span>
                </div>
                <div className="text-2xl font-black text-white">14 <span className="text-xs font-normal text-slate-400">{isArabic ? 'يوم' : 'days'}</span></div>
              </div>

              {/* Metric 2: Progress */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-brand-blue-electric text-xs font-bold mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{isArabic ? 'إنجاز المنهج' : 'Syllabus'}</span>
                </div>
                <div className="text-2xl font-black text-brand-blue-electric">{student.overallProgress || 76}%</div>
              </div>

              {/* Metric 3: Weekly Hours */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold mb-1">
                  <Clock className="w-4 h-4" />
                  <span>{isArabic ? 'ساعات الأسبوع' : 'Weekly'}</span>
                </div>
                <div className="text-2xl font-black text-white">28 <span className="text-xs font-normal text-slate-400">{isArabic ? 'س' : 'hrs'}</span></div>
              </div>

              {/* Metric 4: Days Remaining */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-purple-400 text-xs font-bold mb-1">
                  <Target className="w-4 h-4" />
                  <span>{isArabic ? 'الامتحانات' : 'Exam'}</span>
                </div>
                <div className="text-2xl font-black text-purple-300">
                  {student.revisionPlanner?.daysRemaining || 185} <span className="text-xs font-normal text-slate-400">{isArabic ? 'يوم' : 'd'}</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* WhatsApp Activation Banner */}
        <WhatsAppButton isArabic={isArabic} variant="banner" />

        {/* Interactive Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'tasks'
                ? 'bg-brand-blue text-white shadow-glow-blue/40'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>{isArabic ? 'جدول ومهام اليوم' : "Today's Schedule"}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/60 font-mono">
              {completedCount}/{tasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('subjects')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'subjects'
                ? 'bg-brand-blue text-white shadow-glow-blue/40'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{isArabic ? 'المواد والمناهج' : 'Subjects & Syllabus'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/60 font-mono">
              {student.subjects?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('pdfs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'pdfs'
                ? 'bg-brand-blue text-white shadow-glow-blue/40'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>{isArabic ? 'الكتب والملازم الذكية' : 'Smart Textbooks'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/60 font-mono">
              {student.uploadedPdfs?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('revision')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'revision'
                ? 'bg-brand-blue text-white shadow-glow-blue/40'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>{isArabic ? 'مخطط المراجعة النهائية' : 'Revision Planner'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('devices')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'devices'
                ? 'bg-brand-blue text-white shadow-glow-blue/40'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isArabic ? 'الأجهزة والاشتراك' : 'Subscription & Devices'}</span>
          </button>
        </div>

        {/* TAB 1: TODAY'S SCHEDULE & TASKS */}
        {activeSubTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Interactive Tasks List */}
            <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand-blue-electric" />
                    <span>{isArabic ? 'قائمة مهام المذاكرة المخصصة لليوم' : "Today's Study Checklist"}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isArabic ? 'اضغط على المهمة لتعليمها كمكتملة وتحديث إنجازك اليومي' : 'Click any task to toggle completion and track daily goals'}
                  </p>
                </div>

                <button
                  onClick={() => setShowAddTaskModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-dark text-white shadow-glow-blue/30 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'إضافة مهمة' : 'Add Task'}</span>
                </button>
              </div>

              {/* Progress Bar for Today */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300">
                    {isArabic ? 'نسبة إنجاز مهام اليوم' : "Today's Completion Rate"}
                  </span>
                  <span className="font-extrabold text-brand-blue-electric font-mono">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-brand-blue to-emerald-400 h-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                      task.isCompleted
                        ? 'bg-slate-900/40 border-emerald-500/30'
                        : 'bg-slate-900/90 border-slate-700 hover:border-brand-blue/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                          task.isCompleted
                            ? 'bg-emerald-500 text-white shadow-glow-whatsapp'
                            : 'border-2 border-slate-600 hover:border-brand-blue'
                        }`}>
                          {task.isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {isArabic ? task.titleAr || task.title : task.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="text-brand-blue-electric font-semibold">{task.subject}</span>
                            <span>•</span>
                            <span>{task.scheduledTime}</span>
                            <span>•</span>
                            <span>{task.durationMinutes} {isArabic ? 'دقيقة' : 'min'}</span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        task.isCompleted
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-sky-950 text-sky-300 border border-sky-500/30'
                      }`}>
                        {task.isCompleted ? (isArabic ? 'تم الإنجاز' : 'Done') : (isArabic ? 'مطلوب' : 'To Do')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Side Motivation & Quick Calendar */}
            <div className="space-y-6">
              
              {/* Daily Quote & Advice */}
              <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3 bg-gradient-to-br from-brand-purple/10 to-transparent">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-purple-light" />
                  <span>{isArabic ? 'نصيحة المساعد الذكي لليوم' : 'Daily AI Study Tip'}</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isArabic 
                    ? '"تقسيم جلسات المذاكرة لـ 45 دقيقة مع استراحة 10 دقائق (تقنية بومودورو) يرفع قدرة استيعابك للمفاهيم الفيزيائية والكيميائية بنسبة 40%."'
                    : '"Dividing your study into 45-min blocks followed by 10-min active breaks increases recall of complex physics equations by 40%."'}
                </p>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-brand-blue-light font-semibold">
                  {isArabic ? 'مخطط الدراسة الذكي • خوارزمية التكرار المتباعد' : 'Smart Study Planner • Spaced Repetition'}
                </div>
              </div>

              {/* Revision Planner Card Preview */}
              <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-blue-electric" />
                  <span>{isArabic ? 'الامتحانات المستهدفة' : 'Target Exam'}</span>
                </h3>
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400">{isArabic ? 'تاريخ امتحانات الثانوية العامة' : 'Thanawya Exam Date'}</div>
                  <div className="text-base font-black text-white">{student.revisionPlanner?.targetExamDate || '2027-06-15'}</div>
                  <div className="text-brand-purple-light font-bold">
                    {isArabic ? `متبقي ${student.revisionPlanner?.daysRemaining || 185} يوماً` : `${student.revisionPlanner?.daysRemaining || 185} days left`}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: SUBJECTS & SYLLABUS */}
        {activeSubTab === 'subjects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {student.subjects?.map((sub) => (
              <div key={sub.id} className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 hover:border-brand-blue/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-brand-blue-electric font-semibold">{sub.code}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{isArabic ? sub.nameAr || sub.name : sub.name}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30">
                    {sub.progressPercent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-brand-blue to-brand-purple h-full" style={{ width: `${sub.progressPercent}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>{sub.completedLessons} / {sub.totalLessons} {isArabic ? 'درس مكتمل' : 'lessons completed'}</span>
                  <span className="text-brand-blue-light font-semibold">{sub.chapters?.length || 4} {isArabic ? 'فصول' : 'chapters'}</span>
                </div>

                {/* Chapters Preview */}
                <div className="space-y-1.5 pt-1">
                  {sub.chapters?.slice(0, 2).map((chap) => (
                    <div key={chap.id} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex justify-between items-center">
                      <span className="text-slate-300 truncate">{isArabic ? chap.titleAr || chap.title : chap.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">{chap.lessons?.length || 0} {isArabic ? 'دروس' : 'lessons'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: SMART TEXTBOOKS & AI SUMMARIES */}
        {activeSubTab === 'pdfs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {student.uploadedPdfs?.map((pdf) => (
                <div key={pdf.id} className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-brand-blue-electric uppercase">{pdf.subject}</span>
                        <h3 className="text-sm font-bold text-white line-clamp-1">{pdf.title}</h3>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {pdf.analyzedSummary}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{pdf.pageCount} {isArabic ? 'صفحة' : 'pages'}</span>
                      <span className="text-emerald-400 font-bold">{pdf.keyConceptsCount} {isArabic ? 'مفهوم مستخرج' : 'AI concepts'}</span>
                    </div>

                    <button
                      onClick={() => setSelectedPdf(pdf)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-brand-blue-light border border-slate-700/80 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'استعراض المفاهيم والقوانين الذكية' : 'View AI Summary'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: REVISION PLANNER */}
        {activeSubTab === 'revision' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-purple-light" />
                  <span>{isArabic ? 'جدول جولات المراجعة النهائية لامتحانات الثانوية' : 'Revision Blitz Rounds'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isArabic ? 'نظام المراجعة الثلاثي لضمان تثبيت القوانين وحل النماذج الشاملة' : '3-Tier Revision Strategy covering syllabus retention and mock exam readiness'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {student.revisionPlanner?.rounds?.map((round) => (
                  <div key={round.id} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple-light border border-brand-purple/30">
                        {isArabic ? `الجولة ${round.roundNumber}` : `Round ${round.roundNumber}`}
                      </span>
                      <span className="text-xs font-extrabold text-white">{round.progressPercent}%</span>
                    </div>

                    <h3 className="font-bold text-white text-sm">{isArabic ? round.titleAr || round.title : round.title}</h3>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-brand-purple to-brand-blue h-full" style={{ width: `${round.progressPercent}%` }} />
                    </div>

                    <div className="text-[11px] text-slate-400 pt-2 flex justify-between">
                      <span>{round.startDate}</span>
                      <span>{round.targetDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUBSCRIPTION & DEVICES */}
        {activeSubTab === 'devices' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Subscription Card */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-brand-blue-electric" />
                <span>{isArabic ? 'تفاصيل باقة الاشتراك' : 'Subscription Details'}</span>
              </h2>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-brand-navy-900/60 border border-brand-blue/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">{isArabic ? 'الخطة الحالية' : 'Current Plan'}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-brand-blue text-white shadow-glow-blue/40">
                    {student.subscriptionPlan}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">{isArabic ? 'تاريخ التفعيل' : 'Activated On'}</span>
                  <span className="text-white font-mono">{student.registrationDate?.split('T')[0] || '2026-09-01'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">{isArabic ? 'تاريخ الانتهاء' : 'Expires At'}</span>
                  <span className="text-emerald-400 font-mono font-bold">{student.subscriptionExpiryDate?.split('T')[0] || '2027-06-30'}</span>
                </div>
              </div>

              <button
                onClick={onGoToActivation}
                className="w-full py-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-brand-blue-electric border border-brand-blue/40 transition-colors flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isArabic ? 'تفعيل كود تجديد أو ترقية باقة' : 'Redeem Renewal / Upgrade Code'}</span>
              </button>
            </div>

            {/* Registered Devices */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>{isArabic ? 'الأجهزة المسجلة لحسابك' : 'Connected Devices'}</span>
              </h2>

              <div className="space-y-3">
                {student.registeredDevices?.map((dev) => (
                  <div key={dev.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-brand-blue-light">
                        {dev.deviceType === 'desktop' && <Laptop className="w-4 h-4" />}
                        {dev.deviceType === 'mobile' && <Smartphone className="w-4 h-4" />}
                        {dev.deviceType === 'tablet' && <Tablet className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{dev.deviceName}</span>
                          {dev.isCurrent && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                              {isArabic ? 'جهازك الحالي' : 'Current'}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{dev.os} • {dev.browser}</div>
                      </div>
                    </div>
                    <span className="text-slate-400 text-[10px] font-mono">{dev.ipAddress.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Add Custom Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-brand-blue-electric" />
                <span>{isArabic ? 'إضافة مهمة مذاكرة جديدة' : 'Add Study Task'}</span>
              </h3>
              <button onClick={() => setShowAddTaskModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isArabic ? 'عنوان المهمة' : 'Task Title'}
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={isArabic ? 'مثال: حل 30 سؤال كيمياء عضوية' : 'e.g. Solve 30 Organic Chemistry Questions'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isArabic ? 'المادة' : 'Subject'}
                  </label>
                  <select
                    value={newTaskSubject}
                    onChange={(e) => setNewTaskSubject(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                  >
                    {student.subjects?.map(s => (
                      <option key={s.id} value={s.name}>{isArabic ? s.nameAr || s.name : s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isArabic ? 'المدة (دقيقة)' : 'Duration (min)'}
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="5"
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isArabic ? 'الوقت المجدول' : 'Scheduled Time'}
                </label>
                <input
                  type="text"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  placeholder="06:00 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-xs bg-brand-blue text-white hover:bg-brand-blue-dark transition-colors shadow-glow-blue/40 mt-2"
              >
                {isArabic ? 'إضافة إلى جدول اليوم' : 'Add to Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Summary Inspection Modal */}
      {selectedPdf && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-xl w-full rounded-3xl p-6 sm:p-8 border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-blue-electric" />
                <h3 className="font-bold text-white text-base truncate max-w-md">{selectedPdf.title}</h3>
              </div>
              <button onClick={() => setSelectedPdf(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="text-brand-blue-electric font-bold">{isArabic ? 'الملخص الذكي للمحتوى والقوانين:' : 'Extracted AI Summary & Formulas:'}</div>
              <p className="text-slate-300 leading-relaxed">{selectedPdf.analyzedSummary}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">{isArabic ? 'عدد الصفحات' : 'Page Count'}:</span>
                <span className="font-bold text-white mr-2 rtl:mr-0 rtl:ml-2">{selectedPdf.pageCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">{isArabic ? 'المفاهيم الذكية' : 'AI Concepts'}:</span>
                <span className="font-bold text-emerald-400 mr-2 rtl:mr-0 rtl:ml-2">{selectedPdf.keyConceptsCount}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPdf(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 py-4 border-t border-slate-800/60">
        © 2026 Smart Study Planner (مخطط الدراسة الذكي) • {isArabic ? 'نظام دراسة ذكي ومخصص' : 'Personalized AI Study Engine'}
      </footer>

    </div>
  );
};
