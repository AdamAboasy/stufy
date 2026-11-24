import React, { useState } from 'react';
import { Logo } from '../brand/Logo';
import { WhatsAppButton } from '../whatsapp/WhatsAppButton';
import { UserRole, GeneratedActivationCode, EDUCATION_STAGES, Gender } from '../../types';
import { isValidPhone, normalizePhone } from '../../utils/validators';
import { 
  Lock, 
  Mail, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  ShieldAlert,
  UserCheck,
  User,
  Phone,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export interface LoginPageProps {
  isArabic: boolean;
  activeCodes?: GeneratedActivationCode[];
  onLoginSuccess: (role: UserRole, userEmail: string) => { success: boolean; error?: string };
  onRegisterStudent: (data: {
    fullName: string;
    email: string;
    password: string;
    activationCode: string;
    phoneNumber: string;
    gender: Gender;
    educationStage: string;
  }) => { success: boolean; error?: string };
  onGoToActivation: () => void;
  onToggleLanguage?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  isArabic,
  activeCodes = [],
  onLoginSuccess,
  onRegisterStudent,
  onGoToActivation,
  onToggleLanguage
}) => {
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [studentAuthMode, setStudentAuthMode] = useState<'register' | 'signin'>('register');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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
    setSuccessMessage(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const cleanEmail = email.trim().toLowerCase();

      // CASE 1: SUPER ADMIN LOGIN
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
        return;
      }

      // CASE 2: STUDENT PORTAL - REGISTER WITH ACTIVATION CODE
      if (studentAuthMode === 'register') {
        if (!fullName.trim()) {
          setErrorMessage(isArabic ? 'يرجى كتابة الاسم بالكامل للطالب.' : 'Please enter the student full name.');
          return;
        }

        if (!cleanEmail || !cleanEmail.includes('@')) {
          setErrorMessage(isArabic ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
          return;
        }

        if (password.length < 4) {
          setErrorMessage(isArabic ? 'كلمة المرور يجب أن لا تقل عن 4 خانات.' : 'Password must be at least 4 characters.');
          return;
        }

        if (!isValidPhone(phone)) {
          setErrorMessage(isArabic ? 'اكتب رقم تليفون صحيح (أرقام فقط، مثال: 01012345678).' : 'Please enter a valid phone number.');
          return;
        }

        if (!stage) {
          setErrorMessage(isArabic ? 'اختر المرحلة الدراسية.' : 'Please choose your education stage.');
          return;
        }

        if (!gender) {
          setErrorMessage(isArabic ? 'اختر النوع (ذكر أو أنثى).' : 'Please choose your gender.');
          return;
        }

        const cleanCode = activationCode.trim().toUpperCase();
        if (!cleanCode) {
          setErrorMessage(isArabic ? 'يرجى إدخال كود التفعيل لتفعيل حسابك.' : 'Please enter your activation code to unlock your account.');
          return;
        }

        // Call parent register handler
        const result = onRegisterStudent({
          fullName: fullName.trim(),
          email: cleanEmail,
          password,
          activationCode: cleanCode,
          phoneNumber: normalizePhone(phone),
          gender,
          educationStage: stage
        });

        if (!result.success) {
          setErrorMessage(result.error || (isArabic ? 'كود التفعيل غير صالح.' : 'Invalid activation code.'));
        } else {
          setSuccessMessage(
            isArabic 
              ? '🎉 تم تفعيل الكود وإنشاء الحساب بنجاح! جاري توجيهك إلى صفحتك الرئيسية...' 
              : '🎉 Account activated successfully! Redirecting to your home page...'
          );
        }
        return;
      }

      // CASE 3: STUDENT PORTAL - SIGN IN
      if (studentAuthMode === 'signin') {
        if (cleanEmail && password.length >= 4) {
          const result = onLoginSuccess('STUDENT', cleanEmail);
          if (!result.success) {
            setErrorMessage(result.error || (isArabic ? 'تعذر تسجيل الدخول.' : 'Could not sign in.'));
          }
        } else {
          setErrorMessage(
            isArabic
              ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور المسجلة الخاصة بحساب الطالب.'
              : 'Please enter your registered student email and password.'
          );
        }
      }
    }, 450);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setShowForgotModal(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Background Decorative Auras */}
      <div className="absolute -top-32 -right-32 w-[550px] h-[550px] bg-brand-blue/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[550px] h-[550px] bg-brand-purple/15 rounded-full blur-[110px] pointer-events-none" />

      {/* Top Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-2 border-b border-slate-800/60 pb-4">
        <Logo variant="main" size="md" isArabic={isArabic} />
        
        <div className="flex items-center gap-2">
          {onToggleLanguage && (
            <button
              onClick={onToggleLanguage}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              {isArabic ? 'English' : 'عربي'}
            </button>
          )}

          <button
            onClick={onGoToActivation}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-brand-blue-electric border border-brand-blue/30 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isArabic ? 'صفحة التفعيل' : 'Code Activation'}</span>
          </button>
        </div>
      </header>

      {/* Main Login / Registration Card */}
      <main className="max-w-md mx-auto w-full my-6">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative">
          
          {/* Official Brand Identity Hero on Login Page */}
          <div className="mb-6">
            <Logo variant="login" size={72} isArabic={isArabic} />
          </div>

          {/* Role Switcher: Student Portal vs Super Admin */}
          <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setRole('STUDENT');
                setEmail('');
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
              <span>{isArabic ? 'بوابة الطلاب' : 'Student Portal'}</span>
            </button>

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
          </div>

          {/* Student Sub-Tabs: Register (Name + Email + Password + Code) vs Sign In */}
          {role === 'STUDENT' && (
            <div className="grid grid-cols-2 gap-2 mb-5 p-1 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setStudentAuthMode('register');
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  studentAuthMode === 'register'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-blue-electric" />
                <span>{isArabic ? 'إنشاء حساب جديد وتفعيل' : 'Register & Activate'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudentAuthMode('signin');
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  studentAuthMode === 'signin'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تسجيل دخول مسجل' : 'Sign In'}</span>
              </button>
            </div>
          )}

          {/* Security Alert Notice for Super Admin Role */}
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

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Field 1: Full Name (Student Register Mode Only) */}
            {role === 'STUDENT' && studentAuthMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isArabic ? 'اسم الطالب بالكامل' : 'Full Student Name'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isArabic ? 'مثال: يوسف أحمد منصور' : 'e.g., Youssef Ahmed'}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-blue-electric text-white text-sm pl-10 rtl:pl-4 rtl:pr-10"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute top-3 left-3.5 rtl:left-auto rtl:right-3.5" />
                </div>
              </div>
            )}

            {/* Field: Phone, Education stage, Gender (Student Register Mode Only) */}
            {role === 'STUDENT' && studentAuthMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isArabic ? 'رقم التليفون' : 'Phone Number'}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01012345678"
                      dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-blue-electric text-white text-sm pl-10 rtl:pl-4 rtl:pr-10 rtl:text-right"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isArabic ? 'المرحلة الدراسية' : 'Education Stage'}
                  </label>
                  <select
                    required
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-blue-electric text-white text-sm"
                  >
                    <option value="">{isArabic ? '— اختر مرحلتك —' : '— Choose your stage —'}</option>
                    {EDUCATION_STAGES.map(s => (
                      <option key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isArabic ? 'النوع' : 'Gender'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['male', isArabic ? 'ذكر' : 'Male'],
                      ['female', isArabic ? 'أنثى' : 'Female']
                    ] as Array<[Gender, string]>).map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setGender(value)}
                        className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                          gender === value
                            ? 'bg-brand-blue text-white border-brand-blue'
                            : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-brand-blue/60'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Field 2: Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {role === 'SUPER_ADMIN' 
                  ? (isArabic ? 'البريد الإلكتروني المعتمد للمشرف' : 'Authorized Admin Email')
                  : (isArabic ? 'البريد الإلكتروني للطالب' : 'Student Email Address')}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-blue-electric text-white text-sm pl-10 rtl:pl-4 rtl:pr-10"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute top-3 left-3.5 rtl:left-auto rtl:right-3.5" />
              </div>
            </div>

            {/* Field 3: Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  {isArabic ? 'كلمة المرور' : 'Password'}
                </label>
                {studentAuthMode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-brand-blue-light hover:underline font-medium"
                  >
                    {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-brand-blue-electric text-white text-sm pl-10 rtl:pl-4 rtl:pr-10"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute top-3 left-3.5 rtl:left-auto rtl:right-3.5" />
              </div>
            </div>

            {/* Field 4: Activation Code (Student Register Mode Only) */}
            {role === 'STUDENT' && studentAuthMode === 'register' && (
              <div className="p-3 rounded-2xl bg-brand-blue/10 border border-brand-blue/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-brand-blue-electric flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'كود التفعيل (Activation Code)' : 'Activation Code'}</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isArabic ? 'إلزامي لتفعيل الحساب' : 'Required'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                    placeholder="SSP-PRO-2026-XXXX"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-brand-blue/40 focus:border-brand-blue-electric text-white font-mono text-xs pl-10 rtl:pl-4 rtl:pr-10 uppercase tracking-wider"
                  />
                  <KeyRound className="w-4 h-4 text-brand-blue-light absolute top-3 left-3.5 rtl:left-auto rtl:right-3.5" />
                </div>
                <p className="text-[11px] text-slate-400">
                  {isArabic 
                    ? 'أدخل كود الاشتراك الذي حصلت عليه لتفعيل خطتك الدراسية ومزامنة المناهج.' 
                    : 'Enter your voucher code to activate your syllabus and personalized schedule.'}
                </p>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-glow-combo active:scale-[0.99] flex items-center justify-center gap-2 mt-4 ${
                role === 'SUPER_ADMIN'
                  ? 'bg-gradient-to-r from-brand-purple to-purple-800 hover:from-purple-600 hover:to-purple-900 shadow-glow-purple/40'
                  : 'bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:from-blue-600 hover:to-blue-800 shadow-glow-blue/40'
              }`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : role === 'SUPER_ADMIN' ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isArabic ? 'دخول لوحة المشرف العام' : 'Sign In as Super Admin'}</span>
                </>
              ) : studentAuthMode === 'register' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isArabic ? 'تفعيل الكود والدخول للصفحة الرئيسية' : 'Activate Code & Enter Home Page'}</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>{isArabic ? 'تسجيل الدخول إلى حسابي' : 'Sign In to My Account'}</span>
                </>
              )}
            </button>
          </form>

          {/* WhatsApp Direct Help */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400 mb-2.5">
              {isArabic ? 'معندكش كود تفعيل؟ تواصل معانا على واتساب فوراً' : "Don't have an activation code? Contact us on WhatsApp"}
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
