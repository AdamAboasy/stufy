import React, { useState } from 'react';
import { Student } from '../../types';
import { Logo } from '../brand/Logo';
import { 
  Eye, 
  ShieldAlert, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Zap, 
  Calendar, 
  FileText, 
  Award, 
  Flame,
  CheckCircle
} from 'lucide-react';

interface StudentSupportModeProps {
  student: Student;
  isArabic: boolean;
  onExitSupportMode: () => void;
}

export const StudentSupportMode: React.FC<StudentSupportModeProps> = ({
  student,
  isArabic,
  onExitSupportMode
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'subjects' | 'revision'>('overview');
  const [notice, setNotice] = useState<string | null>(null);

  const showReadOnlyNotice = () => {
    setNotice(
      isArabic
        ? 'تنبيه: أنت في وضع المعاينة الآمنة (Support Mode). التعديلات محجوبة لحماية بيانات الطالب.'
        : 'Notice: You are in Student Support Mode (Read-Only). Direct actions are locked to protect student data.'
    );
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Prominent Support Mode Security Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/40 px-4 py-3 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-amber-300 text-sm tracking-wide">
                  {isArabic ? 'وضع الدعم الفني الآمن (معاينة تجربة الطالب)' : 'SECURE STUDENT SUPPORT MODE (INSPECTION)'}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40">
                  {isArabic ? 'للقراءة فقط - عزل أمني كامل' : 'Read-Only • Zero Data Mutation'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isArabic
                  ? `أنت تشاهد حالياً ما يراه الطالب (${isArabic ? student.fullNameAr : student.fullName}) - كود: ${student.studentId}`
                  : `Viewing live interface as seen by student (${student.fullName}) - ID: ${student.studentId}`}
              </p>
            </div>
          </div>

          <button
            onClick={onExitSupportMode}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md"
          >
            <LogOut className="w-4 h-4" />
            <span>{isArabic ? 'إنهاء المعاينة والعودة للوحة الإدارة' : 'Exit Support Mode'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="bg-amber-500/90 text-slate-950 font-bold text-center py-2 px-4 text-xs transition-all animate-bounce">
          {notice}
        </div>
      )}

      {/* Simulated Student Portal Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Logo variant="student-dash" size="sm" isArabic={isArabic} />
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview' },
                { id: 'tasks', labelAr: 'المهام اليومية', labelEn: 'Daily Tasks' },
                { id: 'subjects', labelAr: 'المواد والمناهج', labelEn: 'Subjects' },
                { id: 'revision', labelAr: 'مخطط المراجعة', labelEn: 'Revision Planner' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isArabic ? tab.labelAr : tab.labelEn}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-300">{student.performanceReport.studyStreakDays} {isArabic ? 'أيام متتالية' : 'Day Streak'}</span>
            </div>
            <img
              src={student.avatarUrl}
              alt={student.fullName}
              className="w-8 h-8 rounded-full border border-brand-blue/40 object-cover"
            />
          </div>
        </div>
      </header>

      {/* Simulated Student Content Body */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1">
        
        {/* Welcome Hero Widget */}
        <div className="glass-panel rounded-3xl p-6 mb-8 border border-slate-800 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blue/15 text-brand-blue-light border border-brand-blue/30">
                <SparkleIcon className="w-3.5 h-3.5" />
                <span>{isArabic ? student.academicYearAr : student.academicYear}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {isArabic ? `أهلاً بك يا ${student.fullNameAr}` : `Welcome Back, ${student.fullName}`}
              </h2>
              <p className="text-sm text-slate-300 max-w-xl">
                {isArabic
                  ? 'جدول مذاكرتك اليوم مجهز وفقاً لمعدل استيعابك الذكي، ومتبقي لك مهمتين لإكمال هدف اليوم.'
                  : 'Your daily study schedule is dynamically calibrated. 2 focus tasks remain to hit today’s milestone.'}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shrink-0">
              <div className="text-center">
                <div className="text-xs text-slate-400 font-medium">{isArabic ? 'نسبة الإنجاز الكلي' : 'Overall Progress'}</div>
                <div className="text-3xl font-black bg-gradient-to-r from-brand-blue-electric to-brand-purple-light bg-clip-text text-transparent mt-1">
                  {student.overallProgress}%
                </div>
              </div>
              <div className="w-16 h-16 relative flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-brand-blue-electric"
                    strokeDasharray={`${student.overallProgress}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <Award className="w-6 h-6 text-brand-blue-electric absolute" />
              </div>
            </div>
          </div>
        </div>

        {/* Grid: Tasks & Subjects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Today's Tasks */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-blue-light" />
                <span>{isArabic ? 'مهام اليوم المجدولة' : "Today's Study Schedule"}</span>
              </h3>
              <span className="text-xs text-slate-400">
                {student.dailyTasks.length} {isArabic ? 'مهام' : 'Tasks'}
              </span>
            </div>

            <div className="space-y-3">
              {student.dailyTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={showReadOnlyNotice}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    task.isCompleted
                      ? 'bg-slate-900/50 border-emerald-500/30'
                      : 'bg-slate-900/90 border-slate-700/80 hover:border-brand-blue/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showReadOnlyNotice();
                        }}
                        className={`mt-1 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                          task.isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'border-2 border-slate-600 hover:border-brand-blue'
                        }`}
                      >
                        {task.isCompleted && <CheckCircle className="w-4 h-4" />}
                      </button>
                      <div>
                        <h4 className={`text-sm font-bold ${task.isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                          {isArabic ? task.titleAr : task.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span className="text-brand-blue-light font-medium">{task.subject}</span>
                          <span>•</span>
                          <span>{task.scheduledTime}</span>
                          <span>•</span>
                          <span>{task.durationMinutes} {isArabic ? 'دقيقة' : 'min'}</span>
                        </div>
                      </div>
                    </div>

                    {task.isCompleted ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 shrink-0">
                        {isArabic ? 'مكتمل' : 'Completed'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-950/80 text-sky-300 border border-sky-500/30 shrink-0">
                        {isArabic ? 'قيد المذاكرة' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revision & Progress Sidebar */}
          <div className="space-y-6">
            
            {/* Exam Countdown & Current Revision */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-brand-purple-light" />
                <span>{isArabic ? 'مخطط مراجعة الثانوية' : 'Exam Revision Countdown'}</span>
              </h3>
              
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 mb-4">
                <div className="text-xs text-purple-300 font-semibold">{isArabic ? 'موعد امتحانات الدور الأول' : 'Target Exam Date'}</div>
                <div className="text-xl font-black text-white mt-0.5">{student.revisionPlanner.targetExamDate}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {isArabic ? `متبقي ${student.revisionPlanner.daysRemaining} يوماً على بدء الامتحانات` : `${student.revisionPlanner.daysRemaining} days remaining`}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {isArabic ? 'الجولة الحالية' : 'Current Round'}
                </div>
                {student.revisionPlanner.rounds.slice(0, 1).map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <div className="font-bold text-white">{isArabic ? r.titleAr : r.title}</div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                      <div className="bg-gradient-to-r from-brand-blue to-brand-purple h-full" style={{ width: `${r.progressPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                      <span>{isArabic ? 'إنجاز الجولة' : 'Round Progress'}</span>
                      <span className="font-bold text-brand-blue-light">{r.progressPercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Uploaded AI Analyzed Books */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <span>{isArabic ? 'الكتب المحللة بالذكاء الاصطناعي' : 'Analyzed Textbooks'}</span>
              </h3>
              
              <div className="space-y-2.5">
                {student.uploadedPdfs.map((pdf) => (
                  <div key={pdf.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                    <div className="truncate mr-2 rtl:mr-0 rtl:ml-2">
                      <div className="font-bold text-white truncate">{pdf.title}</div>
                      <div className="text-slate-400 text-[11px]">{pdf.pageCount} {isArabic ? 'صفحة' : 'pages'} • {pdf.fileSizeMb} MB</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 shrink-0">
                      AI Indexed
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};

const SparkleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4M4 19h4m9-15v4m-2-2h4m5 13v4m-2-2h4M12 3a9 9 0 110 18 9 9 0 010-18z" />
  </svg>
);
