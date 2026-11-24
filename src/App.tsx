import React, { useEffect, useState } from 'react';
import { Student, AuditLog, ViewTab, UserRole, GeneratedActivationCode, SubscriptionPlan, Gender } from './types';
import { INITIAL_STUDENTS, INITIAL_AUDIT_LOGS, INITIAL_ACTIVATION_CODES } from './data/mockData';
import { Logo } from './components/brand/Logo';
import { WhatsAppButton } from './components/whatsapp/WhatsAppButton';
import { StudentMonitoring } from './components/admin/StudentMonitoring';
import { ActivationCodeGenerator } from './components/admin/ActivationCodeGenerator';
import { StudentProfileModal } from './components/admin/StudentProfileModal';
import { AdminEditModal } from './components/admin/AdminEditModal';
import { PasswordResetModal } from './components/admin/PasswordResetModal';
import { AuditLogViewer } from './components/admin/AuditLogViewer';
import { StudentSupportMode } from './components/admin/StudentSupportMode';
import { DeleteStudentModal } from './components/admin/DeleteStudentModal';
import { ActivationCodePage } from './components/student/ActivationCodePage';
import { StudentDashboardView } from './components/student/StudentDashboardView';
import { StudentSettingsPage, SettingsChange } from './components/student/StudentSettingsPage';
import { LoginPage } from './components/auth/LoginPage';
import { usePersistentState } from './utils/storage';
import { createStudent } from './utils/studentFactory';
import { syncStudentDerived } from './utils/studyPlanner';
import {
  Users,
  FileCheck2,
  KeyRound,
  Globe,
  LogOut,
  ShieldCheck,
  UserRound
} from 'lucide-react';

type AdminLevel = 'super' | 'admin' | null;

const SUPER_ADMIN_NAME = 'Adam Sherif (Super Admin)';

