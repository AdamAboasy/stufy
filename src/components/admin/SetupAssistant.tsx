import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getCountFromServer } from 'firebase/firestore';
import { db, auth, COLLECTIONS } from '../../lib/firebase';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, ArrowRight, Rocket } from 'lucide-react';

type CheckState = 'checking' | 'ok' | 'fail';

interface Check {
  key: string;
  labelAr: string;
  labelEn: string;
  state: CheckState;
  hintAr: string;
  hintEn: string;
}

export interface SetupAssistantProps {
  isArabic: boolean;
  studentCount: number;
  codeCount: number;
  /** الانتقال لتاب معيّن */
  onGoToTab: (tab: 'delete_students' | 'code_generator' | 'login') => void;
}

/**
 * مساعد البداية — بيتحقق لحظياً من كل خطوة في التهيئة
 * (Auth مفعّل؟ • بيانات قديمة؟ • أكواد؟ • طلاب؟) وبيقول الخطوة الجاية بالظبط.
 */
export const SetupAssistant: React.FC<SetupAssistantProps> = ({
  isArabic,
  studentCount,
  codeCount,
  onGoToTab
}) => {
  const [authState, setAuthState] = useState<CheckState>('checking');
  const [bootstrapOpen, setBootstrapOpen] = useState<CheckState>('checking');
  const [studentsOnServer, setStudentsOnServer] = useState<number | null>(null);
  const [codesOnServer, setCodesOnServer] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 1) هل Email/Password مفعّل؟ بنستخدم createAuthUri (مش بينشئ حساب)
    const checkAuth = async () => {
      const email = auth.currentUser?.email || 'probe@example.com';
      try {
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBTCE6LNQSjCm9-K31iR-SDguJI1ytDkK8'}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: email, continueUri: location.origin })
          }
        );
        const data = await res.json();
        if (cancelled) return;
        const methods: string[] = data?.signinMethods || [];
        // لو مفيش provider للإيميل/باسورد، ممكن يكون مقفول أو الحساب مش موجود
        if (data?.error?.message === 'OPERATION_NOT_ALLOWED') setAuthState('fail');
        else if (methods.length === 0 || methods.includes('password')) setAuthState('ok');
        else setAuthState('ok');
      } catch {
        if (!cancelled) setAuthState('fail');
      }
    };

    // 2) هل نافذة التهيئة مفتوحة؟ (وجود appMeta/bootstrap = مقفولة)
    const checkBootstrap = async () => {
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.meta, 'bootstrap'));
        if (!cancelled) setBootstrapOpen(snap.exists() ? 'ok' : 'fail');
      } catch {
        if (!cancelled) setBootstrapOpen('fail');
      }
    };

    // 3) عدّ الكيانات على السيرفر (مش من الكاش)
    const countServer = async (
      name: string,
      setter: (value: number | null) => void
    ) => {
      try {
        const snap = await getCountFromServer(collection(db, name));
        if (!cancelled) setter(snap.data().count);
      } catch {
        if (!cancelled) setter(null);
      }
    };

    checkAuth();
    checkBootstrap();
    countServer(COLLECTIONS.students, setStudentsOnServer);
    countServer(COLLECTIONS.activationCodes, setCodesOnServer);

    return () => {
      cancelled = true;
    };
  }, []);

  const hasOldData = (studentsOnServer ?? 0) > 0 || (codesOnServer ?? 0) > 0;
  const hasCodes = codeCount > 0 || (codesOnServer ?? 0) > 0;
  const hasStudents = studentCount > 0 || (studentsOnServer ?? 0) > 0;

  const checks: Check[] = [
    {
      key: 'auth',
      labelAr: 'تسجيل الدخول بالإيميل مفعّل في Firebase',
      labelEn: 'Email/Password sign-in is enabled',
      state: authState,
      hintAr: 'Console → Authentication → Sign-in method → Email/Password → Enable',
      hintEn: 'Console → Authentication → Sign-in method → Email/Password → Enable'
    },
    {
      key: 'clean',
      labelAr: 'قاعدة البيانات نضيفة (مفيش بيانات قديمة)',
      labelEn: 'Database is clean (no old data)',
      state: studentsOnServer === null ? 'checking' : hasOldData ? 'fail' : 'ok',
      hintAr: `طلاب على السيرفر: ${studentsOnServer ?? '؟'} • أكواد: ${codesOnServer ?? '؟'} — استخدم «تصفير شامل» لو عايز تبدأ نضيف.`,
      hintEn: `Students on server: ${studentsOnServer ?? '?'} • codes: ${codesOnServer ?? '?'} — use “Full reset” to start clean.`
    },
    {
      key: 'codes',
      labelAr: 'فيه كود تفعيل جاهز للطالب',
      labelEn: 'An activation code is ready',
      state: codesOnServer === null && codeCount === 0 ? 'checking' : hasCodes ? 'ok' : 'fail',
      hintAr: 'تاب «أكواد التفعيل» → اعمل كود جديد وابعته للطالب.',
      hintEn: 'Codes tab → generate a code and send it to the student.'
    },
    {
      key: 'student',
      labelAr: 'أول طالب سجّل وظاهر عندك',
      labelEn: 'The first student registered',
      state: studentsOnServer === null && studentCount === 0 ? 'checking' : hasStudents ? 'ok' : 'fail',
      hintAr: 'سجّل طالب من «بوابة الطلاب» بالكود، وهتلاقيه هنا فوراً.',
      hintEn: 'Register a student from the student portal with the code.'
    }
  ];

  const doneCount = checks.filter(c => c.state === 'ok').length;
  const allDone = doneCount === checks.length;

  if (dismissed && allDone) return null;

  const Icon = ({ state }: { state: CheckState }) => {
    if (state === 'checking') return <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />;
    if (state === 'ok') return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
  };

  return (
    <div className="rounded-2xl border border-brand-blue/30 bg-slate-900/70 p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-blue/20 text-brand-blue-electric">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">
              {isArabic ? 'ابدأ من هنا — 4 خطوات للتشغيل' : 'Start here — 4 steps to go live'}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {doneCount}/{checks.length} {isArabic ? 'مكتملة' : 'done'}
            </p>
          </div>
        </div>
        {allDone && (
          <button
            onClick={() => setDismissed(true)}
            className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800"
          >
            {isArabic ? 'إخفاء' : 'Hide'}
          </button>
        )}
      </div>

      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full transition-all ${allDone ? 'bg-emerald-500' : 'bg-brand-blue'}`}
          style={{ width: `${(doneCount / checks.length) * 100}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {checks.map(check => (
          <div
            key={check.key}
            className={`rounded-xl p-2.5 border ${
              check.state === 'ok'
                ? 'bg-emerald-950/20 border-emerald-500/25'
                : check.state === 'fail'
                ? 'bg-red-950/20 border-red-500/25'
                : 'bg-slate-950/40 border-slate-800'
            }`}
          >
            <div className="flex items-start gap-2">
              <Icon state={check.state} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-100 leading-snug">
                  {isArabic ? check.labelAr : check.labelEn}
                </p>
                {check.state !== 'ok' && (
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                    {isArabic ? check.hintAr : check.hintEn}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {!hasOldData && !hasCodes && (
          <button
            onClick={() => onGoToTab('code_generator')}
            className="flex-1 min-w-[130px] py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white text-[11px] font-bold flex items-center justify-center gap-1.5"
          >
            {isArabic ? 'اعمل كود تفعيل' : 'Create a code'}
            {isArabic ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        )}
        {hasOldData && (
          <button
            onClick={() => onGoToTab('delete_students')}
            className="flex-1 min-w-[130px] py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold"
          >
            {isArabic ? 'تصفير شامل' : 'Full reset'}
          </button>
        )}
        {!hasStudents && hasCodes && (
          <button
            onClick={() => onGoToTab('login')}
            className="flex-1 min-w-[130px] py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold"
          >
            {isArabic ? 'بوابة الطلاب للتسجيل' : 'Student portal'}
          </button>
        )}
      </div>
    </div>
  );
};
