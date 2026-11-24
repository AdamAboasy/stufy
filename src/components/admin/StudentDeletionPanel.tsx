import React, { useMemo, useState } from 'react';
import { Student } from '../../types';
import {
  Search,
  Trash2,
  AlertTriangle,
  X,
  Users,
  ShieldAlert,
  GraduationCap,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  CloudOff,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface StudentDeletionPanelProps {
  students: Student[];
  isArabic: boolean;
  /** true لو الحذف بيتم على Firebase فعلاً */
  cloudConnected?: boolean;
  /** رسالة الخطأ الفعلية لما الاتصال يفشل */
  cloudError?: string | null;
  onDeleteStudent: (student: Student) => Promise<unknown> | unknown;
}

/**
 * تاب مخصص للسوبر أدمن لحذف الطلاب
 * Dedicated Super Admin tab to delete student accounts.
 */
export const StudentDeletionPanel: React.FC<StudentDeletionPanelProps> = ({
  students,
  isArabic,
  cloudConnected = false,
  cloudError = null,
  onDeleteStudent
}) => {
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<Student | null>(null);
  const [reason, setReason] = useState('');
  const [typedName, setTypedName] = useState('');
  const [busy, setBusy] = useState(false);
  const [doneName, setDoneName] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      s =>
        s.fullName.toLowerCase().includes(q) ||
        (s.fullNameAr || '').includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        (s.phoneNumber || '').includes(q)
    );
  }, [students, search]);

  const openConfirm = (student: Student) => {
    setTarget(student);
    setReason('');
    setTypedName('');
    setDoneName(null);
  };

  const closeConfirm = () => {
    if (busy) return;
    setTarget(null);
    setReason('');
    setTypedName('');
  };

  const confirmationMatches = target
    ? typedName.trim().length > 1 &&
      (target.fullNameAr || target.fullName).trim().includes(typedName.trim()) &&
      reason.trim().length >= 5
    : false;

  const handleConfirm = async () => {
    if (!target || !confirmationMatches) return;
    setBusy(true);
    const displayName = isArabic ? target.fullNameAr || target.fullName : target.fullName;
    try {
      await onDeleteStudent({ ...target, notes: `[DELETE REASON] ${reason.trim()}` });
      setDoneName(displayName);
      setTarget(null);
    } finally {
      setBusy(false);
      setReason('');
      setTypedName('');
    }
  };

  return (
    <div className="space-y-5">

      {/* Header banner */}
      <div className="glass-panel rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-950/25 via-slate-900/60 to-slate-950 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-red-950 text-red-400 border border-red-500/40 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isArabic ? 'حذف الطلاب وإدارة الحسابات' : 'Delete Students & Account Cleanup'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                {isArabic
                  ? 'منطقة حساسة للسوبر أدمن فقط: اختار الطالب واكتب سبب الحذف، وهيتسجل كل حاجة في سجل التدقيق.'
                  : 'Super Admin only. Pick a student, provide a reason — every deletion is written to the audit trail.'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border shrink-0 ${
              cloudConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
            }`}
          >
            {cloudConnected ? <ShieldCheck className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
            {cloudConnected
              ? (isArabic ? 'Firebase متصل' : 'Firebase connected')
              : (isArabic ? 'وضع محلي (Firebase غير متاح)' : 'Local mode (Firebase offline)')}
          </span>
        </div>

        {!cloudConnected && cloudError && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-100 text-[11px] leading-relaxed">
            <div className="font-bold mb-1">{isArabic ? 'سبب عدم الاتصال:' : 'Connection error:'}</div>
            <span dir="auto">{cloudError}</span>
          </div>
        )}

        {doneName && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {isArabic
                ? `تم حذف حساب (${doneName}) نهائياً وتوثيق العملية في سجل التدقيق.`
                : `(${doneName}) was permanently deleted and the action was logged.`}
            </span>
          </div>
        )}
      </div>


      {/* Rules hint — needed once so Firebase accepts writes/deletes */}
      <details className="glass-panel rounded-2xl border border-slate-800 p-3.5 text-[11px] text-slate-400">
        <summary className="cursor-pointer font-bold text-slate-300">
          {isArabic ? '⚙️ إعداد Firebase (خطوة واحدة قبل الاستخدام)' : '⚙️ Firebase setup (one-time step)'}
        </summary>
        <div className="mt-2.5 space-y-2 leading-relaxed">
          <p>
            {isArabic
              ? 'الحذف والتعديل من التطبيق محتاجين قواعد أمان مناسبة على Firestore و Storage. القواعد موجودة في ملفات المشروع:'
              : 'Deleting/updating from the app requires the security rules shipped in the repo:'}
          </p>
          <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-[10px] font-mono" dir="ltr">{`firebase deploy --only firestore:rules,storage`}</pre>
          <p>
            {isArabic
              ? 'وتأكد إن Firestore و Storage مفعّلين في Firebase Console للمشروع study-managment-45332، وإن دور السوبر أدمن مضبوط كـ Custom Claim: role = SUPER_ADMIN.'
              : 'Also enable Firestore + Storage in the Firebase Console for study-managment-45332 and set the Super Admin custom claim: role = SUPER_ADMIN.'}
          </p>
          <p className="text-amber-300">
            {isArabic
              ? 'ملاحظة: دلوقتي قواعد Firestore الافتراضية (Test mode) بتسمح بالكتابة بس الحذف محتاج القواعد اللي فوق — ولو ظهر «وضع محلي» يبقى القواعد لسه مقفولة والبيانات محفوظة على الجهاز فقط.'
              : 'Note: default test-mode rules allow writes but deleting needs the rules above. If you see “Local mode”, rules are still locked and data stays on this device only.'}
          </p>
        </div>
      </details>

      {/* Search */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute top-3 right-3 rtl:right-3 rtl:left-auto" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={
                isArabic
                  ? 'ابحث بالاسم أو كود الطالب أو الإيميل أو رقم التليفون...'
                  : 'Search by name, student ID, email or phone...'
              }
              className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-red-400/60 text-white text-xs"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              title={isArabic ? 'مسح البحث' : 'Clear search'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2.5 px-1 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {isArabic ? 'عدد الطلاب' : 'Students'}: <span className="font-bold text-white">{filtered.length}</span>
          </span>
          <span>{isArabic ? 'الحذف نهائي ولا يمكن التراجع عنه' : 'Deletion is permanent'}</span>
        </div>
      </div>

      {/* Students list */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="glass-panel rounded-2xl border border-slate-800 p-8 text-center text-slate-500 text-xs">
            {isArabic ? 'مفيش طلاب مطابقين للبحث.' : 'No students match your search.'}
          </div>
        )}

        {filtered.map(student => (
          <div
            key={student.id}
            className="glass-panel rounded-2xl border border-slate-800 p-3.5 flex items-center gap-3 hover:border-red-500/30 transition-colors"
          >
            <img
              src={student.avatarUrl}
              alt={student.fullName}
              className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-white text-sm truncate">
                  {isArabic ? student.fullNameAr || student.fullName : student.fullName}
                </h3>
                {student.isAdmin && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                    {isArabic ? 'أدمن' : 'ADMIN'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400 mt-0.5">
                <span className="font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                  {student.studentId}
                </span>
                <span className="inline-flex items-center gap-1 truncate max-w-[150px]">
                  <Mail className="w-3 h-3" /> {student.email}
                </span>
                <span className="inline-flex items-center gap-1 font-mono" dir="ltr">
                  <Phone className="w-3 h-3" /> {student.phoneNumber}
                </span>
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> {isArabic ? student.academicYearAr : student.academicYear}
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3 h-3" /> {student.uploadedPdfs?.length || 0} {isArabic ? 'كتاب' : 'books'}
                </span>
              </div>
            </div>

            <button
              onClick={() => openConfirm(student)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/40 text-[11px] font-bold shrink-0 active:scale-95 transition-transform"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{isArabic ? 'حذف' : 'Delete'}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation sheet */}
      {target && (
        <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-red-500/40 p-5 space-y-4 max-h-[92vh] overflow-y-auto">

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-red-950 text-red-400 border border-red-500/40 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-base">
                  {isArabic ? 'تأكيد حذف الطالب نهائياً' : 'Confirm permanent deletion'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {isArabic
                    ? 'هيتم حذف الحساب مع كل كتبه وخططه، والملفات هتتشال من Firebase Storage. العملية لا يمكن التراجع عنها.'
                    : 'The account, its books and plans will be removed, and files will be deleted from Firebase Storage. This cannot be undone.'}
                </p>
              </div>
              <button
                onClick={closeConfirm}
                disabled={busy}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Student summary */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <img src={target.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {isArabic ? target.fullNameAr || target.fullName : target.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {target.studentId} • {target.email}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-slate-500">
                {isArabic
                  ? `${target.uploadedPdfs?.length || 0} كتاب • ${target.generatedPlan ? 'خطة مذاكرة مبنية' : 'بدون خطة'}`
                  : `${target.uploadedPdfs?.length || 0} books • ${target.generatedPlan ? 'has a study plan' : 'no plan'}`}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-[11px] font-bold text-amber-300 mb-1">
                {isArabic ? 'سبب الحذف (إلزامي - يُسجَّل في سجل التدقيق)' : 'Reason for deletion (required, logged)'}
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={
                  isArabic ? 'مثال: طلب الطالب حذف حسابه / حساب مكرر' : 'e.g. Student request / duplicate account'
                }
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400/60 text-white text-xs"
              />
            </div>

            {/* Typed confirmation */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {isArabic
                  ? `اكتب اسم الطالب للتأكيد: ${isArabic ? target.fullNameAr || target.fullName : target.fullName}`
                  : `Type the student name to confirm: ${target.fullName}`}
              </label>
              <input
                type="text"
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-red-400/60 text-white text-xs"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button
                onClick={closeConfirm}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold disabled:opacity-40"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={!confirmationMatches || busy}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                {busy ? (
                  <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isArabic ? 'حذف نهائي' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