export const App: React.FC = () => {
  // Global App & Language State
  const [isArabic, setIsArabic] = useState<boolean>(true);

  // Data State (persisted in this browser)
  const [students, setStudents] = usePersistentState<Student[]>('students', INITIAL_STUDENTS);
  const [auditLogs, setAuditLogs] = usePersistentState<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
  const [activationCodes, setActivationCodes] = usePersistentState<GeneratedActivationCode[]>(
    'activation_codes',
    INITIAL_ACTIVATION_CODES
  );

  // Admin session: 'super' = the Super Admin, 'admin' = a student who was granted admin access
  const [adminLevel, setAdminLevel] = useState<AdminLevel>(() =>
    localStorage.getItem('ssp_admin_auth') === 'true' ? 'super' : null
  );
  const [adminEmail, setAdminEmail] = useState<string>(() => {
    return localStorage.getItem('ssp_admin_email') || 'adam.sherif.aboasy@gmail.com';
  });
  const isAuthenticated = adminLevel !== null;
  const isSuperAdmin = adminLevel === 'super';

  // Currently logged-in student (stored by id so it always reflects the latest data)
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(() =>
    localStorage.getItem('ssp_student_id')
  );
  const currentStudent = students.find(s => s.id === currentStudentId) || null;

  // Active View Tab
  const [activeTab, setActiveTab] = useState<ViewTab>(() => {
    if (localStorage.getItem('ssp_admin_auth') === 'true') return 'students';
    const savedId = localStorage.getItem('ssp_student_id');
    return savedId && students.some(s => s.id === savedId) ? 'student_dashboard' : 'login';
  });

  // Selected Student & Modals State (admin)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [passwordResetStudentId, setPasswordResetStudentId] = useState<string | null>(null);
  const [supportModeStudentId, setSupportModeStudentId] = useState<string | null>(null);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId) || null;
  const editingStudent = students.find(s => s.id === editingStudentId) || null;
  const passwordResetStudent = students.find(s => s.id === passwordResetStudentId) || null;
  const supportModeStudent = students.find(s => s.id === supportModeStudentId) || null;
  const deletingStudent = students.find(s => s.id === deletingStudentId) || null;

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // If a student-admin loses admin access (or the student is deleted) while in the panel, leave the panel.
  useEffect(() => {
    if (adminLevel === 'admin' && !(currentStudent && currentStudent.isAdmin)) {
      setAdminLevel(null);
      setActiveTab(currentStudent ? 'student_dashboard' : 'login');
    }
  }, [adminLevel, currentStudent]);

  // If the logged-in student no longer exists (deleted), go back to the login page.
  useEffect(() => {
    if (
      currentStudentId &&
      !currentStudent &&
      (activeTab === 'student_dashboard' || activeTab === 'student_settings')
    ) {
      localStorage.removeItem('ssp_student_id');
      setCurrentStudentId(null);
      setActiveTab('login');
    }
  }, [currentStudentId, currentStudent, activeTab]);

  // Who is performing an admin action (for the audit trail)
  const actor = () =>
    isSuperAdmin || !currentStudent
      ? { id: 'ADMIN-SUPER-ADAM', name: SUPER_ADMIN_NAME }
      : { id: `ADMIN-${currentStudent.studentId}`, name: `${currentStudent.fullName} (Admin)` };

  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const entry: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [entry, ...prev]);
  };

  // Toggle Language & Direction
  const toggleLanguage = () => {
    const nextLang = !isArabic;
    setIsArabic(nextLang);
    document.documentElement.dir = nextLang ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang ? 'ar' : 'en';
  };

  // Login Success Handler
  const handleLoginSuccess = (role: UserRole, userEmail: string): { success: boolean; error?: string } => {
    if (role === 'SUPER_ADMIN') {
      setAdminLevel('super');
      setAdminEmail(userEmail);
      localStorage.setItem('ssp_admin_auth', 'true');
      localStorage.setItem('ssp_admin_email', userEmail);
      setActiveTab('students');
      showToast(
        isArabic
          ? 'تم تسجيل الدخول بنجاح! مرحباً بك يا أستاذ آدم في لوحة الإدارة العليا.'
          : 'Authenticated successfully! Welcome back to the Super Admin Dashboard.'
      );
      return { success: true };
    }

    const matched = students.find(s => s.email.toLowerCase() === userEmail.toLowerCase());
    if (!matched) {
      return {
        success: false,
        error: isArabic
          ? 'مفيش حساب بالإيميل ده. سجّل حساب جديد بكود التفعيل من تبويب "إنشاء حساب جديد".'
          : 'No account found for this email. Create one with an activation code.'
      };
    }

    setCurrentStudentId(matched.id);
    localStorage.setItem('ssp_student_id', matched.id);
    setActiveTab('student_dashboard');
    showToast(
      isArabic
        ? `أهلاً بك يا ${matched.fullNameAr || matched.fullName}! تم فتح صفحتك الرئيسية.`
        : `Welcome ${matched.fullName}! Launched your home dashboard.`
    );
    return { success: true };
  };

  // Student Registration Handler
  const handleRegisterStudent = (data: {
    fullName: string;
    email: string;
    password: string;
    activationCode: string;
    phoneNumber: string;
    gender: Gender;
    educationStage: string;
  }): { success: boolean; error?: string } => {
    const cleanCode = data.activationCode.trim().toUpperCase();
    const cleanEmail = data.email.trim().toLowerCase();

    if (students.some(s => s.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: isArabic
          ? '❌ الإيميل ده مسجل قبل كده. استخدم تبويب "تسجيل دخول".'
          : 'This email is already registered. Please sign in instead.'
      };
    }

    const matchedCode = activationCodes.find(c => c.code.toUpperCase() === cleanCode);

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

    const newStudent = createStudent({
      fullName: data.fullName,
      email: cleanEmail,
      phoneNumber: data.phoneNumber,
      gender: data.gender,
      educationStage: data.educationStage,
      plan,
      durationMonths,
      activationCode: cleanCode
    });
    const nowIso = new Date().toISOString();

    // Add to students list (instantly visible in the admin monitoring table)
    setStudents(prev => [newStudent, ...prev]);

    // Mark activation code as redeemed
    setActivationCodes(prev =>
      prev.map(c =>
        c.code.toUpperCase() === cleanCode
          ? { ...c, status: 'Redeemed', assignedStudentId: newStudent.studentId, assignedStudentName: data.fullName, redeemedAt: nowIso }
          : c
      )
    );

    addAuditLog({
      adminId: 'SYSTEM-AUTH',
      adminName: 'Registration System',
      targetStudentId: newStudent.studentId,
      studentName: data.fullName,
      actionSource: 'STUDENT',
      changedField: 'accountRegistrationAndCodeActivation',
      oldValue: 'Unregistered',
      newValue: `Registered as ${plan} Student with Code ${cleanCode}`,
      reason: `Student successfully registered account and unlocked study plan (${durationMonths} Mo, ${maxDevices} Devices)`
    });

    // Log the new student in
    setCurrentStudentId(newStudent.id);
    localStorage.setItem('ssp_student_id', newStudent.id);
    setActiveTab('student_dashboard');

    showToast(
      isArabic
        ? `🎉 أهلاً بك يا ${data.fullName}! تم تفعيل كود (${cleanCode}) وفتح صفحتك الرئيسية بنجاح.`
        : `🎉 Welcome ${data.fullName}! Code (${cleanCode}) redeemed and home page opened.`
    );

    return { success: true };
  };

  // Logout Handler (admin panel)
  const handleLogout = () => {
    const wasStudentAdmin = adminLevel === 'admin';
    setAdminLevel(null);
    localStorage.removeItem('ssp_admin_auth');
    localStorage.removeItem('ssp_admin_email');
    if (wasStudentAdmin) {
      setCurrentStudentId(null);
      localStorage.removeItem('ssp_student_id');
    }
    setActiveTab('login');
    showToast(
      isArabic
        ? 'تم تسجيل الخروج وقفل لوحة الإدارة بنجاح.'
        : 'Logged out and locked the admin session.'
    );
  };

  // A student who was granted admin access opens the admin panel
  const handleStudentToAdmin = () => {
    if (!currentStudent || !currentStudent.isAdmin) return;
    setAdminLevel(prev => prev ?? 'admin');
    setActiveTab('students');
  };

  // Generate Activation Code Handler (admin)
  const handleGenerateCode = (newCode: GeneratedActivationCode) => {
    setActivationCodes(prev => [newCode, ...prev]);
    const who = actor();

    addAuditLog({
      adminId: who.id,
      adminName: who.name,
      targetStudentId: newCode.assignedStudentId || 'GENERAL-VOUCHER',
      studentName: newCode.assignedStudentName || 'Unassigned Voucher',
      actionSource: 'ADMIN',
      changedField: 'activationCodeGenerated',
      oldValue: 'None',
      newValue: `Generated Code: ${newCode.code} (${newCode.plan} - ${newCode.durationMonths} Mo)`,
      reason: newCode.notes || 'Admin generated new activation voucher code'
    });

    showToast(
      isArabic
        ? `تم إنشاء كود التفعيل (${newCode.code}) بنجاح وتوثيقه في سجل العمليات!`
        : `Activation code (${newCode.code}) generated and recorded in audit log!`
    );
  };

  // Revoke Activation Code Handler
  const handleRevokeCode = (codeId: string) => {
    setActivationCodes(prev => prev.map(c => (c.id === codeId ? { ...c, status: 'Revoked' } : c)));
    showToast(isArabic ? 'تم إلغاء تفعيل الكود بنجاح.' : 'Code revoked successfully.');
  };

  // Student redeems an additional code from the activation page (logged-in students only)
  const handleStudentRedeemCode = (redeemedCodeString: string, matchedPlan?: string) => {
    const cleanCode = redeemedCodeString.trim().toUpperCase();
    const nowIso = new Date().toISOString();

    if (!currentStudent) {
      // New accounts must register (phone, stage and gender are required there).
      setActiveTab('login');
      showToast(
        isArabic
          ? 'سجّل حسابك الأول من صفحة الدخول (تبويب "إنشاء حساب جديد") وهتستخدم الكود هناك.'
          : 'Please create your account first on the login page; you will use the code there.'
      );
      return;
    }

    const plan = (matchedPlan as SubscriptionPlan) || 'Pro';
    const expiry = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString();
    const updatedStudent: Student = {
      ...currentStudent,
      subscriptionPlan: plan,
      status: 'Active',
      subscriptionExpiryDate: expiry,
      activationHistory: [
        {
          id: `act-${Date.now()}`,
          code: cleanCode,
          plan,
          durationMonths: 6,
          activatedAt: nowIso,
          expiresAt: expiry,
          status: 'Active',
          paymentReference: 'VOUCHER-REDEEM',
          paymentMethod: 'Activation Code'
        },
        ...currentStudent.activationHistory
      ]
    };

    setStudents(prev => prev.map(s => (s.id === updatedStudent.id ? updatedStudent : s)));
    setActivationCodes(prev =>
      prev.map(c => (c.code.toUpperCase() === cleanCode ? { ...c, status: 'Redeemed', redeemedAt: nowIso } : c))
    );
    setActiveTab('student_dashboard');
  };

  // Student changes (plans, tasks...) keep derived admin-facing data in sync
  const handleStudentUpdate = (updated: Student) => {
    const synced = syncStudentDerived({ ...updated, lastActivity: new Date().toISOString() });
    setStudents(prev => prev.map(s => (s.id === synced.id ? synced : s)));
  };

  // Student settings page: save + audit
  const handleSettingsSave = (updated: Student, changes: SettingsChange[]) => {
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    changes.forEach(ch =>
      addAuditLog({
        adminId: 'STUDENT-SELF',
        adminName: updated.fullName,
        targetStudentId: updated.studentId,
        studentName: updated.fullName,
        actionSource: 'STUDENT',
        changedField: ch.field,
        oldValue: ch.oldValue,
        newValue: ch.newValue,
        reason: 'Student updated own profile'
      })
    );
    showToast(isArabic ? 'تم حفظ بياناتك بنجاح.' : 'Your profile was updated.');
  };

  // Admin Save Modifications with Audit Log Generation
  const handleSaveStudentModifications = (
    updatedStudent: Student,
    newLogs: Omit<AuditLog, 'id' | 'timestamp'>[]
  ) => {
    setStudents(prev => prev.map(s => (s.id === updatedStudent.id ? updatedStudent : s)));

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
        : `Student updated and ${newLogs.length} event(s) committed to the audit trail!`
    );
  };

  // Delete a student (Super Admin only)
  const handleConfirmDeleteStudent = () => {
    if (!deletingStudent || !isSuperAdmin) {
      setDeletingStudentId(null);
      return;
    }
    const target = deletingStudent;
    const who = actor();

    setStudents(prev => prev.filter(s => s.id !== target.id));
    if (selectedStudentId === target.id) setSelectedStudentId(null);
    if (editingStudentId === target.id) setEditingStudentId(null);
    if (passwordResetStudentId === target.id) setPasswordResetStudentId(null);
    if (supportModeStudentId === target.id) setSupportModeStudentId(null);

    addAuditLog({
      adminId: who.id,
      adminName: who.name,
      targetStudentId: target.studentId,
      studentName: target.fullName,
      actionSource: 'ADMIN',
      changedField: 'studentAccountDeleted',
      oldValue: `${target.fullName} (${target.email})`,
      newValue: 'Deleted',
      reason: 'Student account deleted by Super Admin'
    });

    setDeletingStudentId(null);
    showToast(
      isArabic
        ? `تم حذف الطالب (${target.fullNameAr || target.fullName}) نهائياً.`
        : `Student (${target.fullName}) was deleted.`
    );
  };

  // Revoke Device Handler
  const handleRevokeDevice = (studentId: string, deviceId: string) => {
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) return;

    const revokedDevice = targetStudent.registeredDevices.find(d => d.id === deviceId);
    const updatedStudent: Student = {
      ...targetStudent,
      registeredDevices: targetStudent.registeredDevices.filter(d => d.id !== deviceId)
    };
    setStudents(prev => prev.map(s => (s.id === studentId ? updatedStudent : s)));

    const who = actor();
    addAuditLog({
      adminId: who.id,
      adminName: who.name,
      targetStudentId: targetStudent.studentId,
      studentName: targetStudent.fullName,
      actionSource: 'ADMIN',
      changedField: 'registeredDevices (Revocation)',
      oldValue: `${revokedDevice?.deviceName || 'Device'} (Linked)`,
      newValue: 'Device Revoked & Session Terminated',
      reason: 'Admin revoked unauthorized/inactive device session to enforce device concurrency limit'
    });

    showToast(
      isArabic
        ? 'تم إلغاء ربط الجهاز بنجاح وفصل الجلسة وتوثيق العملية في سجل التدقيق.'
        : 'Device session revoked and logged in the audit trail.'
    );
  };

  // Password Reset Log Handler
  const handleLogPasswordReset = (studentId: string, studentName: string) => {
    const who = actor();
    addAuditLog({
      adminId: who.id,
      adminName: who.name,
      targetStudentId: studentId,
      studentName,
      actionSource: 'ADMIN',
      changedField: 'passwordResetWorkflow',
      oldValue: 'Existing Password Hash',
      newValue: 'Generated Single-Use Encrypted Reset Token',
      reason: 'Admin initiated secure password reset workflow without exposing plaintext passwords'
    });

    showToast(
      isArabic
        ? 'تم إنشاء رمز إعادة ضبط كلمة المرور المشفر وتوثيق الإجراء في السجل الأمني.'
        : 'Encrypted password reset token issued and recorded in audit trail.'
    );
  };

  /* ------------------------------------------------------------------ */
  /* Routing                                                              */
  /* ------------------------------------------------------------------ */

  const loginPage = (
    <LoginPage
      isArabic={isArabic}
      activeCodes={activationCodes}
      onLoginSuccess={handleLoginSuccess}
      onRegisterStudent={handleRegisterStudent}
      onGoToActivation={() => setActiveTab('activation_page')}
      onToggleLanguage={toggleLanguage}
    />
  );

  // ROUTE PROTECTION: admin views need an admin session
  const isProtectedAdminTab = activeTab === 'students' || activeTab === 'code_generator' || activeTab === 'audit_logs';
  if (!isAuthenticated && isProtectedAdminTab) return loginPage;

  if (activeTab === 'login') return loginPage;

  // Student support mode (admin previews a student's experience)
  if (supportModeStudent) {
    return (
      <StudentSupportMode
        student={supportModeStudent}
        isArabic={isArabic}
        onExitSupportMode={() => setSupportModeStudentId(null)}
      />
    );
  }

  // Activation page
  if (activeTab === 'activation_page') {
    return (
      <ActivationCodePage
        isArabic={isArabic}
        activeCodes={activationCodes}
        isLoggedIn={!!currentStudent}
        onBackToDashboard={() => setActiveTab(currentStudent ? 'student_dashboard' : isAuthenticated ? 'students' : 'login')}
        onActivateSuccess={handleStudentRedeemCode}
      />
    );
  }

  // Student pages need a logged-in student
  if ((activeTab === 'student_dashboard' || activeTab === 'student_settings') && !currentStudent) {
    return loginPage;
  }

  if (activeTab === 'student_settings' && currentStudent) {
    return (
      <StudentSettingsPage
        student={currentStudent}
        isArabic={isArabic}
        onBack={() => setActiveTab('student_dashboard')}
        onSave={handleSettingsSave}
        onToggleLanguage={toggleLanguage}
      />
    );
  }

  if (activeTab === 'student_dashboard' && currentStudent) {
    return (
      <StudentDashboardView
        student={currentStudent}
        isArabic={isArabic}
        onGoToActivation={() => setActiveTab('activation_page')}
        onGoToSettings={() => setActiveTab('student_settings')}
        onSwitchToAdmin={handleStudentToAdmin}
        onLogout={() => {
          setCurrentStudentId(null);
          localStorage.removeItem('ssp_student_id');
          setAdminLevel(prev => (prev === 'admin' ? null : prev));
          setActiveTab('login');
          showToast(isArabic ? 'تم تسجيل الخروج بنجاح والعودة لصفحة الدخول.' : 'Logged out successfully.');
        }}
        onToggleLanguage={toggleLanguage}
        onUpdateStudent={handleStudentUpdate}
      />
    );
  }

  // DEFAULT: ADMIN DASHBOARD (authenticated only)
  const activeCodesCount = activationCodes.filter(c => c.status === 'Active').length;

  const navItems: Array<{ id: ViewTab; labelAr: string; labelEn: string; icon: React.ReactNode; badge?: number; badgeClass: string; activeClass: string }> = [
    {
      id: 'students',
      labelAr: 'مراقبة ومتابعة الطلاب',
      labelEn: 'Student Monitoring',
      icon: <Users className="w-4 h-4" />,
      badgeClass: '',
      activeClass: 'bg-brand-blue text-white shadow-glow-blue/40'
    },
    {
      id: 'code_generator',
      labelAr: 'إنشاء أكواد التفعيل',
      labelEn: 'Code Generator',
      icon: <KeyRound className="w-4 h-4 text-brand-whatsapp" />,
      badge: activeCodesCount,
      badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-500/40',
      activeClass: 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-glow-combo'
    },
    {
      id: 'audit_logs',
      labelAr: 'سجلات التدقيق',
      labelEn: 'Audit Logs',
      icon: <FileCheck2 className="w-4 h-4" />,
      badge: auditLogs.length,
      badgeClass: 'bg-purple-950 text-purple-300 border border-purple-500/40',
      activeClass: 'bg-brand-purple text-white shadow-glow-purple/40'
    }
  ];

  const renderNavButton = (item: (typeof navItems)[number]) => (
    <button
      key={item.id}
      type="button"
      onClick={() => setActiveTab(item.id)}
      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
        activeTab === item.id ? item.activeClass : 'text-slate-400 hover:text-white hover:bg-slate-900'
      }`}
    >
      {item.icon}
      <span>{isArabic ? item.labelAr : item.labelEn}</span>
      {item.badge !== undefined && (
        <span className={`px-1.5 rounded-full text-[10px] font-bold ${item.badgeClass}`}>{item.badge}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-blue selection:text-white">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] max-w-[92vw] bg-emerald-900/90 border border-emerald-400/50 text-emerald-100 px-5 py-3 rounded-2xl shadow-glow-whatsapp text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Top Navigation Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <Logo
            variant="admin-dash"
            size="md"
            isArabic={isArabic}
            onClick={() => setActiveTab('students')}
          />

          {/* Navigation Tabs (tablet & desktop) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            {navItems.map(renderNavButton)}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:block">
              <WhatsAppButton isArabic={isArabic} variant="pill" />
            </div>

            {/* Student-admins can jump back to their own student page */}
            {adminLevel === 'admin' && currentStudent && (
              <button
                type="button"
                onClick={() => setActiveTab('student_dashboard')}
                className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title={isArabic ? 'صفحتي كطالب' : 'My student page'}
              >
                <UserRound className="w-4 h-4 text-brand-blue-electric" />
                <span className="hidden sm:inline">{isArabic ? 'صفحتي كطالب' : 'My student page'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleLanguage}
              className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
              title={isArabic ? 'Switch to English' : 'التحويل إلى العربية'}
            >
              <Globe className="w-4 h-4 text-brand-blue-light" />
              <span>{isArabic ? 'English' : 'عربي'}</span>
            </button>

            <div className="flex items-center gap-2.5 ps-2 border-s border-slate-800">
              <div className="hidden sm:flex flex-col text-xs">
                <span className="font-bold text-white leading-none">
                  {isSuperAdmin ? 'Adam Sherif' : currentStudent?.fullName}
                </span>
                <span className="text-[10px] text-purple-400 font-mono mt-0.5 max-w-[180px] truncate" dir="ltr">
                  {isSuperAdmin ? adminEmail : currentStudent?.email}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple to-purple-800 flex items-center justify-center font-bold text-xs text-white shadow-glow-purple/20">
                {isSuperAdmin ? 'AS' : (currentStudent?.fullName || 'A').slice(0, 2).toUpperCase()}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                title={isArabic ? 'تسجيل الخروج وقفل اللوحة' : 'Lock & Sign Out'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (phones): scrollable row under the header */}
        <nav className="md:hidden max-w-7xl mx-auto mt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {navItems.map(renderNavButton)}
        </nav>
      </header>

      {/* Main Body Content for Admin */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-6 lg:p-8 flex-1 space-y-6">
        {activeTab === 'students' && (
          <StudentMonitoring
            students={students}
            isArabic={isArabic}
            onSelectStudent={(stu) => setSelectedStudentId(stu.id)}
            onEditStudent={(stu) => setEditingStudentId(stu.id)}
            onResetPassword={(stu) => setPasswordResetStudentId(stu.id)}
            onLaunchSupportMode={(stu) => setSupportModeStudentId(stu.id)}
            onDeleteStudent={isSuperAdmin ? (stu) => setDeletingStudentId(stu.id) : undefined}
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

        {activeTab === 'audit_logs' && <AuditLogViewer logs={auditLogs} isArabic={isArabic} />}
      </main>

      {/* Full Student Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          isOpen={true}
          isArabic={isArabic}
          onClose={() => setSelectedStudentId(null)}
          onEdit={(stu) => {
            setEditingStudentId(stu.id);
            setSelectedStudentId(null);
          }}
          onLaunchSupportMode={(stu) => {
            setSupportModeStudentId(stu.id);
            setSelectedStudentId(null);
          }}
          onRevokeDevice={handleRevokeDevice}
          onGeneratePasswordReset={(stu) => {
            setPasswordResetStudentId(stu.id);
            setSelectedStudentId(null);
          }}
        />
      )}

      {/* Admin Modification Modal */}
      {editingStudent && (
        <AdminEditModal
          key={editingStudent.id}
          student={editingStudent}
          isOpen={true}
          isArabic={isArabic}
          canManageAdmins={isSuperAdmin}
          onClose={() => setEditingStudentId(null)}
          onSave={handleSaveStudentModifications}
        />
      )}

      {/* Password Reset Workflow Modal */}
      {passwordResetStudent && (
        <PasswordResetModal
          student={passwordResetStudent}
          isOpen={true}
          isArabic={isArabic}
          onClose={() => setPasswordResetStudentId(null)}
          onLogResetAction={handleLogPasswordReset}
        />
      )}

      {/* Delete Student Confirmation */}
      {deletingStudent && isSuperAdmin && (
        <DeleteStudentModal
          student={deletingStudent}
          isArabic={isArabic}
          onCancel={() => setDeletingStudentId(null)}
          onConfirm={handleConfirmDeleteStudent}
        />
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 py-6 border-t border-slate-800/80 px-3">
        <p>© 2026 Smart Study Planner (مخطط الدراسة الذكي) • {isSuperAdmin ? 'Super Admin' : 'Admin'} Control Center</p>
      </footer>
    </div>
  );
};
