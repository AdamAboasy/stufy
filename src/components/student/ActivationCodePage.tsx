import React, { useState } from 'react';
import { Logo } from '../brand/Logo';
import { WhatsAppButton } from '../whatsapp/WhatsAppButton';
import { KeyRound, ShieldCheck, Sparkles, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface ActivationCodePageProps {
  isArabic: boolean;
  onActivateSuccess?: (code: string) => void;
  onBackToDashboard?: () => void;
}

export const ActivationCodePage: React.FC<ActivationCodePageProps> = ({
  isArabic,
  onActivateSuccess,
  onBackToDashboard
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError(isArabic ? 'يرجى إدخال كود التفعيل أولاً' : 'Please enter an activation code');
      return;
    }

    if (cleanCode.length < 8) {
      setError(isArabic ? 'كود التفعيل غير صالح، تأكد من كتابته بشكل صحيح' : 'Invalid code format. Please check and try again.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      if (cleanCode.startsWith('SSP-') || cleanCode.includes('2026') || cleanCode.length >= 10) {
        setSuccess(
          isArabic 
            ? 'تم تفعيل باقة الاشتراك بنجاح! تم تفعيل خطة المذاكرة ومزامنة المواد الدراسية.' 
            : 'Activation successful! Your study plan and syllabus have been unlocked.'
        );
        if (onActivateSuccess) {
          onActivateSuccess(cleanCode);
        }
      } else {
        setError(
          isArabic 
            ? 'هذا الكود غير مسجل أو منتهي الصلاحية. تواصل مع الدعم الفني على واتساب للحصول على كود صالح.' 
            : 'This code is unrecognized or expired. Please contact support on WhatsApp to obtain a valid code.'
        );
      }
    }, 900);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-brand-purple/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80">
        <Logo variant="main" size="md" isArabic={isArabic} />
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors"
          >
            {isArabic ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isArabic ? 'العودة للرئيسية' : 'Back to Dashboard'}</span>
          </button>
        )}
      </header>

      {/* Main Activation Container */}
      <main className="max-w-3xl mx-auto w-full my-8">
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative">
          
          {/* Card Header */}
          <div className="text-center max-w-lg mx-auto mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple text-white mb-4 shadow-glow-combo">
              <KeyRound className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isArabic ? 'تفعيل حساب الطالب واشتراك الباقة' : 'Activate Your Student Account'}
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              {isArabic 
                ? 'أدخل كود التفعيل المخصص لك لفتح جدول المذاكرة الذكي، وتحليل الكتب بصيغة PDF، وخطة المراجعة النهائية.'
                : 'Enter your exclusive activation code to unlock AI study schedules, PDF book analysis, and final revision planners.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleActivate} className="max-w-xl mx-auto space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                {isArabic ? 'رمز / كود التفعيل' : 'Activation Code'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={isArabic ? 'مثال: SSP-PRO-9842-CAIR' : 'e.g. SSP-PRO-9842-CAIR'}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-900/90 border-2 border-slate-700 focus:border-brand-blue-electric focus:ring-4 focus:ring-brand-blue-electric/20 text-white placeholder-slate-500 font-mono text-center text-lg tracking-wider transition-all"
                  dir="ltr"
                />
                <div className="absolute inset-y-0 right-4 rtl:right-auto rtl:left-4 flex items-center pointer-events-none text-slate-500">
                  <ShieldCheck className="w-6 h-6 text-brand-blue-light" />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-base text-white bg-gradient-to-r from-brand-blue to-brand-purple hover:from-brand-blue-dark hover:to-brand-purple-dark transition-all duration-300 shadow-glow-combo active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{isArabic ? 'تأكيد وتفعيل الحساب الآن' : 'Verify & Activate Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* HIGHLY VISIBLE WHATSAPP ACTIVATION SECTION */}
          <div className="mt-10 pt-8 border-t border-slate-800/80">
            <div className="bg-slate-900/80 rounded-2xl p-6 border border-brand-whatsapp/30 flex flex-col items-center text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-whatsapp/20 text-emerald-400 border border-brand-whatsapp/40 mb-3">
                <HelpCircle className="w-3.5 h-3.5 mr-1 rtl:mr-0 rtl:ml-1" />
                {isArabic ? 'مساعدة فورية 24/7' : 'Instant 24/7 Help'}
              </span>

              <h3 className="text-lg font-bold text-white mb-1">
                {isArabic ? 'معندكش كود تفعيل حتى الآن؟' : "Don't have an activation code yet?"}
              </h3>
              <p className="text-sm text-slate-300 max-w-md mb-5">
                {isArabic
                  ? 'تقدر تتواصل مباشرة مع فريق الدعم الفني وتستلم كودك في خلال دقائق عبر واتساب للاشتراك في الباقات الشهرية أو السنوية.'
                  : 'You can directly contact our support team on WhatsApp to get your code within minutes for monthly or annual plans.'}
              </p>

              {/* Required High Visibility Official WhatsApp Button */}
              <div className="w-full sm:w-auto">
                <WhatsAppButton isArabic={isArabic} variant="prominent" />
              </div>
            </div>
          </div>

          {/* Plans Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isArabic ? 'الباقة الأساسية' : 'Basic Plan'}</span>
              <div className="text-lg font-bold text-white mt-1">100 EGP / {isArabic ? 'شهرياً' : 'mo'}</div>
              <p className="text-xs text-slate-400 mt-1">{isArabic ? 'مادتين دراسيتين + خطة أسبوعية' : '2 Subjects + Weekly Plan'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-brand-navy-800/60 border border-brand-blue/30 text-center shadow-glow-blue/20">
              <span className="text-xs font-bold text-brand-blue-electric uppercase tracking-wider">{isArabic ? 'باقة برو (الأكثر طلباً)' : 'Pro Plan (Popular)'}</span>
              <div className="text-lg font-bold text-white mt-1">250 EGP / {isArabic ? 'شهرياً' : 'mo'}</div>
              <p className="text-xs text-slate-300 mt-1">{isArabic ? 'جميع المواد + تحليل PDF ذكي' : 'All Subjects + Smart PDF AI'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-purple-500/30 text-center shadow-glow-purple/20">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">{isArabic ? 'باقة النخبة VIP' : 'Elite VIP'}</span>
              <div className="text-lg font-bold text-white mt-1">1800 EGP / {isArabic ? 'سنوياً' : 'yr'}</div>
              <p className="text-xs text-slate-300 mt-1">{isArabic ? 'معسكر المراجعة الشامل + دعم مباشر' : 'Full Exam Blitz + Mentorship'}</p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 py-4 border-t border-slate-800/60">
        © 2026 Smart Study Planner (مخطط الدراسة الذكي). All rights reserved.
      </footer>
    </div>
  );
};
