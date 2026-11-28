import React, { useState } from 'react';
import { Student } from '../../types';
import { X, KeyRound, ShieldCheck, Send, Check, AlertCircle } from 'lucide-react';
import { sendAdminPasswordReset } from '../../lib/authService';

interface PasswordResetModalProps {
  student: Student;
  isOpen: boolean;
  isArabic: boolean;
  onClose: () => void;
  onLogResetAction: (studentId: string, studentName: string) => void;
}

/**
 * إعادة ضبط كلمة المرور الحقيقية: Firebase بيبعت رسالة رسمية لإيميل الطالب
 * فيها رابط أحادي الاستخدام. التطبيق عمره ما بيشوف ولا بيخزّن كلمة المرور،
 * ومبنسجّل في سجل التدقيق غير بعد نجاح الإرسال فعلاً.
 */
export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  student,
  isOpen,
  isArabic,
  onClose,
  onLogResetAction
}) => {
  // الـ hooks لازم تتنادى قبل أي return شرطي
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    const result = await sendAdminPasswordReset(student.email, isArabic);
    setLoading(false);
    if (result.ok) {
      setSent(true);
      onLogResetAction(student.studentId, student.fullName);
    } else {
      setError(result.error || (isArabic ? 'تعذّر إرسال الرسالة.' : 'Could not send the email.'));
    }
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel max-w-lg w-full rounded-3xl border border-slate-800 shadow-2xl p-6 bg-slate-950 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950 text-brand-purple-light border border-purple-500/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isArabic ? 'إعادة ضبط كلمة المرور' : 'Password Reset'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isArabic ? `حساب الطالب: ${student.fullNameAr || student.fullName}` : `Student: ${student.fullName}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-brand-navy-900/60 border border-brand-blue/30 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-brand-blue-electric">
            <ShieldCheck className="w-4 h-4" />
            <span>{isArabic ? 'رابط رسمي من Firebase' : 'Official Firebase reset link'}</span>
          </div>
          <p className="text-slate-400">
            {isArabic
              ? 'هيوصل الطالب إيميل فيه رابط آمن لتعيين كلمة مرور جديدة. كلمات المرور لا تُعرض ولا تُخزّن في التطبيق.'
              : 'The student receives an email with a secure link to set a new password. Passwords are never shown or stored by the app.'}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex justify-between">
          <span className="text-slate-400">{isArabic ? 'البريد الإلكتروني:' : 'Email:'}</span>
          <span className="text-white font-mono">{student.email}</span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>
              {isArabic
                ? 'تم إرسال رسالة إعادة الضبط إلى بريد الطالب وتسجيل الإجراء.'
                : 'Reset email sent to the student and the action was logged.'}
            </span>
          </div>
        ) : (
          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-brand-purple hover:bg-brand-purple-dark disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>
              {loading
                ? isArabic ? 'جاري الإرسال...' : 'Sending...'
                : isArabic ? 'إرسال رابط إعادة الضبط للبريد' : 'Send reset link by email'}
            </span>
          </button>
        )}

        <div className="pt-2 border-t border-slate-800 flex justify-end">
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
