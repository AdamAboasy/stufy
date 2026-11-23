import React, { useState } from 'react';
import { Logo } from '../brand/Logo';
import { WhatsAppButton } from '../whatsapp/WhatsAppButton';
import { UserRole } from '../../types';
import { Lock, Mail, ShieldCheck, KeyRound, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
  isArabic: boolean;
  onLoginSuccess: (role: UserRole) => void;
  onGoToActivation: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  isArabic,
  onLoginSuccess,
  onGoToActivation
}) => {
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');
  const [email, setEmail] = useState('admin@smartstudyplanner.app');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(role);
    }, 600);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setShowForgotModal(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Background Decorative Auras */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-brand-blue/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-brand-purple/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-2">
        <Logo variant="main" size="sm" isArabic={isArabic} />
        <button
          onClick={onGoToActivation}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-brand-blue-electric border border-brand-blue/30 transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{isArabic ? 'صفحة تفعيل الأكواد' : 'Activation Code Page'}</span>
        </button>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md mx-auto w-full my-6">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative">
          
          {/* Official Brand Identity Hero on Login Page */}
          <div className="mb-6">
            <Logo variant="login" size={76} isArabic={isArabic} />
          </div>

          {/* Role Switcher Tab */}
          <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('SUPER_ADMIN');
                setEmail('admin@smartstudyplanner.app');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                role === 'SUPER_ADMIN'
                  ? 'bg-brand-purple text-white shadow-glow-purple/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isArabic ? 'الإدارة العليا (Super Admin)' : 'Super Admin'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('STUDENT');
                setEmail('youssef.mansour@example.com');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                role === 'STUDENT'
                  ? 'bg-brand-blue text-white shadow-glow-blue/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isArabic ? 'حساب الطالب' : 'Student Portal'}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-blue-electric text-white text-xs pl-10 rtl:pl-4 rtl:pr-10"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isArabic ? 'كلمة المرور' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-brand-blue-light hover:underline font-medium"
                >
                  {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-blue-electric text-white text-xs pl-10 rtl:pl-4 rtl:pr-10"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-glow-combo active:scale-[0.99] flex items-center justify-center gap-2 ${
                role === 'SUPER_ADMIN'
                  ? 'bg-gradient-to-r from-brand-purple to-purple-800 hover:from-purple-600 hover:to-purple-900'
                  : 'bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:from-blue-600 hover:to-blue-800'
              }`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isArabic ? `تسجيل الدخول (${role === 'SUPER_ADMIN' ? 'الإدارة' : 'الطالب'})` : `Sign In (${role === 'SUPER_ADMIN' ? 'Super Admin' : 'Student'})`}</span>
                </>
              )}
            </button>
          </form>

          {/* WhatsApp Direct Help */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 mb-3">
              {isArabic ? 'تواجه مشكلة في تسجيل الدخول أو تحتاج كود تفعيل؟' : 'Trouble signing in or need an activation code?'}
            </p>
            <WhatsAppButton isArabic={isArabic} variant="pill" customClass="w-full justify-center" />
          </div>

        </div>
      </main>

      {/* Forgot Password Workflow Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {isArabic ? 'استعادة كلمة المرور المشفرة' : 'Secure Password Recovery'}
              </h3>
              <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <p className="text-xs text-slate-400">
              {isArabic 
                ? 'لا نقوم بحفظ كلمات المرور بشكل مقروء نهائياً. أدخل بريدك الإلكتروني وسيصلك رابط مشفر أحادي الاستخدام.'
                : 'Passwords are never stored in plaintext. Enter your email to receive a single-use encrypted reset link.'}
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              />
              {forgotSent ? (
                <div className="p-3 rounded-xl bg-emerald-950 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isArabic ? 'تم إرسال رابط إعادة الضبط لبريدك الإلكتروني بنجاح!' : 'Encrypted reset token dispatched to your email!'}</span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-brand-blue text-white hover:bg-brand-blue-dark"
                >
                  {isArabic ? 'إرسال رابط إعادة الضبط' : 'Send Encrypted Reset Link'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 py-2">
        Smart Study Planner • Official Security Architecture
      </footer>

    </div>
  );
};
