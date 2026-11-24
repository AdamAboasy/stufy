import React, { useState } from 'react';
import { Student, SubscriptionPlan, AccountStatus, AuditLog } from '../../types';
import { 
  X, 
  ShieldAlert, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Lock, 
  KeyRound, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface AdminEditModalProps {
  student: Student;
  isOpen: boolean;
  isArabic: boolean;
  onClose: () => void;
  onSave: (updatedStudent: Student, generatedLogs: Omit<AuditLog, 'id' | 'timestamp'>[]) => void;
  canManageAdmins?: boolean; // only the Super Admin may grant / revoke admin access
}

export const AdminEditModal: React.FC<AdminEditModalProps> = ({
  student,
  isOpen,
  isArabic,
  onClose,
  onSave,
  canManageAdmins = false
}) => {
  if (!isOpen) return null;

  // Form State
  const [fullNameAr, setFullNameAr] = useState(student.fullNameAr);
  const [fullName, setFullName] = useState(student.fullName);
  const [phoneNumber, setPhoneNumber] = useState(student.phoneNumber);
  const [guardianPhoneNumber, setGuardianPhoneNumber] = useState(student.guardianPhoneNumber);
  const [academicYearAr, setAcademicYearAr] = useState(student.academicYearAr);
  const [status, setStatus] = useState<AccountStatus>(student.status);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>(student.subscriptionPlan);
  const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState(
    student.subscriptionExpiryDate.split('T')[0]
  );
  const [overallProgress, setOverallProgress] = useState(student.overallProgress);
  const [notes, setNotes] = useState(student.notes || '');
  const [isAdmin, setIsAdmin] = useState<boolean>(!!student.isAdmin);
  
  // Mandatory Reason for Audit Log
  const [adminReason, setAdminReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Compute what actually changed
  const getChanges = () => {
    const changes: { field: string; label: string; oldVal: string; newVal: string }[] = [];

    if (fullNameAr !== student.fullNameAr) {
      changes.push({ field: 'fullNameAr', label: isArabic ? 'الاسم بالعربية' : 'Arabic Name', oldVal: student.fullNameAr, newVal: fullNameAr });
    }
    if (fullName !== student.fullName) {
      changes.push({ field: 'fullName', label: isArabic ? 'الاسم بالإنجليزية' : 'English Name', oldVal: student.fullName, newVal: fullName });
    }
    if (phoneNumber !== student.phoneNumber) {
      changes.push({ field: 'phoneNumber', label: isArabic ? 'رقم هاتف الطالب' : 'Student Phone', oldVal: student.phoneNumber, newVal: phoneNumber });
    }
    if (guardianPhoneNumber !== student.guardianPhoneNumber) {
      changes.push({ field: 'guardianPhoneNumber', label: isArabic ? 'رقم ولي الأمر' : 'Guardian Phone', oldVal: student.guardianPhoneNumber, newVal: guardianPhoneNumber });
    }
    if (status !== student.status) {
      changes.push({ field: 'status', label: isArabic ? 'حالة الحساب' : 'Account Status', oldVal: student.status, newVal: status });
    }
    if (subscriptionPlan !== student.subscriptionPlan) {
      changes.push({ field: 'subscriptionPlan', label: isArabic ? 'خطة الاشتراك' : 'Subscription Plan', oldVal: student.subscriptionPlan, newVal: subscriptionPlan });
    }
    const oldExpiryFormatted = student.subscriptionExpiryDate.split('T')[0];
    if (subscriptionExpiryDate !== oldExpiryFormatted) {
      changes.push({ field: 'subscriptionExpiryDate', label: isArabic ? 'تاريخ انتهاء الاشتراك' : 'Subscription Expiry', oldVal: oldExpiryFormatted, newVal: subscriptionExpiryDate });
    }
    if (overallProgress !== student.overallProgress) {
      changes.push({ field: 'overallProgress', label: isArabic ? 'نسبة التقدم الكلي' : 'Overall Progress', oldVal: `${student.overallProgress}%`, newVal: `${overallProgress}%` });
    }
    if (canManageAdmins && isAdmin !== !!student.isAdmin) {
      changes.push({
        field: 'isAdmin',
        label: isArabic ? 'صلاحية الأدمن' : 'Admin Access',
        oldVal: student.isAdmin ? 'Admin' : 'Regular student',
        newVal: isAdmin ? 'Admin' : 'Regular student'
      });
    }
    if (notes !== (student.notes || '')) {
      changes.push({ field: 'notes', label: isArabic ? 'ملاحظات الإدارة' : 'Admin Notes', oldVal: student.notes || 'None', newVal: notes });
    }

    return changes;
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const changes = getChanges();
    if (changes.length === 0) {
      setValidationError(isArabic ? 'لم تقم بإجراء أي تغييرات على بيانات الطالب.' : 'No modifications detected.');
      return;
    }

    if (!adminReason.trim() || adminReason.trim().length < 5) {
      setValidationError(
        isArabic 
          ? 'يجب إدخال سبب التعديل بوضوح لتوثيقه في سجل التدقيق غير القابل للتعديل (Audit Log).' 
          : 'Please provide a justification note (min 5 characters) for the immutable audit log.'
      );
      return;
    }

    // Trigger confirmation modal
    setShowConfirmation(true);
  };

  const handleConfirmSave = () => {
    const changes = getChanges();
    const generatedLogs: Omit<AuditLog, 'id' | 'timestamp'>[] = changes.map(ch => ({
      adminId: 'ADMIN-SUPER-01',
      adminName: 'Super Admin (Security Authority)',
      targetStudentId: student.studentId,
      studentName: student.fullName,
      actionSource: 'ADMIN',
      changedField: ch.field,
      oldValue: ch.oldVal,
      newValue: ch.newVal,
      reason: adminReason.trim()
    }));

    const updatedStudent: Student = {
      ...student,
      fullNameAr,
      fullName,
      phoneNumber,
      guardianPhoneNumber,
      academicYearAr,
      status,
      subscriptionPlan,
      subscriptionExpiryDate: `${subscriptionExpiryDate}T23:59:59Z`,
      overallProgress: Number(overallProgress),
      notes: notes.trim(),
      isAdmin: canManageAdmins ? isAdmin : !!student.isAdmin
    };

    onSave(updatedStudent, generatedLogs);
    setShowConfirmation(false);
    onClose();
  };

  const changesList = getChanges();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-3xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden bg-slate-950">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isArabic ? 'تعديل بيانات الطالب وصلاحيات الحساب' : 'Edit Student & Academic Parameters'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isArabic ? `الطالب: ${student.fullNameAr} (${student.studentId})` : `Student: ${student.fullName} (${student.studentId})`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleInitialSubmit} className="p-6 space-y-5">
          
          {validationError && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'الاسم بالكامل (بالعربية)' : 'Full Name (Arabic)'}
              </label>
              <input
                type="text"
                value={fullNameAr}
                onChange={(e) => setFullNameAr(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'الاسم بالكامل (بالإنجليزية)' : 'Full Name (English)'}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'رقم هاتف الطالب' : 'Student Phone Number'}
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'رقم هاتف ولي الأمر' : 'Guardian Phone Number'}
              </label>
              <input
                type="text"
                value={guardianPhoneNumber}
                onChange={(e) => setGuardianPhoneNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'حالة الحساب' : 'Account Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AccountStatus)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
              >
                <option value="Active">{isArabic ? 'نشط (Active)' : 'Active'}</option>
                <option value="Suspended">{isArabic ? 'معلّق (Suspended)' : 'Suspended'}</option>
                <option value="Expired">{isArabic ? 'منتهي (Expired)' : 'Expired'}</option>
                <option value="Pending">{isArabic ? 'قيد الانتظار (Pending)' : 'Pending'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'باقة الاشتراك' : 'Subscription Plan'}
              </label>
              <select
                value={subscriptionPlan}
                onChange={(e) => setSubscriptionPlan(e.target.value as SubscriptionPlan)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
              >
                <option value="Free">Free Trial</option>
                <option value="Basic">Basic Plan</option>
                <option value="Pro">Pro Plan</option>
                <option value="Elite VIP">Elite VIP</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'تاريخ انتهاء الاشتراك' : 'Subscription Expiry Date'}
              </label>
              <input
                type="date"
                value={subscriptionExpiryDate}
                onChange={(e) => setSubscriptionExpiryDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'نسبة التقدم الكلي (%)' : 'Overall Progress (%)'}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={overallProgress}
                onChange={(e) => setOverallProgress(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
              />
            </div>
          </div>

          {canManageAdmins && (
            <button
              type="button"
              onClick={() => setIsAdmin(v => !v)}
              className={`w-full p-4 rounded-2xl border flex items-center justify-between gap-3 text-start transition-colors ${
                isAdmin
                  ? 'bg-purple-950/50 border-purple-500/50'
                  : 'bg-slate-900 border-slate-700 hover:border-purple-500/40'
              }`}
            >
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${isAdmin ? 'text-purple-300' : 'text-slate-500'}`} />
                  <span>{isArabic ? 'منح صلاحية أدمن لهذا الطالب' : 'Grant admin access to this student'}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {isArabic
                    ? 'الطالب هيفضل طالب عادي، وهيظهر له زرار "لوحة الإدارة" في صفحته.'
                    : 'He stays a regular student, and an "Admin Panel" button appears on his page.'}
                </div>
              </div>
              <span
                className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${isAdmin ? 'bg-purple-600' : 'bg-slate-700'}`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${isAdmin ? 'left-6' : 'left-1'}`}
                />
              </span>
            </button>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isArabic ? 'ملاحظات الإدارة' : 'Admin Internal Notes'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isArabic ? 'ملاحظات خاصة بمتابعة مستوى الطالب...' : 'Internal notes on student pacing...'}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
            />
          </div>

          {/* Mandatory Audit Reason */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30">
            <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>{isArabic ? 'سبب التعديل (إلزامي لتوثيق سجل التدقيق Immutable Audit Log)' : 'Reason for Modification (Mandatory for Audit Trail)'}</span>
            </label>
            <input
              type="text"
              required
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              placeholder={isArabic ? 'مثال: تمديد الاشتراك لشهر إضافي بناءً على سداد إيصال فودافون كاش' : 'e.g. Extended subscription 1 month upon payment confirmation'}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-amber-500/40 focus:border-amber-400 text-white text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-dark text-white transition-colors shadow-glow-blue flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isArabic ? 'حفظ التعديلات وتوثيق السجل' : 'Save & Log Changes'}</span>
            </button>
          </div>
        </form>

        {/* CONFIRMATION MODAL OVERLAY */}
        {showConfirmation && (
          <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel max-w-lg w-full rounded-3xl p-6 border-2 border-amber-500/50 shadow-2xl space-y-4 bg-slate-900">
              <div className="flex items-center gap-3 text-amber-400">
                <AlertTriangle className="w-8 h-8 shrink-0 animate-bounce" />
                <div>
                  <h4 className="text-base font-bold text-white">
                    {isArabic ? 'تأكيد اعتماد التعديلات على حساب الطالب' : 'Confirm Student Record Modification'}
                  </h4>
                  <p className="text-xs text-amber-300/80">
                    {isArabic ? 'سيتم تسجيل هذه التعديلات في سجل التدقيق الأمني الدائم.' : 'This modification will be permanently logged in the Immutable Audit Log.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 max-h-56 overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isArabic ? 'ملخص التغييرات المطلوبة:' : 'Summary of Changes:'}</div>
                {changesList.map((ch, idx) => (
                  <div key={idx} className="text-xs p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-slate-300">{ch.label}:</span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-red-400 line-through">{ch.oldVal}</span>
                      <span>➔</span>
                      <span className="text-emerald-400 font-bold">{ch.newVal}</span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
                  <span className="font-semibold text-amber-300">{isArabic ? 'سبب التعديل: ' : 'Reason: '}</span>
                  {adminReason}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {isArabic ? 'مراجعة وتعديل' : 'Go Back'}
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-whatsapp flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isArabic ? 'تأكيد وحفظ الآن' : 'Confirm & Write to Audit'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
