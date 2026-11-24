import React, { useState } from 'react';
import { Student, RegisteredDevice, BookPdf, Subject, StudyPlan, DailyTask, RevisionRound, ActivationHistoryItem } from '../../types';
import { 
  X, 
  User, 
  GraduationCap, 
  BookOpen, 
  ListTree, 
  CalendarRange, 
  CheckSquare, 
  RotateCcw, 
  BarChart3, 
  CreditCard, 
  Smartphone, 
  ShieldCheck, 
  Edit3, 
  Key, 
  Eye, 
  Clock, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  Zap, 
  Trash2, 
  TrendingUp, 
  Mail, 
  Phone, 
  Lock
} from 'lucide-react';

interface StudentProfileModalProps {
  student: Student;
  isOpen: boolean;
  isArabic: boolean;
  onClose: () => void;
  onEdit: (student: Student) => void;
  onLaunchSupportMode: (student: Student) => void;
  onRevokeDevice: (studentId: string, deviceId: string) => void;
  onGeneratePasswordReset: (student: Student) => void;
  onDeleteStudent?: (student: Student) => void;
  onToggleStudentAdmin?: (student: Student) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  isOpen,
  isArabic,
  onClose,
  onEdit,
  onLaunchSupportMode,
  onRevokeDevice,
  onGeneratePasswordReset,
  onDeleteStudent,
  onToggleStudentAdmin
}) => {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [copiedToken, setCopiedToken] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const tabs = [
    { id: 1, key: 'personal', nameAr: '1. البيانات الشخصية', nameEn: '1. Personal Info', icon: User },
    { id: 2, key: 'academic', nameAr: '2. السنة والمواد', nameEn: '2. Academic & Subjects', icon: GraduationCap },
    { id: 3, key: 'pdfs', nameAr: '3. الكتب وPDF المحللة', nameEn: '3. Uploaded PDFs', icon: BookOpen },
    { id: 4, key: 'curriculum', nameAr: '4. الفصول والدروس', nameEn: '4. Chapters & Lessons', icon: ListTree },
    { id: 5, key: 'plans', nameAr: '5. خطط المذاكرة', nameEn: '5. Study Plans', icon: CalendarRange },
    { id: 6, key: 'tasks', nameAr: '6. المهام اليومية', nameEn: '6. Daily Tasks', icon: CheckSquare },
    { id: 7, key: 'revision', nameAr: '7. جولات المراجعة', nameEn: '7. Revision Planner', icon: RotateCcw },
    { id: 8, key: 'stats', nameAr: '8. الإحصائيات والأداء', nameEn: '8. Progress & Stats', icon: BarChart3 },
    { id: 9, key: 'subscription', nameAr: '9. الاشتراكات والتفعيل', nameEn: '9. Subscriptions', icon: CreditCard },
    { id: 10, key: 'devices', nameAr: '10. الأجهزة والنشاط', nameEn: '10. Devices & Activity', icon: Smartphone },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">{isArabic ? 'نشط' : 'Active'}</span>;
      case 'Suspended':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-950/80 text-red-400 border border-red-500/30">{isArabic ? 'معلّق' : 'Suspended'}</span>;
      case 'Expired':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-400 border border-amber-500/30">{isArabic ? 'منتهي' : 'Expired'}</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'Elite VIP':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-glow-purple/20">👑 Elite VIP</span>;
      case 'Pro':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-950/80 text-brand-blue-electric border border-brand-blue/40 shadow-glow-blue/20">⚡ Pro</span>;
      case 'Basic':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-sky-300 border border-slate-700">Basic</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">Free Trial</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="glass-panel relative w-full max-w-6xl max-h-[92vh] rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden bg-slate-950/95">
        
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={student.avatarUrl}
              alt={student.fullName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-blue/40 shadow-glow-blue/30 shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {isArabic ? student.fullNameAr : student.fullName}
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  {student.studentId}
                </span>
                {getStatusBadge(student.status)}
                {getPlanBadge(student.subscriptionPlan)}
                {student.isAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-500/40">
                    {isArabic ? 'أدمن' : 'ADMIN'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {student.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span dir="ltr">{student.phoneNumber}</span>
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                  {isArabic ? student.academicYearAr : student.academicYear}
                </span>
              </div>
            </div>
          </div>

          {/* Super Admin Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <button
              onClick={() => onLaunchSupportMode(student)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors"
              title="Secure inspection without modifying account"
            >
              <Eye className="w-4 h-4" />
              <span>{isArabic ? 'معاينة تجربة الطالب (Support Mode)' : 'Inspect Student Experience'}</span>
            </button>

            <button
              onClick={() => onEdit(student)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue-electric border border-brand-blue/40 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isArabic ? 'تعديل البيانات' : 'Edit Student'}</span>
            </button>

            <button
              onClick={() => onGeneratePasswordReset(student)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 transition-colors"
            >
              <Key className="w-4 h-4" />
              <span>{isArabic ? 'إعادة ضبط كلمة المرور' : 'Reset Password'}</span>
            </button>

            {onToggleStudentAdmin && (
              <button
                onClick={() => onToggleStudentAdmin(student)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  student.isAdmin
                    ? 'bg-red-950/50 hover:bg-red-900/60 text-red-300 border-red-500/30'
                    : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {student.isAdmin
                    ? (isArabic ? 'إلغاء صلاحية الأدمن' : 'Remove Admin Role')
                    : (isArabic ? 'ترقية لأدمن' : 'Promote to Admin')}
                </span>
              </button>
            )}

            {onDeleteStudent && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-500/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isArabic ? 'حذف الطالب' : 'Delete Student'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 10 Detailed Profile Tabs Navigation */}
        <div className="border-b border-slate-800 bg-slate-900/40 px-4 overflow-x-auto scrollbar-none flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-brand-blue-electric text-brand-blue-electric bg-brand-blue/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{isArabic ? tab.nameAr : tab.nameEn}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: Personal Information */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'الاسم بالكامل (عربي)' : 'Full Name (Arabic)'}</div>
                  <div className="text-base font-bold text-white mt-1">{student.fullNameAr}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'الاسم بالإنجليزية' : 'Full Name (English)'}</div>
                  <div className="text-base font-bold text-white mt-1">{student.fullName}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'الرقم القومي / الهوية الوطنية' : 'National ID'}</div>
                  <div className="text-base font-mono font-bold text-brand-blue-light mt-1">{student.nationalId}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</div>
                  <div className="text-sm font-semibold text-white mt-1 truncate">{student.email}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'رقم هاتف الطالب' : 'Student Phone'}</div>
                  <div className="text-sm font-semibold text-white mt-1" dir="ltr">{student.phoneNumber}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'رقم هاتف ولي الأمر' : 'Guardian Phone'}</div>
                  <div className="text-sm font-semibold text-white mt-1" dir="ltr">{student.guardianPhoneNumber}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'تاريخ التسجيل بالمنصة' : 'Registration Date'}</div>
                  <div className="text-sm font-semibold text-white mt-1">{new Date(student.registrationDate).toLocaleDateString()}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'تاريخ انتهاء الاشتراك' : 'Subscription Expiry'}</div>
                  <div className="text-sm font-semibold text-amber-300 mt-1">{new Date(student.subscriptionExpiryDate).toLocaleDateString()}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'آخر ظهور ونشاط' : 'Last Activity'}</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1">{new Date(student.lastActivity).toLocaleString()}</div>
                </div>
              </div>

              {student.notes && (
                <div className="p-4 rounded-2xl bg-brand-navy-900/50 border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold mb-1">{isArabic ? 'ملاحظات الإدارة الأكاديمية' : 'Admin & Academic Notes'}</div>
                  <p className="text-sm text-slate-300">{student.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Academic Year & Subjects */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">{isArabic ? 'المرحلة الدراسية والشعبة' : 'Academic Year & Stream'}</div>
                  <div className="text-lg font-bold text-white mt-0.5">{isArabic ? student.academicYearAr : student.academicYear}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30">
                  {student.subjects.length} {isArabic ? 'مواد مسجلة' : 'Enrolled Subjects'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.subjects.map((sub) => (
                  <div key={sub.id} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-400">{sub.code}</span>
                        <span className="text-xs font-bold text-brand-blue-light">{sub.progressPercent}%</span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-1">{isArabic ? sub.nameAr : sub.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {sub.completedLessons} / {sub.totalLessons} {isArabic ? 'دروس مكتملة' : 'lessons completed'}
                      </p>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-4">
                      <div 
                        className="bg-gradient-to-r from-brand-blue to-brand-purple h-full rounded-full" 
                        style={{ width: `${sub.progressPercent}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Uploaded PDFs & Analyzed Books */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-300">
                  {isArabic ? `الكتب والملفات المرفوعة (${student.uploadedPdfs.length})` : `Uploaded Textbooks & PDFs (${student.uploadedPdfs.length})`}
                </h3>
              </div>

              {student.uploadedPdfs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {isArabic ? 'لا توجد ملفات PDF مرفوعة لهذا الطالب حتى الآن.' : 'No uploaded PDFs for this student yet.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {student.uploadedPdfs.map((pdf) => (
                    <div key={pdf.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-3 rounded-xl bg-red-950/60 text-red-400 border border-red-500/30 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{pdf.title}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="text-brand-blue-light">{pdf.subject}</span>
                            <span>•</span>
                            <span>{pdf.pageCount} {isArabic ? 'صفحة' : 'pages'}</span>
                            <span>•</span>
                            <span>{pdf.fileSizeMb} MB</span>
                            <span>•</span>
                            <span>{new Date(pdf.uploadDate).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                            <span className="font-semibold text-emerald-400">{isArabic ? 'الملخص الذكي: ' : 'AI Concept Summary: '}</span>
                            {pdf.analyzedSummary}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          {pdf.keyConceptsCount} {isArabic ? 'مفهوم مستخرج' : 'AI Concepts'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Chapters, Lessons, and Subtopics */}
          {activeTab === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300">
                {isArabic ? 'الهيكل التفصيلي للفصول والدروس ومعدلات الإتقان' : 'Curriculum Structure & Lesson Mastery Scores'}
              </h3>

              {student.subjects.flatMap(s => s.chapters).length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {isArabic ? 'لا توجد فصول دراسية محملة لهذا الطالب بعد.' : 'No detailed chapters loaded yet.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {student.subjects.map(s => (
                    <div key={s.id} className="space-y-3">
                      <div className="text-xs font-bold text-brand-blue-electric uppercase tracking-wider">
                        {isArabic ? s.nameAr : s.name}
                      </div>

                      {s.chapters.map(ch => (
                        <div key={ch.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                          <h4 className="font-bold text-white text-sm mb-3">
                            {isArabic ? ch.titleAr : ch.title}
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {ch.lessons.map(les => (
                              <div key={les.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${les.isCompleted ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                  <span className={les.isCompleted ? 'text-slate-200' : 'text-slate-400'}>
                                    {isArabic ? les.titleAr : les.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-slate-500">{les.durationMinutes}m</span>
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-500/30">
                                    {les.masteryScore}% {isArabic ? 'إتقان' : 'mastery'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Current & Previous Study Plans */}
          {activeTab === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.studyPlans.map(sp => (
                  <div key={sp.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30">
                          {sp.pacing} {isArabic ? 'سرعة' : 'Pacing'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {sp.startDate} → {sp.endDate}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">{sp.title}</h4>
                      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-slate-400">{isArabic ? 'الهدف الأسبوعي' : 'Weekly Target'}</span>
                          <div className="text-sm font-bold text-white mt-0.5">{sp.weeklyTargetHours} {isArabic ? 'ساعة' : 'hours'}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-slate-400">{isArabic ? 'المنجز فعلياً' : 'Completed'}</span>
                          <div className="text-sm font-bold text-emerald-400 mt-0.5">{sp.hoursCompleted} {isArabic ? 'ساعة' : 'hours'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{isArabic ? 'معدل إكمال الخطة' : 'Completion Rate'}</span>
                        <span className="font-bold text-brand-blue-light">{sp.completionRate}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-brand-blue-electric h-full rounded-full" style={{ width: `${sp.completionRate}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: Daily Tasks & Completion History */}
          {activeTab === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-300">
                  {isArabic ? `المهام اليومية المسجلة (${student.dailyTasks.length})` : `Daily Tasks & History (${student.dailyTasks.length})`}
                </h3>
              </div>

              <div className="space-y-2.5">
                {student.dailyTasks.map(t => (
                  <div key={t.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${t.isCompleted ? 'bg-emerald-400 shadow-glow-whatsapp' : 'bg-amber-400'}`} />
                      <div>
                        <div className={`font-bold ${t.isCompleted ? 'text-slate-200' : 'text-white'}`}>
                          {isArabic ? t.titleAr : t.title}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {t.subject} • {t.scheduledTime} ({t.durationMinutes} min)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {t.isCompleted ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          {isArabic ? 'مكتمل بنجاح' : 'Done'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-500/30">
                          {isArabic ? 'قيد الإنجاز' : 'Pending'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: Exam Revision Planner and revision rounds */}
          {activeTab === 7 && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-purple-300 font-semibold">{isArabic ? 'الموعد المستهدف لامتحانات الثانوية' : 'Target Official Exam Date'}</div>
                  <div className="text-xl font-black text-white mt-0.5">{student.revisionPlanner.targetExamDate}</div>
                  <div className="text-xs text-slate-400 mt-1">{isArabic ? `متبقي ${student.revisionPlanner.daysRemaining} يوماً` : `${student.revisionPlanner.daysRemaining} days left`}</div>
                </div>
                <div className="text-right rtl:text-left">
                  <div className="text-xs text-slate-400">{isArabic ? 'الامتحان التجريبي القادم' : 'Next Mock Exam'}</div>
                  <div className="text-xs font-bold text-brand-blue-electric mt-0.5">{student.revisionPlanner.nextMockExam}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">{isArabic ? 'جولات المراجعة الشاملة (3 جولات)' : 'Revision Rounds'}</div>
                {student.revisionPlanner.rounds.map(r => (
                  <div key={r.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-brand-purple/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-xs">
                          {r.roundNumber}
                        </span>
                        <h4 className="font-bold text-white text-sm">{isArabic ? r.titleAr : r.title}</h4>
                      </div>
                      <span className="text-xs font-bold text-brand-blue-light">{r.progressPercent}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                      <div className="bg-gradient-to-r from-brand-blue to-brand-purple h-full" style={{ width: `${r.progressPercent}%` }} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mt-3">
                      <span>{r.startDate} → {r.targetDate}</span>
                      {r.mockExamScore && (
                        <span className="text-emerald-400 font-bold">
                          {isArabic ? `درجة الامتحان التجريبي: ${r.mockExamScore}%` : `Mock Score: ${r.mockExamScore}%`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: Progress statistics and performance reports */}
          {activeTab === 8 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">{isArabic ? 'الدرجة التقديرية' : 'Overall Score'}</div>
                  <div className="text-2xl font-black text-brand-blue-electric mt-1">{student.performanceReport.overallScore}%</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">{isArabic ? 'ساعات المذاكرة الكلية' : 'Total Hours'}</div>
                  <div className="text-2xl font-black text-white mt-1">{student.performanceReport.totalHoursStudied}h</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">{isArabic ? 'دقة حل الاختبارات' : 'Quiz Accuracy'}</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{student.performanceReport.quizAccuracyPercent}%</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">{isArabic ? 'أيام الالتزام المستمر' : 'Streak Days'}</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{student.performanceReport.studyStreakDays} 🔥</div>
                </div>
              </div>

              {/* Subject Mastery Distribution */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-4">{isArabic ? 'مستوى التمكن في المواد' : 'Subject Mastery Breakdown'}</h4>
                <div className="space-y-3">
                  {student.performanceReport.subjectMastery.map((sm, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300">{sm.subject}</span>
                        <span className="font-bold text-white">{sm.score}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${sm.score}%`, backgroundColor: sm.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: Subscription and activation history */}
          {activeTab === 9 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-300">
                  {isArabic ? `سجل التفعيل والاشتراكات (${student.activationHistory.length})` : `Activation & Vouchers History (${student.activationHistory.length})`}
                </h3>
              </div>

              {student.activationHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {isArabic ? 'لم يتم تفعيل أكواد لهذا الطالب بعد.' : 'No redeemed activation codes found.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {student.activationHistory.map(act => (
                    <div key={act.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-brand-blue-electric">{act.code}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">{act.plan}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {isArabic ? `طريقة الدفع: ${act.paymentMethod}` : `Payment: ${act.paymentMethod}`} • Ref: {act.paymentReference}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(act.activatedAt).toLocaleDateString()} → {new Date(act.expiresAt).toLocaleDateString()} ({act.durationMonths} {isArabic ? 'أشهر' : 'months'})
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 shrink-0 self-start md:self-auto">
                        {act.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: Registered devices and account activity */}
          {activeTab === 10 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-300">
                    {isArabic ? `الأجهزة المسجلة (${student.registeredDevices.length})` : `Registered Devices (${student.registeredDevices.length})`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isArabic ? 'الحد الأقصى للأجهزة المتزامنة 3 أجهزة لمنع مشاركة الحسابات.' : 'Max 3 concurrent devices per student.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {student.registeredDevices.map(dev => (
                  <div key={dev.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-xl bg-slate-800 text-brand-blue-electric border border-slate-700 shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{dev.deviceName}</h4>
                          {dev.isCurrent && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                              {isArabic ? 'الجهاز الحالي' : 'Active Now'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {dev.os} • {dev.browser} • IP: {dev.ipAddress}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                          Fingerprint: {dev.deviceFingerprint} • Last Active: {new Date(dev.lastActive).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onRevokeDevice(student.id, dev.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors self-end md:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'إلغاء ربط الجهاز' : 'Revoke Device'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Delete Confirmation Overlay */}
        {confirmDelete && onDeleteStudent && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-red-500/40 p-5 space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="font-bold text-white">{isArabic ? 'تأكيد الحذف النهائي' : 'Confirm permanent deletion'}</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isArabic
                  ? `سيتم حذف (${student.fullNameAr || student.fullName}) نهائياً. العملية لا يمكن التراجع عنها وسيتم توثيقها في سجل التدقيق.`
                  : `${student.fullName} will be permanently deleted. This action cannot be undone and will be recorded in the audit log.`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    onDeleteStudent(student);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  {isArabic ? 'حذف نهائي' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isArabic ? `معرف الطالب الداخلي: ${student.id}` : `System ID: ${student.id}`}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            {isArabic ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
