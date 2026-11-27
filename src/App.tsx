import React, { useState, useEffect, useRef } from 'react';
import { Student, AuditLog, ViewTab, UserRole, GeneratedActivationCode, SubscriptionPlan, Gender, GeneratedPlan, StudyProfile } from './types';
import { findAcademicStage } from './data/academicStages';
import { Logo } from './components/brand/Logo';
import { StudentMonitoring } from './components/admin/StudentMonitoring';
import { StudentDeletionPanel } from './components/admin/StudentDeletionPanel';
import { ActivationCodeGenerator } from './components/admin/ActivationCodeGenerator';
import { StudentProfileModal } from './components/admin/StudentProfileModal';
import { AdminEditModal } from './components/admin/AdminEditModal';
import { PasswordResetModal } from './components/admin/PasswordResetModal';
import { AuditLogViewer } from './components/admin/AuditLogViewer';
import { StudentSupportMode } from './components/admin/StudentSupportMode';
import { ActivationCodePage } from './components/student/ActivationCodePage';
import { StudentDashboardView } from './components/student/StudentDashboardView';
import { LoginPage } from './components/auth/LoginPage';
import {
  subscribeStudents,
  subscribeStudentById,
  getStudentById,
  getStudentFromServer,
  fetchStudentsFromServer,
  findStudentByEmail,
  upsertStudent,
  removeStudent,
  verifyDeleted,
  forgetLocalStudent,
  type SyncState
} from './lib/studentsService';
import {
  subscribeActivationCodes,
  saveActivationCode,
  markCodeRedeemed,
  revokeActivationCode,
  getActivationCode,
  redeemCodeAndCreateStudent,
  describeDataError
} from './lib/activationService';

import { subscribeAuditLogs, pushAuditLog } from './lib/auditService';
import { initAnalytics } from './lib/firebase';
import { wipeAllAppData } from './lib/wipeService';
import {
  watchSession,
  adminSignIn,
  adminSignOut,
  sendAdminPasswordReset,
  studentEnsureAccount,
  deleteCurrentAuthUser,
  studentSignIn,
  linkStudentAccount,
  setStudentAdminRole,
  isAdminRole,
  type AppSession
} from './lib/authService';
import { 
  Users, 
  FileCheck2, 
  KeyRound, 
  Globe, 
  LogOut,
  ShieldCheck,
  Home,
  UserX,
  Cloud,
  CloudOff
} from 'lucide-react';

/* ============================================================
   حفظ موضع الصفحة والتبويب عبر الريفريش
   sessionStorage بيتمسح لوحة المتصفح نفسها، فالتطبيق بيرجع
   لنفس الحتة (تبويب + موضع تمرير) بعد الفريش بس — مش بعد إغلاق التبويب.
   ============================================================ */
