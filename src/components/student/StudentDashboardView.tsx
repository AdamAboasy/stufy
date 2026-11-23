import React, { useState } from 'react';
import { Student } from '../../types';
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
  ArrowRight, 
  KeyRound, 
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';

interface StudentDashboardViewProps {
  student: Student;
  isArabic: boolean;
  onGoToActivation: () => void;
  onSwitchToAdmin: () => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  student,
  isArabic,
  onGoToActivation,
  onSwitchToAdmin
}) => {
  const [tasks, setTasks] = useState(student.dailyTasks);

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Student Portal Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-8 py-3.5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Logo variant="student-dash" size="md" isArabic={isArabic} />

          <div className="flex items-center gap-3">
            {/* Direct Activation CTA Button */}
            <button
              onClick={onGoToActivation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-opacity shadow-glow-combo"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تفعيل كود جديد' : 'Enter Activation Code'}</span>
            </button>

            {/* Quick Switch to Super Admin */}
            <button
              onClick={onSwitchToAdmin}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <span>{isArabic ? 'لوحة الإدارة العليا' : 'Super Admin View'}</span>
            </button>

            <img
              src={student.avatarUrl}
              alt={student.fullName}
              className="w-9 h-9 rounded-xl object-cover border border-brand-blue/50"
            />
          </div>
        </div>
      </header>

      {/* Main Student Portal Content */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        
        {/* Hero Welcome Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-blue/15 text-brand-blue-electric border border-brand-blue/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isArabic ? student.academicYearAr : student.academicYear}</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {isArabic ? `مرحباً بك يا ${student.fullNameAr}!` : `Welcome back, ${student.fullName}!`}
              </h1>
              <p className="text-sm text-slate-300 max-w-xl">
                {isArabic 
                  ? 'أنت على بعد مهمتين اليوم للوصول إلى هدفك الأسبوعي والمحافظة على سلسلة الالتزام.'
                  : 'You have 2 study goals remaining today to sustain your active study streak.'}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div className="text-center">
                <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'إنجاز المنهج الكلي' : 'Overall Progress'}</div>
                <div className="text-3xl font-black text-brand-blue-electric mt-0.5">{student.overallProgress}%</div>
              </div>
              <div className="p-3 rounded-2xl bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30 shadow-glow-blue/30">
                <Award className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Activation Banner */}
        <WhatsAppButton isArabic={isArabic} variant="banner" />

        {/* Study Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Today's Tasks Interactive Checklist */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-blue-electric" />
                <span>{isArabic ? 'جدول ومهام المذاكرة لليوم' : "Today's Study Schedule"}</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {tasks.filter(t => t.isCompleted).length} / {tasks.length} {isArabic ? 'مكتمل' : 'completed'}
              </span>
            </div>

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
                          {isArabic ? task.titleAr : task.title}
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

          {/* Sidebar: Revision Countdown & Textbooks */}
          <div className="space-y-6">
            
            {/* Revision Rounds */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand-purple-light" />
                <span>{isArabic ? 'جولات المراجعة النهائية' : 'Revision Rounds'}</span>
              </h2>

              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30">
                <div className="text-xs text-purple-300 font-semibold">{isArabic ? 'موعد امتحانات الثانوية العامة' : 'Final Exams Target'}</div>
                <div className="text-lg font-black text-white mt-0.5">{student.revisionPlanner.targetExamDate}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {isArabic ? `متبقي ${student.revisionPlanner.daysRemaining} يوماً` : `${student.revisionPlanner.daysRemaining} days remaining`}
                </div>
              </div>

              <div className="space-y-2.5">
                {student.revisionPlanner.rounds.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white truncate mr-2 rtl:mr-0 rtl:ml-2">
                        {isArabic ? r.titleAr : r.title}
                      </span>
                      <span className="font-bold text-brand-blue-light">{r.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-brand-blue to-brand-purple h-full" style={{ width: `${r.progressPercent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analyzed Textbooks */}
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <span>{isArabic ? 'الكتب المحللة (PDF)' : 'Analyzed Textbooks'}</span>
              </h2>

              {student.uploadedPdfs.map((pdf) => (
                <div key={pdf.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="font-bold text-white truncate">{pdf.title}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{pdf.pageCount} {isArabic ? 'صفحة' : 'pages'} • {pdf.keyConceptsCount} {isArabic ? 'مفهوم ذكي' : 'concepts'}</div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};
