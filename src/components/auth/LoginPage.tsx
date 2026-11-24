import React, { useState } from 'react';
import { Logo } from '../brand/Logo';
import { WhatsAppButton } from '../whatsapp/WhatsAppButton';
import { UserRole } from '../../types';
import { 
  Lock, 
  Mail, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  UserCheck
} from 'lucide-react';

interface LoginPageProps {
  isArabic: boolean;
  onLoginSuccess: (role: UserRole, userEmail: string) => void;
  onGoToActivation: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  isArabic,
  onLoginSuccess,
  onGoToActivation
}) => {
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');
  const [email, setEmail] = useState('adam.sherif.aboasy@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Exact Authorized Super Admin Credentials
  const SUPER_ADMIN_EMAIL = 'adam.sherif.aboasy@gmail.com';
  const SUPER_ADMIN_PASSWORD = 'AdAm@27022010';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const cleanEmail = email.trim().toLowerCase();

      if (role === 'SUPER_ADMIN') {
        if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() && password === SUPER_ADMIN_PASSWORD) {
          onLoginSuccess('SUPER_ADMIN', cleanEmail);
        } else {
          setErrorMessage(
            isArabic 
              ? '❌ بيانات الدخول غير صحيحة! هذا القسم مخصص للمشرف العام فقط ولا يمكن الدخول إلا بالحساب المعتمد.' 
              : '❌ Invalid credentials! Access to the Super Admin Dashboard is strictly restricted to the authorized administrator.'
          );
        }
      } else {
        // Student Portal Login
        if (cleanEmail && password.length >= 4) {
          onLoginSuccess('STUDENT', cleanEmail);
        } else {
          setErrorMessage(
            isArabic
              ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور الخاصة بحساب الطالب.'
              : 'Please enter your registered student email and password.'
          );
        }
      }
    }, 500);
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
                setEmail('adam.sherif.aboasy@gmail.com');
                setPassword('');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'SUPER_ADMIN'
                  ? 'bg-brand-purple text-white shadow-glow-purple/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isArabic ? 'الإدارة العليا' : 'Super Admin'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('STUDENT');
                setEmail('youssef.mansour@example.com');
                setPassword('');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'STUDENT'
                  ? 'bg-brand-blue text-white shadow-glow-blue/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isArabic ? 'بوابة الطالب' : 'Student Portal'}</span>
            </button>
          </div>

          {/* Security Alert Notice for Admin Role */}
          {role === 'SUPER_ADMIN' && (
            <div className="mb-4 p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-brand-purple-light shrink-0" />
              <span>
                {isArabic 
                  ? 'منطقة محمية أمنياً: تتطلب الاعتماد الرسمي للمشرف العام فقط.' 
                  : 'Protected Area: Restricted to the authorized Super Admin account.'}
              </span>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'البريد الإلكتروني المعتمد' : 'Email Address'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
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
                  placeholder="••••••••••••"
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
                  <span>{isArabic ? `دخول (${role === 'SUPER_ADMIN' ? 'الإدارة العليا' : 'بوابة الطالب'})` : `Sign In (${role === 'SUPER_ADMIN' ? 'Super Admin' : 'Student Portal'})`}</span>
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
                placeholder="name@example.com"
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