const UI_STATE_KEY = 'ssp_ui_state';
type SavedUiState = { tab: ViewTab; y: number };
const readSavedUiState = (): SavedUiState | null => {
  try {
    const raw = sessionStorage.getItem(UI_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedUiState;
    return parsed && typeof parsed.tab === 'string' && typeof parsed.y === 'number' ? parsed : null;
  } catch {
    return null;
  }
};

export const App: React.FC = () => {
  // Global App & Language State
  const [isArabic, setIsArabic] = useState<boolean>(true);

  /* ---------- Authentication (Firebase Auth — no passwords in code) ---------- */
  const [session, setSession] = useState<AppSession | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const isAuthenticated = isAdminRole(session?.role);
  const adminEmail = session?.email || '';
  const [currentRole, setCurrentRole] = useState<UserRole>('STUDENT');

  const isSuperAdmin = session?.role === 'SUPER_ADMIN';
  // لوحة الإدارة بتتفتح بالأدوار القادمة من السيرفر فقط (مش من localStorage)
  const canSeeAdminPanel = isAdminRole(session?.role);

  // Active View Tab: Defaults to 'login' if not authenticated as admin
  const [activeTab, setActiveTab] = useState<ViewTab>('login');
  const activeTabRef = useRef<ViewTab>('login');
  const [studentDocLoaded, setStudentDocLoaded] = useState(false);
  // آخر تبويب وموضع تمرير قبل الريفريش (بيتقرا مرة واحدة عند التركيب)
  const savedUiRef = useRef<SavedUiState | null | undefined>(undefined);
  if (savedUiRef.current === undefined) savedUiRef.current = readSavedUiState();
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  /* ============================================================
     DATA LAYER — Firestore is the ONLY source of truth.
     مفيش أي نسخة محلية بتتخلط مع السيرفر: كل الأجهزة تشوف نفس البيانات.
     ============================================================ */
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [sync, setSync] = useState<SyncState>({ status: 'connecting' });
  const cloudConnected = sync.status === 'online';

  // Currently logged-in student session (resolved from the shared DB)
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activationCodes, setActivationCodes] = useState<GeneratedActivationCode[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  // Real-time data from the shared database — للأدمن فقط
  // (قواعد الأمان بتمنع الطالب من قراءة كل الطلاب؛ هو عنده اشتراك على مستنده)
  useEffect(() => {
    initAnalytics();

    if (!isAdminRole(session?.role)) {
      setStudents([]);
      setStudentsLoaded(true);
      return;
    }

    const unsubscribeStudents = subscribeStudents(
      (list, meta) => {
        setStudents(list);
        setStudentsLoaded(true);
        if (meta.fromCache) setSync(prev => ({ ...prev, status: 'connecting' }));
      },
      state => {
        setSync(state);
        if (state.error) setDataError(state.error);
        if (state.status === 'online') setDataError(null);
      }
    );

    // Audit trail (best effort — needs rules to allow reads)
    const unsubscribeAudit = subscribeAuditLogs(
      logs => setAuditLogs(logs),
      error => console.warn('[firebase] audit listener', error)
    );

    // Activation codes (shared, so a code generated here works on any device)
    const unsubscribeCodes = subscribeActivationCodes(
      codes => setActivationCodes(codes),
      error => console.warn('[firebase] codes listener', error)
    );

    return () => {
      unsubscribeStudents();
      unsubscribeAudit();
      unsubscribeCodes();
    };
  }, [session?.uid, session?.role]);

  // ---------- Firebase Auth session ----------
  useEffect(() => {
    const unsubscribe = watchSession(next => {
      setSession(next);
      setAuthReady(true);

      if (!next) {
        // مفيش جلسة ⇒ نرجع صفحة الدخول (إلا لو صفحة التفعيل مفتوحة)
        setActiveTab(prev => (prev === 'activation_page' ? prev : 'login'));
        return;
      }

      // نرجّع آخر تبويب كان مفتوح قبل الريفريش — مع التحقق من الدور
      const isAdmin = isAdminRole(next.role);
      setActiveTab(prev => {
        if (prev !== 'login') return prev; // المستخدم فتح حاجة بنفسه قبل ما الجلسة ترجع
        const saved = savedUiRef.current?.tab;
        let restored: ViewTab | null = null;
        if (saved && saved !== 'login') {
          if (saved === 'activation_page' || saved === 'student_dashboard') {
            restored = saved;
          } else if (saved === 'delete_students') {
            restored = next.role === 'SUPER_ADMIN' ? 'delete_students' : isAdmin ? 'students' : null;
          } else if (isAdmin) {
            restored = saved; // students / code_generator / audit_logs
          }
        }
        return restored || (isAdmin ? 'students' : 'student_dashboard');
      });
    });
    return () => unsubscribe();
  }, []);

  // استرجاع جلسة الطالب: بعد ما Firebase Auth يرجّع المستخدم بنقرأ ملفه هو بس
  useEffect(() => {
    if (!authReady || currentStudent) return;
    if (isAdminRole(session?.role)) return;

    const studentDocId = session?.studentId || session?.uid || localStorage.getItem('ssp_student_id');
    if (!studentDocId) return;

    setStudentDocLoaded(false);
    return subscribeStudentById(
      studentDocId,
      student => {
        if (student) {
          setCurrentStudent(student);
          localStorage.setItem('ssp_student_id', student.id);
        } else {
          setCurrentStudent(null);
          localStorage.removeItem('ssp_student_id');
        }
        setStudentDocLoaded(true);
      },
      error => {
        console.warn('[students] own-document listener', error);
        setStudentDocLoaded(true);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, session?.uid]);

  // مزامنة ملف الطالب مع القائمة الحيّة — للأدمن بس (الطالب عنده اشتراك مباشر)
  useEffect(() => {
    if (!currentStudent || !isAdminRole(session?.role)) return;
    const fresh = students.find(s => s.id === currentStudent.id);
    if (fresh && fresh !== currentStudent) setCurrentStudent(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  // Selected Student & Modals State (Super Admin)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [passwordResetStudent, setPasswordResetStudent] = useState<Student | null>(null);
  const [supportModeStudent, setSupportModeStudent] = useState<Student | null>(null);

  // نحفظ التبويب وموضع التمرير قبل ما الصفحة تقفل (ريفريش/إغلاق)
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(
          UI_STATE_KEY,
          JSON.stringify({ tab: activeTabRef.current, y: window.scrollY } satisfies SavedUiState)
        );
      } catch {
        /* غير متفق — نتجاهل */
      }
    };
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    return () => {
      window.removeEventListener('pagehide', save);
      window.removeEventListener('beforeunload', save);
    };
  }, []);

  // نرجّع موضع التمرير بتاع نفس التبويب بعد الريفريش، ونبتدي من فوق عند أي تبديل
  useEffect(() => {
    const saved = savedUiRef.current;
    const restoreY = saved && saved.tab === activeTab ? saved.y : 0;
    if (restoreY > 0) savedUiRef.current = null; // نستهلكه مرة واحدة
    const tryRestore = () => {
      if (restoreY <= 0) return false;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll < restoreY) return false; // المحتوى لسه قصير (البيانات لسه ما وصلتش)
      window.scrollTo(0, restoreY);
      return window.scrollY >= restoreY - 1;
    };

    const raf = requestAnimationFrame(() => {
      if (restoreY <= 0) window.scrollTo(0, 0);
      else tryRestore();
    });

    // Firestore ممكن يتأخر عن الرسم — بنحاول كذا مرة طول ما المحتوى مقصر
    const timers: number[] = [];
    if (restoreY > 0) {
      [450, 1000, 1800].forEach(ms => {
        timers.push(
          window.setTimeout(() => {
            if (window.scrollY < restoreY - 1) tryRestore();
          }, ms)
        );
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [activeTab]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Toggle Language & Direction
  const toggleLanguage = () => {
    const nextLang = !isArabic;
    setIsArabic(nextLang);
    document.documentElement.dir = nextLang ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang ? 'ar' : 'en';
  };

  // Login Success Handler (Guaranteed Super Admin Authorization & Student Access)
  /** دخول السوبر أدمن عبر Firebase Auth */
  const handleAdminAuthSignIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await adminSignIn(email, password, isArabic);
    if (!result.ok || !result.session) {
      return { success: false, error: result.error };
    }
    setSession(result.session);
    setActiveTab('students');
    showToast(
      isArabic
        ? `تم تسجيل الدخول بنجاح! أهلاً ${result.session.displayName || 'بك'} في لوحة الإدارة.`
        : `Signed in successfully. Welcome ${result.session.displayName || ''}!`
    );
    return { success: true };
  };

  /** إعادة تعيين كلمة مرور حساب الإدارة */
  const handleAdminPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await sendAdminPasswordReset(email, isArabic);
    return { success: result.ok, error: result.error };
  };

  /**
   * تسجيل دخول الطالب: Firebase Auth (إيميل + كلمة سر) ثم قراءة مستند الطالب
   * من قاعدة البيانات المشتركة. مفيش أي دخول بدون كلمة سر صحيحة.
   */
  const handleStudentSignIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const clean = email.trim().toLowerCase();

    const authResult = await studentSignIn(clean, password, isArabic);
    if (!authResult.ok) {
      return { success: false, error: authResult.error };
    }

    // ملف الطالب معرّفه = uid بتاعه، فبنقرأه مباشرة (قواعد الأمان بتسمح له بذلك)
    let matched: Student | null = null;
    const docId = authResult.session?.studentId || authResult.session?.uid;
    if (docId) {
      try {
        matched = await getStudentById(docId);
      } catch {
        matched = null;
      }
    }
    // لو الحساب أدمن طالب: نقدر نبحث بالإيميل كمان
    if (!matched && isAdminRole(authResult.session?.role)) {
      const byEmail = await findStudentByEmail(clean).catch(() => ({ ok: false as const }));
      if (byEmail.ok) matched = byEmail.student || null;
    }

    if (!matched) {
      return {
        success: false,
        error: isArabic
          ? '❌ لا يوجد ملف طالب مرتبط بهذا البريد. تواصل مع الدعم لربط حسابك.'
          : '❌ No student profile is linked to this email. Please contact support.'
      };
    }

    const promoted = !!matched.isAdmin || authResult.session?.role === 'STUDENT_ADMIN';
    setCurrentRole(promoted ? 'STUDENT_ADMIN' : 'STUDENT');
    setCurrentStudent(matched);
    localStorage.setItem('ssp_student_id', matched.id);
    localStorage.setItem('ssp_student_email', clean);
    setActiveTab('student_dashboard');
    showToast(
      isArabic
        ? `أهلاً بك يا ${matched.fullNameAr || matched.fullName}! تم فتح صفحتك الرئيسية.`
        : `Welcome ${matched.fullName}! Launched your home dashboard.`
    );
    return { success: true };
  };

  // Student Registration Handler: Requires Full Name, Email, Password, Activation Code
  const handleRegisterStudent = async (data: {
    fullName: string;
    email: string;
    password: string;
    activationCode: string;
    stage?: string;
    gender?: Gender;
    phoneNumber?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanCode = data.activationCode.trim().toUpperCase();

    // 1) فحص تفرّد الإيميل على ملفات الطلاب — القراءة دي للأدمن فقط.
    //    الزائر (طالب بيسجّل من جهازه) مش بيقدر يقرأ القائمة، فالتحقق بيتأجل
    //    لحساب Firebase Auth (email-already-in-use) وللمعاملة (ملف موجود مسبقاً).
    const byEmail = await findStudentByEmail(data.email);
    if (!byEmail.ok) {
      const code = byEmail.error || 'unknown';
      if (code === 'permission-denied' || code === 'unauthenticated') {
        // تسجيل ذاتي: نكمل — التفرّد هيتفرض في Auth + المعاملة تحت
      } else {
        return {
          success: false,
          error: describeDataError(code, isArabic)
        };
      }
    } else if (byEmail.student) {
      return {
        success: false,
        error: isArabic
          ? '❌ البريد الإلكتروني ده مسجّل بالفعل. جرّب تسجيل الدخول.'
          : '❌ This email is already registered. Try signing in instead.'
      };
    }
    // 2) كود التفعيل: من قاعدة البيانات المشتركة (قراءة واحدة موثوقة)
    const codeResult = await getActivationCode(cleanCode);

    if (!codeResult.ok) {
      // فرق بين «الكود مش موجود» و«مشكلة صلاحيات/شبكة» — عشان الرسالة تبقى صح
      if (codeResult.error === 'permission-denied' || codeResult.error === 'unavailable') {
        return {
          success: false,
          error: describeDataError(codeResult.error, isArabic)
        };
      }
      return {
        success: false,
        error: isArabic
          ? '❌ كود التفعيل غير موجود. تأكد من الكود أو تواصل معنا عبر واتساب.'
          : '❌ This activation code was not found. Check it or contact WhatsApp support.'
      };
    }

    const matchedCode: GeneratedActivationCode | null = codeResult.data || null;

    let plan: SubscriptionPlan = 'Pro';
    let durationMonths = 6;
    let maxDevices = 3;

    if (matchedCode) {
      if (matchedCode.status === 'Redeemed') {
        return {
          success: false,
          error: isArabic ? '❌ هذا الكود تم تفعيله واستخدامه مسبقاً.' : 'This activation code has already been redeemed.'
        };
      }
      if (matchedCode.status === 'Revoked') {
        return {
          success: false,
          error: isArabic ? '❌ هذا الكود تم إلغاؤه من قبل الإدارة.' : 'This activation code has been revoked by admin.'
        };
      }
      plan = matchedCode.plan;
      durationMonths = matchedCode.durationMonths;
      maxDevices = matchedCode.maxDevices;
    } else if (!cleanCode.startsWith('SSP-') && !cleanCode.includes('2026') && cleanCode.length < 6) {
      return {
        success: false,
        error: isArabic 
          ? '❌ كود التفعيل غير صالح. تأكد من إدخال كود صحيح أو تواصل معنا عبر واتساب للحصول على كود جديد.' 
          : 'Invalid activation code. Please check or contact WhatsApp support.'
      };
    }

    // 3) حساب Firebase Auth حقيقي للطالب (كلمة السر مش بتتخزن في Firestore)
    const account = await studentEnsureAccount(data.email, data.password, isArabic);
    if (!account.ok || !account.uid) {
      return {
        success: false,
        error: account.error || (isArabic ? '❌ تعذّر إنشاء حساب الدخول.' : '❌ Could not create the sign-in account.')
      };
    }

    const newStudentId = `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    // معرّف المستند = uid بتاع Auth ⇒ القواعد تقدر تتحقق إن الطالب بيعدّل ملفه هو
    const newStudentInternalId = account.uid;
    const nowIso = new Date().toISOString();
    const expiryDate = new Date(Date.now() + durationMonths * 30 * 24 * 3600 * 1000).toISOString();

    const newStudent: Student = {
      id: newStudentInternalId,
      studentId: newStudentId,
      fullName: data.fullName,
      fullNameAr: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber?.trim() || '+20 100 000 0000',
      guardianPhoneNumber: '',
      nationalId: `304051${Math.floor(10000000 + Math.random() * 90000000)}`,
      gender: data.gender || 'male',
      isAdmin: false,
      avatarUrl:
        data.gender === 'female'
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      academicYear: findAcademicStage(data.stage)?.labelEn || '3rd Secondary (Thanawya)',
      academicYearAr: findAcademicStage(data.stage)?.labelAr || 'الصف الثالث الثانوي',
      // السنة اللي اختارها وقت التسجيل — بيبدأ منها المنهج (ويقدر يغيّرها في الإعداد)
      curriculumStageId: findAcademicStage(data.stage)?.id || 'sec-3',
      studyProfile: null,
      status: 'Active',
      subscriptionPlan: plan,
      registrationDate: nowIso,
      subscriptionExpiryDate: expiryDate,
      lastActivity: nowIso,
      overallProgress: 15,
      notes: `Registered via activation code ${cleanCode}`,
      registeredDevices: [
        {
          id: `dev-${Date.now()}`,
          deviceName: 'متصفح الويب (الجهاز الحالي)',
          deviceType: 'desktop',
          os: 'Windows 11 Pro 64-bit',
          browser: 'Chrome 131.0',
          ipAddress: '197.34.120.45 (Cairo, Egypt)',
          deviceFingerprint: `FP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          lastActive: nowIso,
          isCurrent: true
        }
      ],
      uploadedPdfs: [],
      // مفيش مواد/مهام جاهزة — الخطة بتتبني من كتاب الطالب وموعد الامتحان
      subjects: [],
      studyPreferences: null,
      generatedPlan: null,
      dailyTasks: [],
      studyPlans: [],
      revisionPlanner: {
        targetExamDate: '',
        daysRemaining: 0,
        rounds: [],
        weakPoints: [],
        nextMockExam: ''
      },
      performanceReport: {
        overallScore: 0,
        studyStreakDays: 0,
        totalHoursStudied: 0,
        quizAccuracyPercent: 0,
        averageDailyMinutes: 0,
        subjectMastery: [],
        weeklyActivity: []
      },
      activationHistory: [
        {
          id: `act-${Date.now()}`,
          code: cleanCode,
          plan: plan,
          durationMonths: durationMonths,
          activatedAt: nowIso,
          expiresAt: expiryDate,
          status: 'Active',
          paymentReference: `VOUCHER-${Math.floor(100000 + Math.random() * 900000)}`,
          paymentMethod: 'Activation Code'
        }
      ]
    };

    // 3) الحفظ في قاعدة البيانات: إنشاء الطالب + استهلاك الكود في معاملة واحدة
    const redeem = await redeemCodeAndCreateStudent({
      code: cleanCode,
      studentId: newStudentInternalId,
      studentData: { ...newStudent, ownerUid: newStudentInternalId },
      assignedStudentId: newStudentId,
      assignedStudentName: data.fullName
    });

    if (!redeem.ok) {
      const message =
        redeem.error === 'code-redeemed'
          ? isArabic
            ? '❌ هذا الكود تم استخدامه للتوّ على جهاز تاني.'
            : '❌ This code was just redeemed on another device.'
          : redeem.error === 'code-revoked'
          ? isArabic
            ? '❌ هذا الكود تم إلغاؤه من قبل الإدارة.'
            : '❌ This activation code has been revoked.'
          : redeem.error === 'code-missing'
          ? isArabic
            ? '❌ الكود مش موجود في قاعدة البيانات — تأكد منه أو اطلب كود جديد.'
            : '❌ The code is not in the database — check it or request a new one.'
          : describeDataError(redeem.error || 'unknown', isArabic);

      // تنظيف: لو الحساب اتعمل للتو وفشلت أي خطوة بعده نمسحه فوراً
      // (مفيش مشكلة recent-login بعد الإنشاء مباشرة) — وإن كان حساب قديم
      // (الدخول نجح بنفسه) نكتفي بتسجيل الخروج من غير حذف.
      if (account.created) {
        await deleteCurrentAuthUser().catch(() => undefined);
      } else {
        await adminSignOut().catch(() => undefined);
      }
      return { success: false, error: message };
    }

    setStudents(prev => [newStudent, ...prev.filter(st => st.id !== newStudent.id)]);

    // ربط حساب الدخول بالملف (staff/{uid} = STUDENT + studentId)
    const linked = await linkStudentAccount(account.uid, data.email, newStudentInternalId);
    if (!linked.ok) {
      showToast(
        isArabic
          ? '⚠️ الحساب اتسجل بس تعذّر ربط الدور — جرّب تسجيل الدخول تاني.'
          : '⚠️ Account created but the role link failed — try signing in again.'
      );
    }

    // Add immutable audit log entry
    const newAuditLog: AuditLog = {
      id: `log-reg-${Date.now()}`,
      adminId: 'SYSTEM-AUTH',
      adminName: 'Registration System',
      targetStudentId: newStudentId,
      studentName: data.fullName,
      actionSource: 'STUDENT',
      changedField: 'accountRegistrationAndCodeActivation',
      oldValue: 'Unregistered',
      newValue: `Registered as ${plan} Student with Code ${cleanCode}`,
      reason: `Student successfully registered account and unlocked study plan (${durationMonths} Mo, ${maxDevices} Devices)`,
      timestamp: nowIso
    };
    setAuditLogs(prev => [newAuditLog, ...prev]);
    await pushAuditLog(newAuditLog);

    // Set active student and switch to student dashboard
    setCurrentStudent(newStudent);
    setCurrentRole('STUDENT');
    localStorage.setItem('ssp_student_id', newStudentInternalId);
    localStorage.setItem('ssp_student_email', data.email.trim().toLowerCase());
    setActiveTab('student_dashboard');

    showToast(
      isArabic
        ? `🎉 أهلاً بك يا ${data.fullName}! تم تفعيل كود (${cleanCode}) وفتح صفحتك الرئيسية بنجاح.`
        : `🎉 Welcome ${data.fullName}! Code (${cleanCode}) redeemed and home page opened.`
    );

    return { success: true };
  };

  // Logout Handler (Locks the dashboard)
  const handleLogout = async () => {
    await adminSignOut();
    setSession(null);
    setCurrentRole('STUDENT');
    localStorage.removeItem('ssp_admin_auth');
    localStorage.removeItem('ssp_admin_email');
    localStorage.removeItem('ssp_role');
    localStorage.removeItem('ssp_student_id');
    localStorage.removeItem('ssp_student_email');
    setCurrentStudent(null);
    setActiveTab('login');
    showToast(
      isArabic
        ? 'تم تسجيل الخروج وقفل لوحة الإدارة العليا بنجاح.'
        : 'Logged out and locked the Super Admin session.'
    );
  };

  // Generate Activation Code Handler (Super Admin)
  const handleGenerateCode = async (newCode: GeneratedActivationCode) => {
    const saved = await saveActivationCode(newCode);
    if (!saved.ok) {
      showToast(
        isArabic
          ? `❌ لم يتم حفظ الكود في قاعدة البيانات (${describeDataError(saved.error || 'unknown', isArabic)}) — مفيش كود اتعمل.`
          : `❌ The code was not saved (${describeDataError(saved.error || 'unknown', false)}) — nothing was created.`
      );
      return;
    }
    setActivationCodes(prev => [newCode, ...prev.filter(c => c.id !== newCode.id)]);

    // Log the creation in Audit Trail
    const newAuditLog: AuditLog = {
      id: `log-code-gen-${Date.now()}`,
      adminId: 'ADMIN-SUPER-ADAM',
      adminName: 'Adam Sherif (Super Admin)',
      targetStudentId: newCode.assignedStudentId || 'GENERAL-VOUCHER',
      studentName: newCode.assignedStudentName || 'Unassigned Voucher',
      actionSource: 'ADMIN',
      changedField: 'activationCodeGenerated',
      oldValue: 'None',
      newValue: `Generated Code: ${newCode.code} (${newCode.plan} - ${newCode.durationMonths} Mo)`,
      reason: newCode.notes || 'Super Admin generated new activation voucher code',
      timestamp: new Date().toISOString()
    };

    setAuditLogs(prev => [newAuditLog, ...prev]);
    pushAuditLog(newAuditLog);

    showToast(
      isArabic 
        ? `تم إنشاء كود التفعيل (${newCode.code}) بنجاح وتوثيقه في سجل العمليات!` 
        : `Activation code (${newCode.code}) generated and recorded in audit log!`
    );
  };

  // Revoke Activation Code Handler
  const handleRevokeCode = async (codeId: string) => {
    const result = await revokeActivationCode(codeId);
    if (!result.ok) {
      showToast(
        isArabic
          ? `❌ تعذّر إلغاء الكود (${describeDataError(result.error || 'unknown', isArabic)})`
          : `❌ Could not revoke the code (${describeDataError(result.error || 'unknown', false)})`
      );
      return;
    }
    setActivationCodes(prev => prev.map(c => c.id === codeId ? { ...c, status: 'Revoked' } : c));
    showToast(isArabic ? 'تم إلغاء تفعيل الكود بنجاح.' : 'Code revoked successfully.');
  };

  // Student Redeemed Code Handler: Immediately transitions to Student Home Page
  const handleStudentRedeemCode = async (
    redeemedCodeString: string,
    matchedPlan?: string,
    studentName?: string,
    studentEmail?: string,
    studentPassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanCode = redeemedCodeString.trim().toUpperCase();
    const nowIso = new Date().toISOString();

    // 1) طالب مسجّل بالفعل: بيرقّي باقته الحالية
    if (currentStudent) {
      const expiryIso = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString();
      const updatedStudent: Student = {
        ...currentStudent,
        subscriptionPlan: (matchedPlan as SubscriptionPlan) || 'Pro',
        status: 'Active',
        subscriptionExpiryDate: expiryIso,
        activationHistory: [
          {
            id: `act-${Date.now()}`,
            code: cleanCode,
            plan: (matchedPlan as SubscriptionPlan) || 'Pro',
            durationMonths: 6,
            activatedAt: nowIso,
            expiresAt: expiryIso,
            status: 'Active',
            paymentReference: 'VOUCHER-REDEEM',
            paymentMethod: 'Activation Code'
          },
          ...currentStudent.activationHistory
        ]
      };

      const saved = await upsertStudent(updatedStudent);
      if (!saved.ok) {
        return {
          success: false,
          error: isArabic
            ? `تعذّر حفظ التفعيل في قاعدة البيانات (${saved.error}).`
            : `Could not save the activation (${saved.error}).`
        };
      }
      const marked = await markCodeRedeemed(cleanCode, {
        id: updatedStudent.id,
        studentId: updatedStudent.studentId,
        fullName: updatedStudent.fullName
      });
      if (!marked.ok) {
        showToast(
          isArabic
            ? `⚠️ تم تجديد الباقة بس الكود ما اتعلّمش «مستخدم» (${marked.error}).`
            : `⚠️ Plan renewed but the code was not marked as redeemed (${marked.error}).`
        );
      }
      setStudents(prev => prev.map(s => (s.id === updatedStudent.id ? updatedStudent : s)));
      setCurrentStudent(updatedStudent);
      setActiveTab('student_dashboard');
      return { success: true };
    }

    // 2) طالب جديد: تسجيل كامل بحساب دخول حقيقي
    if (!studentName?.trim() || !studentEmail?.trim() || !studentPassword) {
      return {
        success: false,
        error: isArabic
          ? 'لتفعيل كود جديد محتاج الاسم والبريد وكلمة المرور (أو سجّل من صفحة الدخول).'
          : 'To redeem a new code you need your name, email and password (or register from the login page).'
      };
    }

    const result = await handleRegisterStudent({
      fullName: studentName.trim(),
      email: studentEmail.trim(),
      password: studentPassword,
      activationCode: cleanCode
    });
    if (!result.success) return result;

    setActivationCodes(prev =>
      prev.map(c =>
        c.code.toUpperCase() === cleanCode ? { ...c, status: 'Redeemed', redeemedAt: nowIso } : c
      )
    );
    return { success: true };
  };

  // Admin Save Modifications with Immutable Audit Log Generation
  const handleSaveStudentModifications = async (
    updatedStudent: Student,
    newLogs: Omit<AuditLog, 'id' | 'timestamp'>[]
  ) => {
    // 1) الحفظ في قاعدة البيانات المشتركة الأول (المصدر الوحيد)
    const saved = await upsertStudent(updatedStudent);
    if (!saved.ok) {
      setDataError(describeDataError(saved.error || 'unknown', isArabic));
      showToast(
        isArabic
          ? `❌ لم يتم حفظ التعديلات (${saved.error}) — مفيش أي حاجة اتغيرت.`
          : `❌ Changes were not saved (${saved.error}) — nothing was modified.`
      );
      return { success: false, error: saved.error };
    }

    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (selectedStudent && selectedStudent.id === updatedStudent.id) {
      setSelectedStudent(updatedStudent);
    }
    if (currentStudent && currentStudent.id === updatedStudent.id) {
      setCurrentStudent(updatedStudent);
    }

    const nowIso = new Date().toISOString();
    const finalizedLogs: AuditLog[] = newLogs.map((l, index) => ({
      ...l,
      id: `log-gen-${Date.now()}-${index}`,
      timestamp: nowIso
    }));

    setAuditLogs(prev => [...finalizedLogs, ...prev]);
    // 2) سجل التدقيق بيتحفظ على السيرفر كمان (إضافة فقط)
    finalizedLogs.forEach(log => pushAuditLog(log));

    showToast(
      isArabic
        ? `تم تحديث بيانات الطالب وتوثيق ${newLogs.length} سجل في سجل التدقيق الأمني بنجاح!`
        : `Student updated and ${newLogs.length} event(s) committed to the immutable audit trail!`
    );
    return { success: true };
  };

  // Revoke Device Handler
  const handleRevokeDevice = (studentId: string, deviceId: string) => {
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) return;

    const revokedDevice = targetStudent.registeredDevices.find(d => d.id === deviceId);
    const updatedDevices = targetStudent.registeredDevices.filter(d => d.id !== deviceId);

    const updatedStudent: Student = {
      ...targetStudent,
      registeredDevices: updatedDevices
    };

    setStudents(prev => prev.map(s => s.id === studentId ? updatedStudent : s));
    syncStudentToCloud(updatedStudent);
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent(updatedStudent);
    }
    if (currentStudent && currentStudent.id === studentId) {
      setCurrentStudent(updatedStudent);
    }

    const newAuditLog: AuditLog = {
      id: `log-dev-revoke-${Date.now()}`,
      adminId: 'ADMIN-SUPER-ADAM',
      adminName: 'Adam Sherif (Super Admin)',
      targetStudentId: targetStudent.studentId,
      studentName: targetStudent.fullName,
      actionSource: 'ADMIN',
      changedField: 'registeredDevices (Revocation)',
      oldValue: `${revokedDevice?.deviceName || 'Device'} (Linked)`,
      newValue: 'Device Revoked & Session Terminated',
      reason: 'Admin revoked unauthorized/inactive device session to enforce device concurrency limit',
      timestamp: new Date().toISOString()
    };

    setAuditLogs(prev => [newAuditLog, ...prev]);

    showToast(
      isArabic
        ? `تم إلغاء ربط الجهاز بنجاح وفصل الجلسة وتوثيق العملية في سجل التدقيق.`
        : `Device session revoked and logged in the immutable audit trail.`
    );
  };

  /* ============================================================
     DELETE STUDENT (Super Admin only) + immutable audit entry
     ============================================================ */
  /** Persist a student document to the shared database */
  const syncStudentToCloud = (student: Student) => {
    upsertStudent(student);
  };

  const handleDeleteStudent = async (student: Student) => {
    // 1) حذف من قاعدة البيانات المشتركة الأول — هو المصدر الوحيد
    const result = await removeStudent(student);
    if (!result.ok) {
      setDataError(
        isArabic
          ? `فشل حذف الطالب: ${result.error}. مفيش أي حاجة اتغيرت.`
          : `Delete failed: ${result.error}. Nothing was changed.`
      );
      showToast(
        isArabic
          ? `❌ ماقدرتش أحذف (${student.fullNameAr || student.fullName}): ${result.error}`
          : `❌ Could not delete (${student.fullName}): ${result.error}`
      );
      return;
    }

    // 2) تأكيد فعلي إن المستند اختفى من السيرفر
    const gone = await verifyDeleted(student.id);
    if (!gone) {
      setDataError(
        isArabic
          ? 'السيرفر لسه بيرجّع الطالب بعد الحذف — راجع قواعد Firestore.'
          : 'The server still returns this student after deletion — check Firestore rules.'
      );
      return;
    }

    // 3) تحديث الواجهة بعد نجاح الحذف
    setStudents(prev => prev.filter(s => s.id !== student.id));

    // 4) تنظيف ذاكرة المتصفح القديمة (نسخ ما قبل الربط بالسحابة)
    forgetLocalStudent(student.id);

    if (currentStudent && currentStudent.id === student.id) {
      setCurrentStudent(null);
      localStorage.removeItem('ssp_student_id');
    }
    setSelectedStudent(null);
    setEditingStudent(null);

    const newAuditLog: AuditLog = {
      id: `log-del-${Date.now()}`,
      adminId: 'ADMIN-SUPER-ADAM',
      adminName: 'Adam Sherif (Super Admin)',
      targetStudentId: student.studentId,
      studentName: student.fullName,
      actionSource: 'ADMIN',
      changedField: 'accountDeletion',
      oldValue: `${student.fullNameAr || student.fullName} (${student.email})`,
      newValue: 'Account permanently deleted',
      reason:
        student.notes?.startsWith('[DELETE REASON]')
          ? student.notes.replace('[DELETE REASON]', '').trim()
          : 'Super Admin deleted the student account from the monitoring dashboard',
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newAuditLog, ...prev]);
    pushAuditLog(newAuditLog);

    setDataError(null);
    showToast(
      isArabic
        ? `تم حذف حساب الطالب (${student.fullNameAr || student.fullName}) نهائياً من السحابة وتوثيق العملية.`
        : `Student (${student.fullName}) permanently deleted from the cloud and logged.`
    );
  };

  /* ============================================================
     تصفير النظام (Super Admin only) — بداية نظيفة
     ============================================================ */
  const handleResetAllData = async () => {
    const report = await wipeAllAppData();

    // بيانات الواجهة تتمسح فوراً — مفيش أي نسخة قديمة بتفضل معروضة
    setStudents([]);
    setActivationCodes([]);
    setAuditLogs([]);
    setStudentsLoaded(true);

    const summary = isArabic
      ? `اتحذف: ${Object.entries(report.deleted)
          .map(([key, value]) => `${key} ${value}`)
          .join(' • ')} • حسابك محفوظ`
      : `Deleted: ${Object.entries(report.deleted)
          .map(([key, value]) => `${key} ${value}`)
          .join(' • ')} • your account kept`;

    showToast(
      report.ok
        ? isArabic
          ? '✅ تم حذف كل البيانات — حسابك لسه شغّال ومحدش غيرك يقدر يدخل.'
          : '✅ All data deleted — your account still works and nobody else can sign in.'
        : isArabic
        ? '⚠️ تم الحذف لكن فيه عناصر فشلت — شوف التفاصيل.'
        : '⚠️ Deletion finished but some items failed — see details.'
    );

    return { ok: report.ok, summary, errors: report.errors };
  };

  /* ============================================================
     DELETE A BOOK FROM A STUDENT (Admin) + audit trail
     ============================================================ */
  /* ============================================================
     PROMOTE / DEMOTE STUDENT TO ADMIN (Super Admin only)
     ============================================================ */
  const handleToggleStudentAdmin = async (student: Student) => {
    const promoting = !student.isAdmin;
    const updated: Student = { ...student, isAdmin: promoting };

    // الدور على السيرفر (staff/{uid}) — القواعد بتعتمد عليه
    const roleSynced = await setStudentAdminRole(student.email, student.id, promoting);
    if (!roleSynced) {
      showToast(
        isArabic
          ? '⚠️ تم تحديث الملف لكن تعذّر تحديث دور الحساب في staff — سجّل دخول تاني للطالب.'
          : '⚠️ Profile updated but the account role in staff was not updated — the student must sign in again.'
      );
    }

    setStudents(prev => prev.map(s => (s.id === student.id ? updated : s)));
    syncStudentToCloud(updated);
    if (selectedStudent && selectedStudent.id === student.id) setSelectedStudent(updated);
    if (currentStudent && currentStudent.id === student.id) {
      setCurrentStudent(updated);
      if (!isAuthenticated) {
        setCurrentRole(promoting ? 'STUDENT_ADMIN' : 'STUDENT');
        localStorage.setItem('ssp_role', promoting ? 'STUDENT_ADMIN' : 'STUDENT');
      }
    }

    const newAuditLog: AuditLog = {
      id: `log-role-${Date.now()}`,
      adminId: 'ADMIN-SUPER-ADAM',
      adminName: 'Adam Sherif (Super Admin)',
      targetStudentId: student.studentId,
      studentName: student.fullName,
      actionSource: 'ADMIN',
      changedField: 'role',
      oldValue: student.isAdmin ? 'STUDENT_ADMIN' : 'STUDENT',
      newValue: promoting ? 'STUDENT_ADMIN' : 'STUDENT',
      reason: promoting
        ? 'Super Admin granted admin panel access to this student'
        : 'Super Admin removed admin panel access from this student',
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newAuditLog, ...prev]);
    if (cloudConnected) pushAuditLog(newAuditLog);

    showToast(
      promoting
        ? (isArabic ? `تم ترقية ${student.fullNameAr} ليصبح أدمن ويمكنه رؤية لوحة الإدارة.` : `${student.fullName} promoted to admin.`)
        : (isArabic ? `تم إلغاء صلاحيات الأدمن من ${student.fullNameAr}.` : `Admin access removed from ${student.fullName}.`)
    );
  };

  /* ============================================================
     STUDENT SELF-SERVICE SETTINGS (name / avatar / phone / stage)
     ============================================================ */
  const handleUpdateStudentProfile = async (updated: Student) => {
    // الحفظ على السيرفر الأول — لو فشل مانقولش للطالب إنه اتحفظ
    const saved = await upsertStudent(updated);
    if (!saved.ok) {
      showToast(
        isArabic
          ? `⚠️ تعذّر حفظ التعديلات: ${describeDataError(saved.error || 'unknown', true)}`
          : `⚠️ Could not save your changes: ${describeDataError(saved.error || 'unknown', false)}`
      );
      return;
    }
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    if (currentStudent && currentStudent.id === updated.id) {
      setCurrentStudent(updated);
    }
  };

  /**
   * حفظ إعداد الطالب + الجدول في خطوة واحدة (ملف واحد، كتابة واحدة).
   * السنة + العادات اليومية + الجدول الكامل الموّزع على المنهج.
   */
  const handleSaveSetup = async (profile: StudyProfile, plan: GeneratedPlan, baseStudent?: Student) => {
    const student = baseStudent || currentStudent;
    if (!student) return;

    const daysRemaining = Math.max(
      0,
      Math.round(
        (new Date(`${plan.examDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) /
          (24 * 3600 * 1000)
      )
    );

    const stage = findAcademicStage(profile.stageId);

    const updated: Student = {
      ...student,
      curriculumStageId: profile.stageId,
      academicYear: stage?.labelEn || profile.academicYear,
      academicYearAr: stage?.labelAr || profile.academicYearAr,
      studyProfile: profile,
      generatedPlan: plan,
      studyPreferences: {
        examDate: plan.examDate,
        revisionRounds: plan.revisionRounds,
        dailyMinutes: plan.dailyMinutes,
        daysOff: profile.daysOff,
        stageId: profile.stageId,
        routineNotes: profile.routineNotes,
        subjectIds: profile.subjectIds
      },
      revisionPlanner: {
        targetExamDate: plan.examDate,
        daysRemaining,
        rounds: plan.rounds,
        weakPoints: student.revisionPlanner?.weakPoints || [],
        nextMockExam: plan.sessions.find(s => s.kind === 'mock')?.date || ''
      },
      lastActivity: new Date().toISOString()
    };

    // الحفظ في قاعدة البيانات المشتركة (المصدر الوحيد) قبل تحديث الواجهة
    const saved = await upsertStudent(updated);
    if (!saved.ok) {
      showToast(
        isArabic
          ? `⚠️ تعذّر حفظ الجدول: ${describeDataError(saved.error || 'unknown', true)}`
          : `⚠️ Could not save the schedule: ${describeDataError(saved.error || 'unknown', false)}`
      );
      return;
    }
    // تأكيد فعلي من السيرفر إن الجدول اتحفظ
    const verified = await getStudentFromServer(updated.id);
    if (!verified?.generatedPlan || !verified?.studyProfile) {
      showToast(
        isArabic
          ? '⚠️ السيرفر مارجّعش الجدول بعد الحفظ — جرّب تحديث الصفحة.'
          : '⚠️ The server did not return the schedule after saving — try refreshing.'
      );
    }

    setCurrentStudent(updated);
    setStudents(prev =>
      prev.some(st => st.id === updated.id)
        ? prev.map(st => (st.id === updated.id ? updated : st))
        : prev
    );

    showToast(
      isArabic
        ? 'تم توزيع منهج سنتك على أيامك وبناء الجدول الكامل!'
        : 'Your year’s curriculum was distributed across your days — schedule ready!'
    );
  };

  /** الحفاظ على الواجهة القديمة اللي بتنادي onSavePlan */
  const handleSaveGeneratedPlan = async (plan: GeneratedPlan, baseStudent?: Student) => {
    const student = baseStudent || currentStudent;
    if (!student) return;
    const profile: StudyProfile =
      student.studyProfile || {
        stageId: student.curriculumStageId || 'sec-3',
        academicYear: student.academicYear,
        academicYearAr: student.academicYearAr,
        dailyHours: Math.max(0.5, Math.round((plan.dailyMinutes / 60) * 10) / 10),
        daysOff: student.studyPreferences?.daysOff || [],
        revisionRounds: plan.revisionRounds,
        examDate: plan.examDate,
        subjectIds: student.studyPreferences?.subjectIds || [],
        routineNotes: student.studyPreferences?.routineNotes || '',
        updatedAt: new Date().toISOString()
      };
    await handleSaveSetup(profile, plan, student);
  };

  // Password Reset Log Handler
  const handleLogPasswordReset = (studentId: string, studentName: string) => {
    const newAuditLog: AuditLog = {
      id: `log-pwd-rst-${Date.now()}`,
      adminId: 'ADMIN-SUPER-ADAM',
      adminName: 'Adam Sherif (Super Admin)',
      targetStudentId: studentId,
      studentName: studentName,
      actionSource: 'ADMIN',
      changedField: 'passwordResetWorkflow',
      oldValue: 'Existing Password Hash',
      newValue: 'Generated Single-Use Encrypted Reset Token',
      reason: 'Super Admin initiated secure password reset workflow without exposing plaintext passwords',
      timestamp: new Date().toISOString()
    };

    setAuditLogs(prev => [newAuditLog, ...prev]);

    showToast(
      isArabic
        ? 'تم إنشاء رمز إعادة ضبط كلمة المرور المشفر وتوثيق الإجراء في السجل الأمني.'
        : 'Encrypted password reset token issued and recorded in audit trail.'
    );
  };

  // BOOTSTRAP GATE: بنستنى Firebase Auth يرجّع الجلسة قبل ما نقرر نعرض الدخول
  // (من غير كده الأدمن المسجّل كان هيشوف شاشة الدخول لكل تحميل)
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-4">
        <Logo variant="main" size="md" isArabic={isArabic} />
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span>{isArabic ? 'جاري التحقق من الجلسة...' : 'Verifying your session...'}</span>
        </div>
      </div>
    );
  }

  // ROUTE PROTECTION: Admin views require either the Super Admin session or a student promoted to admin
  const isProtectedAdminTab =
    activeTab === 'students' ||
    activeTab === 'code_generator' ||
    activeTab === 'audit_logs' ||
    activeTab === 'delete_students';

  if (isProtectedAdminTab && !canSeeAdminPanel) {
    return (
      <LoginPage
        isArabic={isArabic}
        activeCodes={activationCodes}
        onStudentSignIn={handleStudentSignIn}
        onAdminAuthSignIn={handleAdminAuthSignIn}
        onAdminPasswordReset={handleAdminPasswordReset}
        onRegisterStudent={handleRegisterStudent}
        onGoToActivation={() => setActiveTab('activation_page')}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  // IF ON LOGIN PAGE:
  if (activeTab === 'login') {
    return (
      <LoginPage
        isArabic={isArabic}
        activeCodes={activationCodes}
        onStudentSignIn={handleStudentSignIn}
        onAdminAuthSignIn={handleAdminAuthSignIn}
        onAdminPasswordReset={handleAdminPasswordReset}
        onRegisterStudent={handleRegisterStudent}
        onGoToActivation={() => setActiveTab('activation_page')}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  // IF IN STUDENT SUPPORT MODE: Render the dedicated isolated support experience
  if (supportModeStudent) {
    return (
      <StudentSupportMode
        student={supportModeStudent}
        isArabic={isArabic}
        onExitSupportMode={() => setSupportModeStudent(null)}
      />
    );
  }

  // IF ON ACTIVATION PAGE:
  if (activeTab === 'activation_page') {
    return (
      <ActivationCodePage
        isArabic={isArabic}
        activeCodes={activationCodes}
        isLoggedIn={!!currentStudent}
        onBackToDashboard={() => setActiveTab(currentStudent ? 'student_dashboard' : canSeeAdminPanel ? 'students' : 'login')}
        onActivateSuccess={handleStudentRedeemCode}
      />
    );
  }

  // IF ON STUDENT DASHBOARD VIEW (الصفحة الرئيسية للطالب):
  if (activeTab === 'student_dashboard') {
    const activeStudentObj = currentStudent || students[0];
    if (!activeStudentObj) {
      // الجلسة رجعت بس ملف الطالب لسه بيتحمّل — مبنعرضش صفحة دخول كأنه خرج
      if (authReady && session && !isAdminRole(session?.role) && !studentDocLoaded) {
        return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-10 h-10 rounded-full border-2 border-brand-blue-electric border-t-transparent animate-spin" />
            <p className="text-xs font-semibold">{isArabic ? 'جاري فتح صفحتك…' : 'Opening your page…'}</p>
          </div>
        );
      }
      return (
        <LoginPage
          isArabic={isArabic}
          activeCodes={activationCodes}
          onStudentSignIn={handleStudentSignIn}
          onAdminAuthSignIn={handleAdminAuthSignIn}
          onAdminPasswordReset={handleAdminPasswordReset}
          onRegisterStudent={handleRegisterStudent}
          onGoToActivation={() => setActiveTab('activation_page')}
          onToggleLanguage={toggleLanguage}
        />
      );
    }
    return (
      <StudentDashboardView
        student={activeStudentObj}
        isArabic={isArabic}
        isAdmin={canSeeAdminPanel}
        onGoToActivation={() => setActiveTab('activation_page')}
        onSwitchToAdmin={() => {
          if (canSeeAdminPanel) {
            setActiveTab('students');
          } else {
            setActiveTab('login');
          }
        }}
        onLogout={async () => {
          if (!isAuthenticated) await adminSignOut();
          setCurrentStudent(null);
          setCurrentRole('STUDENT');
          localStorage.removeItem('ssp_student_id');
          localStorage.removeItem('ssp_role');
          setActiveTab('login');
          showToast(isArabic ? 'تم تسجيل الخروج بنجاح والعودة لصفحة الدخول.' : 'Logged out successfully.');
        }}
        onToggleLanguage={toggleLanguage}
        onUpdateStudent={handleUpdateStudentProfile}
        onSaveSetup={handleSaveSetup}
        onSavePlan={handleSaveGeneratedPlan}
      />
    );
  }

  // DEFAULT: ADMIN DASHBOARD (Super Admin, or student promoted to admin)
  const activeCodesCount = activationCodes.filter(c => c.status === 'Active').length;

  const navItems: { key: ViewTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'students',
      label: isArabic ? 'الطلاب' : 'Students',
      icon: <Users className="w-5 h-5" />
    },
    {
      key: 'code_generator',
      label: isArabic ? 'أكواد التفعيل' : 'Codes',
      icon: <KeyRound className="w-5 h-5" />
    },
    {
      key: 'audit_logs',
      label: isArabic ? 'سجلات التدقيق' : 'Audit Logs',
      icon: <FileCheck2 className="w-5 h-5" />
    },
    ...(isSuperAdmin
      ? [
          {
            key: 'delete_students' as ViewTab,
            label: isArabic ? 'حذف الطلاب' : 'Delete Students',
            icon: <UserX className="w-5 h-5" />
          }
        ]
      : [])
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-blue selection:text-white">

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-1.5rem)] sm:w-auto sm:max-w-lg bg-emerald-900/95 border border-emerald-400/50 text-emerald-100 px-4 sm:px-6 py-3 rounded-2xl shadow-glow-whatsapp text-[11px] sm:text-xs font-bold flex items-center gap-2 text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Top Navigation Bar */}
      <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">

          <Logo
            variant="admin-dash"
            size="sm"
            isArabic={isArabic}
            onClick={() => setActiveTab('students')}
          />

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'students'
                  ? 'bg-brand-blue text-white shadow-glow-blue/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isArabic ? 'مراقبة ومتابعة الطلاب' : 'Student Monitoring'}</span>
            </button>

            <button
              onClick={() => setActiveTab('code_generator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'code_generator'
                  ? 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-glow-combo'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4 text-brand-whatsapp" />
              <span>{isArabic ? 'إنشاء أكواد التفعيل' : 'Code Generator'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                {activeCodesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'audit_logs'
                  ? 'bg-brand-purple text-white shadow-glow-purple/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isArabic ? 'سجلات التدقيق' : 'Audit Logs'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 text-purple-300 border border-purple-500/40">
                {auditLogs.length}
              </span>
            </button>

            {/* Tab 4: Delete Students (Super Admin only) */}
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('delete_students')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'delete_students'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-red-300 hover:bg-red-950/40'
                }`}
              >
                <UserX className="w-4 h-4" />
                <span>{isArabic ? 'حذف الطلاب' : 'Delete Students'}</span>
              </button>
            )}
          </nav>

          {/* Header Tools: language, WhatsApp, identity & logout */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">

            {/* Firebase connection indicator */}
            <span
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-bold border ${
                cloudConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/50 text-amber-300 border-amber-500/40'
              }`}
              title={
                cloudConnected
                  ? (isArabic ? `متصل بقاعدة البيانات المشتركة${sync.total !== undefined ? ` (${sync.total} طالب)` : ''}` : `Connected to the shared database${sync.total !== undefined ? ` (${sync.total} students)` : ''}`)
                  : sync.status === 'connecting'
                  ? (isArabic ? 'جاري الاتصال بقاعدة البيانات...' : 'Connecting to the database...')
                  : (isArabic ? 'غير متصل بقاعدة البيانات — البيانات مش هتتزامن' : 'Database offline — data will not sync')
              }
            >
              {cloudConnected ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
              {sync.status === 'connecting'
                ? (isArabic ? 'جاري الاتصال...' : 'Connecting...')
                : cloudConnected
                ? (isArabic ? 'مزامنة' : 'Synced')
                : (isArabic ? 'غير متصل' : 'Offline')}
            </span>

            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
              title={isArabic ? 'Switch to English' : 'التحويل إلى العربية'}
            >
              <Globe className="w-4 h-4 text-brand-blue-light" />
              <span className="hidden sm:inline">{isArabic ? 'EN' : 'عربي'}</span>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 rtl:pl-0 rtl:pr-1.5 border-l rtl:border-l-0 rtl:border-r border-slate-800">
              <div className="hidden sm:flex flex-col text-right rtl:text-left text-xs">
                <span className="font-bold text-white leading-none">
                  {isSuperAdmin ? 'Adam Sherif' : (isArabic ? currentStudent?.fullNameAr : currentStudent?.fullName) || 'Student Admin'}
                </span>
                <span className="text-[10px] text-purple-400 font-mono mt-0.5 truncate max-w-[140px]" dir="ltr">
                  {isSuperAdmin ? adminEmail : (isArabic ? 'أدمن طالب' : 'Student Admin')}
                </span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-purple-800 flex items-center justify-center font-bold text-xs text-white shadow-glow-purple/20">
                {isSuperAdmin ? 'AS' : (currentStudent?.fullNameAr || currentStudent?.fullName || 'ST').slice(0, 2)}
              </div>

              {/* Back to my student home page */}
              {!isSuperAdmin && (
                <button
                  onClick={() => setActiveTab('student_dashboard')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title={isArabic ? 'العودة لصفحتي' : 'Back to my page'}
                >
                  <Home className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                title={isArabic ? 'تسجيل الخروج وقفل اللوحة' : 'Lock & Sign Out'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Body Content (padding bottom so the mobile nav never covers content) */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-6 lg:p-8 flex-1 space-y-6 pb-24 md:pb-8">

        {/* Data-layer banner: shows exactly why the shared DB is not reachable */}
        {(activeTab === 'students' || activeTab === 'delete_students' || activeTab === 'audit_logs') && !cloudConnected && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              {sync.status === 'connecting' ? <Cloud className="w-4 h-4 animate-pulse" /> : <CloudOff className="w-4 h-4" />}
              {sync.status === 'connecting'
                ? (isArabic ? 'جاري الاتصال بقاعدة البيانات المشتركة...' : 'Connecting to the shared database...')
                : (isArabic ? 'مش متصل بقاعدة البيانات المشتركة' : 'Not connected to the shared database')}
            </div>
            <p className="text-[11px] text-amber-100/90 leading-relaxed">
              {dataError
                ? dataError
                : (isArabic
                    ? 'لو الحالة دي مستمرة: Firebase Console → Firestore → Rules → الصق محتوى firestore.rules → Publish.'
                    : 'If this persists: Firebase Console → Firestore → Rules → paste firestore.rules → Publish.')}
            </p>
            {!studentsLoaded && sync.status !== 'connecting' && (
              <p className="text-[11px] text-slate-400">
                {isArabic
                  ? 'التطبيق مش بيعرض بيانات تجريبية — كل الطلاب اللي هتشوفهم جايين من قاعدة البيانات بس.'
                  : 'No demo data is shown — every student you see comes from the database only.'}
              </p>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-3">
          <StudentMonitoring
            students={students}
            isArabic={isArabic}
            canDelete={isSuperAdmin}
            onSelectStudent={(stu: Student) => setSelectedStudent(stu)}
            onEditStudent={(stu: Student) => setEditingStudent(stu)}
            onSupportMode={(stu: Student) => setSupportModeStudent(stu)}
            onDeleteStudent={handleDeleteStudent}
            onToggleStudentAdmin={handleToggleStudentAdmin}
          />
          </div>
        )}

        {activeTab === 'code_generator' && (
          <ActivationCodeGenerator
            isArabic={isArabic}
            codes={activationCodes}
            students={students}
            onGenerateCode={handleGenerateCode}
            onRevokeCode={handleRevokeCode}
          />
        )}

        {activeTab === 'audit_logs' && (
          <AuditLogViewer
            logs={auditLogs}
            isArabic={isArabic}
          />
        )}

        {/* View 4: Delete Students (Super Admin only) */}
        {activeTab === 'delete_students' && isSuperAdmin && (
          <StudentDeletionPanel
            students={students}
            isArabic={isArabic}
            cloudConnected={cloudConnected}
            cloudError={dataError}
            onDeleteStudent={handleDeleteStudent}
            onResetAllData={handleResetAllData}
          />
        )}

      </main>

      {/* Mobile Bottom Navigation (app-like, thumb friendly) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        <div className={`grid gap-1 ${isSuperAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                activeTab === item.key
                  ? 'bg-brand-blue/15 text-brand-blue-electric'
                  : 'text-slate-400 active:bg-slate-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Full 10-Section Student Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          isOpen={!!selectedStudent}
          isArabic={isArabic}
          onClose={() => setSelectedStudent(null)}
          onEdit={(stu: Student) => {
            setEditingStudent(stu);
            setSelectedStudent(null);
          }}
          onLaunchSupportMode={(stu: Student) => {
            setSupportModeStudent(stu);
            setSelectedStudent(null);
          }}
          onGeneratePasswordReset={(stu: Student) => setPasswordResetStudent(stu)}
          onRevokeDevice={(studentId: string, deviceId: string) => handleRevokeDevice(studentId, deviceId)}
          onDeleteStudent={isSuperAdmin ? handleDeleteStudent : undefined}
          onToggleStudentAdmin={isSuperAdmin ? handleToggleStudentAdmin : undefined}
        />
      )}

      {/* Admin Modification with Justification Note Modal */}
      {editingStudent && (
        <AdminEditModal
          student={editingStudent}
          isOpen={!!editingStudent}
          isArabic={isArabic}
          onClose={() => setEditingStudent(null)}
          onSave={handleSaveStudentModifications}
        />
      )}

      {/* Cryptographic Password Reset Workflow Modal */}
      {passwordResetStudent && (
        <PasswordResetModal
          student={passwordResetStudent}
          isOpen={!!passwordResetStudent}
          isArabic={isArabic}
          onClose={() => setPasswordResetStudent(null)}
          onLogResetAction={handleLogPasswordReset}
        />
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 py-5 border-t border-slate-800/80 mb-16 md:mb-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4">
          <p>© 2026 Smart Study Planner • {isArabic ? 'لوحة التحكم' : 'Control Center'}</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>{isArabic ? 'الخادم: نشط' : 'Server: Active'}</span>
            <span>{isArabic ? 'حماية: سجل تدقيق مشفر' : 'Security: SHA-256 Audit'}</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
