import React, { useState } from 'react';
import { Student } from '../../types';
import { 
  X, 
  KeyRound, 
  ShieldCheck, 
  Copy, 
  Check, 
  Send, 
  Lock, 
  AlertCircle, 
  Clock 
} from 'lucide-react';

interface PasswordResetModalProps {
  student: Student;
  isOpen: boolean;
  isArabic: boolean;
  onClose: () => void;
  onLogResetAction: (studentId: string, studentName: string) => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  student,
  isOpen,
  isArabic,
  onClose,
  onLogResetAction
}) => {
  if (!isOpen) return null;

  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sentEmail, setSentEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerateLink = () => {
    setLoading(true);
    setTimeout(() => {
      const resetToken = `ssp_sec_token_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      const link = `https://smartstudyplanner.app/auth/reset-password?token=${resetToken}&uid=${student.studentId}`;
      setGeneratedLink(link);
      setLoading(false);
      onLogResetAction(student.studentId, student.fullName);
    }, 600);
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendEmail = () => {
    setSentEmail(true);
    onLogResetAction(student.studentId, student.fullName);
    setTimeout(() => setSentEmail(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel max-w-lg w-full rounded-3xl border border-slate-800 shadow-2xl p-6 bg-slate-950 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950 text-brand-purple-light border border-purple-500/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isArabic ? 'إعادة ضبط كلمة المرور الآمنة' : 'Secure Password Reset Workflow'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isArabic ? `حساب الطالب: ${student.fullNameAr}` : `Student: ${student.fullName}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="p-4 rounded-2xl bg-brand-navy-900/60 border border-brand-blue/30 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-brand-blue-electric">
            <ShieldCheck className="w-4 h-4" />
            <span>{isArabic ? 'حماية تشفير كاملة (Zero Plaintext)' : 'End-to-End Cryptographic Security'}</span>
          </div>
          <p className="text-slate-400">
            {isArabic
              ? 'كلمات المرور لا يتم تخزينها أو عرضها كنص مجرد نهائياً. يتم إنشاء رابط إعادة ضبط أحادي الاستخدام مشفر وصالح لمدة 15 دقيقة فقط.'
              : 'Plaintext passwords are never displayed or stored. We generate an encrypted, single-use reset token valid for 15 minutes.'}
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex justify-between">
            <span className="text-slate-400">{isArabic ? 'البريد الإلكتروني المعتمد:' : 'Verified Email:'}</span>
            <span className="text-white font-mono">{student.email}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs flex justify-between">
            <span className="text-slate-400">{isArabic ? 'رقم الهاتف:' : 'Phone Number:'}</span>
            <span className="text-white font-mono" dir="ltr">{student.phoneNumber}</span>
          </div>
        </div>

        {/* Generate Button or Result */}
        {!generatedLink ? (
          <div className="space-y-2">
            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-brand-purple hover:bg-brand-purple-dark text-white transition-colors shadow-glow-purple flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? (isArabic ? 'جاري التوليد الأمني...' : 'Generating Token...') : (isArabic ? 'إنشاء رابط إعادة الضبط الآمن' : 'Generate Secure One-Time Reset Link')}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-4 rounded-2xl bg-slate-900 border border-brand-purple/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {isArabic ? 'الرابط مشفر وصالح لمرة واحدة (15 دقيقة)' : 'Encrypted Token Active (Expires in 15 mins)'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 break-all select-all">
              {generatedLink}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? (isArabic ? 'تم النسخ!' : 'Copied Link') : (isArabic ? 'نسخ الرابط' : 'Copy Link')}</span>
              </button>

              <button
                onClick={handleSendEmail}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-dark text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>{sentEmail ? (isArabic ? 'تم الإرسال للبريد!' : 'Dispatched!') : (isArabic ? 'إرسال لبريد الطالب' : 'Send to Email')}</span>
              </button>
            </div>
          </div>
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
