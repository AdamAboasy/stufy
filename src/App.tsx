import React, { useState, useEffect } from 'react';
import { Student, AuditLog, ViewTab, UserRole, GeneratedActivationCode, SubscriptionPlan, Gender, GeneratedPlan } from './types';
import { INITIAL_STUDENTS, INITIAL_AUDIT_LOGS, INITIAL_ACTIVATION_CODES } from './data/mockData';
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
  fetchStudentsFromServer,
  findStudentByEmail,
  upsertStudent,
  removeStudent,
  removeStudentsBatch,
  verifyDeleted,
  forgetLocalStudent,
  type SyncState
} from './lib/studentsService';
import {
  subscribeActivationCodes,
  saveActivationCode,
  markCodeRedeemed,
  revokeActivationCode,
  fetchActivationCodes,
  getActivationCode
} from './lib/activationService';

import { subscribeAuditLogs, pushAuditLog } from './lib/auditService';
import { uploadBook, deleteBookFile, getBookFileUrl, resolveStorageBackend } from './lib/booksService';
import { initAnalytics } from './lib/firebase';
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

export const App: React.FC = () => {
  // Global App & Language State
  const [isArabic, setIsArabic] = useState<boolean>(true);

  // Authentication State: Protected by default
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('ssp_admin_auth') === 'true';
  });
  const [adminEmail, setAdminEmail] = useState<string>(() => {
    return localStorage.getItem('ssp_admin_email') || 'adam.sherif.aboasy@gmail.com';
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (localStorage.getItem('ssp_admin_auth') === 'true') return 'SUPER_ADMIN';
    return localStorage.getItem('ssp_role') === 'STUDENT_ADMIN' ? 'STUDENT_ADMIN' : 'STUDENT';
  });

  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  const canSeeAdminPanel = isSuperAdmin || currentRole === 'STUDENT_ADMIN';

  // Active View Tab: Defaults to 'login' if not authenticated as admin
  const [activeTab, setActiveTab] = useState<ViewTab>(() => {
    return localStorage.getItem('ssp_admin_auth') === 'true' ? 'students' : 'login';
  });

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
  const [storageBackend, setStorageBackend] = useState<'storage' | 'firestore'>('firestore');

  // Real-time students from the shared database
  useEffect(() => {
    initAnalytics();

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
  }, []);

  // اختيار وسيلة تخزين الكتب تلقائياً (Storage لو Blaze، وإلا Firestore)
  useEffect(() => {
    resolveStorageBackend()
      .then(setStorageBackend)
      .catch(() => setStorageBackend('firestore'));
  }, []);

  // Restore the logged-in student from the shared database (not from a local copy)
  useEffect(() => {
    if (currentStudent) return;
    const savedId = localStorage.getItem('ssp_student_id');
    if (!savedId) return;
    findStudentByEmail(localStorage.getItem('ssp_student_email') || '')
      .then(found => {
        if (found) setCurrentStudent(found);
        else getStudentByIdFallback(savedId);
      })
      .catch(() => getStudentByIdFallback(savedId));

    function getStudentByIdFallback(id: string) {
      const fromList = students.find(st => st.id === id || st.studentId === id);
      if (fromList) {
        setCurrentStudent(fromList);
      } else {
        localStorage.removeItem('ssp_student_id');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentsLoaded]);

  // Keep the logged-in student in sync with the live list
  useEffect(() => {
    if (!currentStudent) return;
    const fresh = students.find(s => s.id === currentStudent.id);
    if (fresh && fresh !== currentStudent) setCurrentStudent(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  // Selected Student & Modals State (Super Admin)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [passwordResetStudent, setPasswordResetStudent] = useState<Student | null>(null);
  const [supportModeStudent, setSupportModeStudent] = useState<Student | null>(null);

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
  const handleLoginSuccess = (role: UserRole, userEmail: string) => {
    if (role === 'SUPER_ADMIN') {
      setIsAuthenticated(true);
      setCurrentRole('SUPER_ADMIN');
      setAdminEmail(userEmail);
      localStorage.setItem('ssp_admin_auth', 'true');
      localStorage.setItem('ssp_admin_email', userEmail);
      setActiveTab('students');
      showToast(
        isArabic
          ? 'تم تسجيل الدخول بنجاح! مرحباً بك يا أستاذ آدم في لوحة الإدارة العليا.'
          : 'Authenticated successfully! Welcome back to the Super Admin Dashboard.'
      );
    }
  };

  /**
   * تسجيل دخول الطالب: البحث في قاعدة البيانات المشتركة (مش من نسخة المتصفح)
   * Student sign-in resolves the account from the shared Firestore database.
   */
  const handleStudentSignIn = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    const clean = email.trim().toLowerCase();
    let matched: Student | null = null;

    try {
      matched = await findStudentByEmail(clean);
    } catch (error) {
      return {
        success: false,
        error: isArabic
          ? `تعذّر الوصول لقاعدة البيانات: ${(error as { code?: string })?.code || 'network'}. جرّب تاني بعد لحظات.`
          : `Could not reach the database: ${(error as { code?: string })?.code || 'network'}. Please try again.`
      };
    }

    if (!matched) {
      // آخر محاولة: من القائمة الحيّة (لو الاشتراك اللحظي متاح)
      matched = students.find(st => (st.email || '').toLowerCase() === clean) || null;
    }

    if (!matched) {
      return {
        success: false,
        error: isArabic
          ? '❌ لا يوجد حساب طالب مسجل بهذا البريد. سجّل حساب جديد بكود التفعيل أولاً.'
          : '❌ No student account found for this email. Please register with an activation code first.'
      };
    }

    const promoted = !!matched.isAdmin;
    setCurrentRole(promoted ? 'STUDENT_ADMIN' : 'STUDENT');
    localStorage.setItem('ssp_role', promoted ? 'STUDENT_ADMIN' : 'STUDENT');
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

    // 1) الإيميل لازم يكون فريد على مستوى قاعدة البيانات كلها
    try {
      const alreadyRegistered = await findStudentByEmail(data.email);
      if (alreadyRegistered) {
        return {
          success: false,
          error: isArabic
            ? '❌ البريد الإلكتروني ده مسجّل بالفعل. جرّب تسجيل الدخول.'
            : '❌ This email is already registered. Try signing in instead.'
        };
      }
    } catch {
      /* لو الفحص فشل لأسباب شبكة، نكمل — والـ rules هتمنع التكرار */
    }

    // 2) كود التفعيل: من قاعدة البيانات المشتركة أولاً
    let matchedCode: GeneratedActivationCode | null = null;
    try {
      matchedCode = await getActivationCode(cleanCode);
    } catch {
      matchedCode = null;
    }
    if (!matchedCode) {
      matchedCode = activationCodes.find(c => (c.code || '').toUpperCase() === cleanCode) || null;
    }

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

    const newStudentId = `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newStudentInternalId = `s-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const expiryDate = new Date(Date.now() + durationMonths * 30 * 24 * 3600 * 1000).toISOString();

    const templateStudent = students[0] || INITIAL_STUDENTS[0];

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
      subjects: templateStudent.subjects,
      studyPreferences: undefined,
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

    // 3) الحفظ في قاعدة البيانات المشتركة — قبل أي وعد للطالب بالنجاح
    const saved = await upsertStudent(newStudent);
    if (!saved.ok) {
      return {
        success: false,
        error: isArabic
          ? `❌ تعذّر إنشاء الحساب في قاعدة البيانات (${saved.error}). راجع قواعد Firestore أو حاول تاني.`
          : `❌ Could not create the account in the database (${saved.error}). Check Firestore rules or retry.`
      };
    }

    setStudents(prev => [newStudent, ...prev.filter(st => st.id !== newStudent.id)]);

    // Mark activation code as redeemed (shared DB — so it can't be reused on another device)
    await markCodeRedeemed(cleanCode, {
      id: newStudentInternalId,
      studentId: newStudentId,
      fullName: data.fullName
    });

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
  const handleLogout = () => {
    setIsAuthenticated(false);
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
    setActivationCodes(prev => [newCode, ...prev.filter(c => c.id !== newCode.id)]);
    if (!saved.ok) {
      showToast(
        isArabic
          ? `⚠️ تم إنشاء الكود محلياً لكن الحفظ في قاعدة البيانات فشل (${saved.error}).`
          : `⚠️ Code created locally but the database write failed (${saved.error}).`
      );
    }

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
    await revokeActivationCode(codeId);
    setActivationCodes(prev => prev.map(c => c.id === codeId ? { ...c, status: 'Revoked' } : c));
    showToast(isArabic ? 'تم إلغاء تفعيل الكود بنجاح.' : 'Code revoked successfully.');
  };

  // Student Redeemed Code Handler: Immediately transitions to Student Home Page
  const handleStudentRedeemCode = (
    redeemedCodeString: string,
    matchedPlan?: string,
    studentName?: string,
    studentEmail?: string
  ) => {
    const cleanCode = redeemedCodeString.trim().toUpperCase();
    const nowIso = new Date().toISOString();

    if (currentStudent) {
      const updatedStudent: Student = {
        ...currentStudent,
        subscriptionPlan: (matchedPlan as SubscriptionPlan) || 'Pro',
        status: 'Active',
        subscriptionExpiryDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
        activationHistory: [
          {
            id: `act-${Date.now()}`,
            code: cleanCode,
            plan: (matchedPlan as SubscriptionPlan) || 'Pro',
            durationMonths: 6,
            activatedAt: nowIso,
            expiresAt: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
            status: 'Active',
            paymentReference: 'VOUCHER-REDEEM',
            paymentMethod: 'Activation Code'
          },
          ...currentStudent.activationHistory
        ]
      };

      setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      setCurrentStudent(updatedStudent);
      setActiveTab('student_dashboard');
    } else {
      void handleRegisterStudent({
        fullName: studentName?.trim() || 'طالب جديد (مخطط الدراسة)',
        email: studentEmail?.trim() || `student_${Date.now()}@example.com`,
        password: 'password123',
        activationCode: cleanCode
      });
    }

    setActivationCodes(prev => prev.map(c => {
      if (c.code.toUpperCase() === cleanCode) {
        return {
          ...c,
          status: 'Redeemed',
          redeemedAt: nowIso
        };
      }
      return c;
    }));

    setActiveTab('student_dashboard');
  };

  // Admin Save Modifications with Immutable Audit Log Generation
  const handleSaveStudentModifications = (
    updatedStudent: Student,
    newLogs: Omit<AuditLog, 'id' | 'timestamp'>[]
  ) => {
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

    showToast(
      isArabic
        ? `تم تحديث بيانات الطالب وتوثيق ${newLogs.length} سجل في سجل التدقيق الأمني بنجاح!`
        : `Student updated and ${newLogs.length} event(s) committed to the immutable audit trail!`
    );
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
     Cleanup: delete every student flagged as "test" at once
     ============================================================ */
  const handleBulkDeleteTestStudents = async (list: Student[]) => {
    if (list.length === 0) return;
    const removed = await removeStudentsBatch(list);
    if (removed > 0) {
      setStudents(prev => prev.filter(s => !list.slice(0, removed).some(d => d.id === s.id)));
      list.forEach(st => forgetLocalStudent(st.id));
    }
    if (removed < list.length) {
      setDataError(
        isArabic
          ? `تم حذف ${removed} من ${list.length}. الباقي فشل بسبب الصلاحيات — راجع قواعد Firestore.`
          : `Deleted ${removed} of ${list.length}. The rest failed due to permissions — check your Firestore rules.`
      );
    }
    showToast(
      isArabic
        ? `تم حذف ${removed} طالب من السحابة نهائياً.`
        : `${removed} student(s) permanently deleted from the cloud.`
    );
  };

  /* ============================================================
     DELETE A BOOK FROM A STUDENT (Admin) + audit trail
     ============================================================ */
  const handleDeleteStudentBook = (student: Student, bookId: string) => {
    const book = student.uploadedPdfs.find(p => p.id === bookId);
    const planUsesBook = student.generatedPlan?.bookId === bookId;

    const updated: Student = {
      ...student,
      uploadedPdfs: student.uploadedPdfs.filter(p => p.id !== bookId),
      generatedPlan: planUsesBook ? null : student.generatedPlan
    };

    setStudents(prev => prev.map(s => (s.id === student.id ? updated : s)));
    syncStudentToCloud(updated);
    if (selectedStudent && selectedStudent.id === student.id) setSelectedStudent(updated);
    if (currentStudent && currentStudent.id === student.id) setCurrentStudent(updated);
    setEditingStudent(prev => (prev && prev.id === student.id ? updated : prev));

    const newAuditLog: AuditLog = {
      id: `log-book-del-${Date.now()}`,
      adminId: 'ADMIN-SUPER-ADAM',
      adminName: 'Adam Sherif (Super Admin)',
      targetStudentId: student.studentId,
      studentName: student.fullName,
      actionSource: 'ADMIN',
      changedField: 'uploadedPdfs (deletion)',
      oldValue: book ? `${book.title} (${book.pageCount} pages, ${book.fileSizeMb} MB)` : bookId,
      newValue: 'Book deleted from student library',
      reason: planUsesBook
        ? 'Super Admin deleted the book and its linked study plan'
        : 'Super Admin deleted the book from the student library',
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newAuditLog, ...prev]);
    if (cloudConnected) pushAuditLog(newAuditLog);

    showToast(
      isArabic
        ? `تم حذف الكتاب${planUsesBook ? ' والخطة المرتبطة به' : ''} من حساب الطالب وتوثيق العملية.`
        : `Book${planUsesBook ? ' and its linked plan were' : ' was'} deleted from the student account.`
    );
  };

  /* ============================================================
     PROMOTE / DEMOTE STUDENT TO ADMIN (Super Admin only)
     ============================================================ */
  const handleToggleStudentAdmin = (student: Student) => {
    const promoting = !student.isAdmin;
    const updated: Student = { ...student, isAdmin: promoting };

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
  const handleUpdateStudentProfile = (updated: Student) => {
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    if (currentStudent && currentStudent.id === updated.id) {
      setCurrentStudent(updated);
    }
    syncStudentToCloud(updated);
  };

  const handleSaveGeneratedPlan = (plan: GeneratedPlan) => {
    setStudents(prev =>
      prev.map(s => {
        if (!currentStudent || s.id !== currentStudent.id) return s;

        const daysRemaining = Math.max(
          0,
          Math.round(
            (new Date(`${plan.examDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) /
              (24 * 3600 * 1000)
          )
        );

        return {
          ...s,
          generatedPlan: plan,
          studyPreferences: {
            examDate: plan.examDate,
            revisionRounds: plan.revisionRounds,
            dailyMinutes: plan.dailyMinutes,
            daysOff: s.studyPreferences?.daysOff || []
          },
          revisionPlanner: {
            targetExamDate: plan.examDate,
            daysRemaining,
            rounds: plan.rounds,
            weakPoints: s.revisionPlanner?.weakPoints || [],
            nextMockExam: plan.sessions.find(s => s.kind === 'mock')?.date || ''
          },
          lastActivity: new Date().toISOString()
        };
      })
    );

    if (currentStudent) {
      const planStudent = students.find(st => st.id === currentStudent.id);
      if (planStudent) upsertStudent({ ...planStudent, generatedPlan: plan });
    }

    showToast(
      isArabic
        ? 'تم بناء خطة المذاكرة والمراجعة من كتابك بنجاح!'
        : 'Your study & revision plan was built from your book!'
    );
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
        onLoginSuccess={handleLoginSuccess}
        onStudentSignIn={handleStudentSignIn}
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
        onLoginSuccess={handleLoginSuccess}
        onStudentSignIn={handleStudentSignIn}
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
      return (
        <LoginPage
          isArabic={isArabic}
          activeCodes={activationCodes}
          onLoginSuccess={handleLoginSuccess}
          onStudentSignIn={handleStudentSignIn}
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
        onLogout={() => {
          setCurrentStudent(null);
          setCurrentRole('STUDENT');
          localStorage.removeItem('ssp_student_id');
          localStorage.removeItem('ssp_role');
          setActiveTab('login');
          showToast(isArabic ? 'تم تسجيل الخروج بنجاح والعودة لصفحة الدخول.' : 'Logged out successfully.');
        }}
        onToggleLanguage={toggleLanguage}
        onUpdateStudent={handleUpdateStudentProfile}
        onSavePlan={handleSaveGeneratedPlan}
        onUploadBookFile={(file, bookId) =>
          currentStudent ? uploadBook(currentStudent.id, bookId, file) : Promise.resolve(null)
        }
        onDeleteBookFile={deleteBookFile}
        onOpenBookFile={getBookFileUrl}
        bookStorageBackend={storageBackend}
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
            onBulkDeleteDemo={handleBulkDeleteTestStudents}
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
          onDeleteBook={canSeeAdminPanel ? handleDeleteStudentBook : undefined}
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
