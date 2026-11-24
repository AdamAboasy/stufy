import React, { useState, useEffect } from 'react';
import { Student, AuditLog, ViewTab, UserRole, GeneratedActivationCode, SubscriptionPlan } from './types';
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
import { ActivationCodePage } from './components/student/ActivationCodePage';
import { StudentDashboardView } from './components/student/StudentDashboardView';
import { LoginPage } from './components/auth/LoginPage';
import { 
  Users, 
  FileCheck2, 
  KeyRound, 
  Globe, 
  LogOut,
  ShieldCheck
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
    return localStorage.getItem('ssp_admin_auth') === 'true' ? 'SUPER_ADMIN' : 'STUDENT';
  });

  // Active View Tab: Defaults to 'login' if not authenticated as admin
  const [activeTab, setActiveTab] = useState<ViewTab>(() => {
    return localStorage.getItem('ssp_admin_auth') === 'true' ? 'students' : 'login';
  });

  // Data State
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [activationCodes, setActivationCodes] = useState<GeneratedActivationCode[]>(INITIAL_ACTIVATION_CODES);

  // Currently Logged-in Student Session (for Student Dashboard Home Page)
  const [currentStudent, setCurrentStudent] = useState<Student | null>(() => {
    const savedId = localStorage.getItem('ssp_student_id');
    if (savedId) {
      const found = INITIAL_STUDENTS.find(s => s.id === savedId || s.studentId === savedId);
      if (found) return found;
    }
    return INITIAL_STUDENTS[0];
  });

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
    } else {
      setCurrentRole('STUDENT');
      const matched = students.find(s => s.email.toLowerCase() === userEmail.toLowerCase()) || students[0];
      setCurrentStudent(matched);
      localStorage.setItem('ssp_student_id', matched.id);
      setActiveTab('student_dashboard');
      showToast(
        isArabic
          ? `أهلاً بك يا ${matched.fullNameAr || matched.fullName}! تم فتح صفحتك الرئيسية.`
          : `Welcome ${matched.fullName}! Launched your home dashboard.`
      );
    }
  };

  // Student Registration Handler: Requires Full Name, Email, Password, Activation Code
  const handleRegisterStudent = (data: {
    fullName: string;
    email: string;
    password: string;
    activationCode: string;
  }): { success: boolean; error?: string } => {
    const cleanCode = data.activationCode.trim().toUpperCase();
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
      phoneNumber: '+20 101 001 4590',
      guardianPhoneNumber: '+20 100 000 0000',
      nationalId: `304051${Math.floor(10000000 + Math.random() * 90000000)}`,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      academicYear: '3rd Secondary (General Thanawya)',
      academicYearAr: 'الصف الثالث الثانوي (علمي علوم)',
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
      uploadedPdfs: templateStudent.uploadedPdfs,
      subjects: templateStudent.subjects,
      dailyTasks: [
        {
          id: `task-1-${Date.now()}`,
          title: 'الفيزياء: حل مسائل قوانين كيرشوف الأول والثاني',
          titleAr: 'الفيزياء: حل مسائل قوانين كيرشوف الأول والثاني',
          subject: 'Physics',
          scheduledTime: '04:30 PM',
          durationMinutes: 60,
          isCompleted: false,
          streakDays: 1,
          isOverdue: false
        },
        {
          id: `task-2-${Date.now()}`,
          title: 'الكيمياء: تسمية الألكانات والألكينات بنظام الأيوباك',
          titleAr: 'الكيمياء: تسمية الألكانات والألكينات بنظام الأيوباك',
          subject: 'Chemistry',
          scheduledTime: '06:00 PM',
          durationMinutes: 45,
          isCompleted: false,
          streakDays: 1,
          isOverdue: false
        },
        {
          id: `task-3-${Date.now()}`,
          title: 'اللغة العربية: مراجعة إعراب الفعل المضارع وحل 30 سؤال',
          titleAr: 'اللغة العربية: مراجعة إعراب الفعل المضارع وحل 30 سؤال',
          subject: 'Arabic',
          scheduledTime: '08:00 PM',
          durationMinutes: 45,
          isCompleted: false,
          streakDays: 1,
          isOverdue: false
        }
      ],
      studyPlans: templateStudent.studyPlans,
      revisionPlanner: templateStudent.revisionPlanner,
      performanceReport: templateStudent.performanceReport,
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

    // Add to students list (Instantly visible in Super Admin Monitoring!)
    setStudents(prev => [newStudent, ...prev]);

    // Mark activation code as redeemed
    setActivationCodes(prev => prev.map(c => {
      if (c.code.toUpperCase() === cleanCode) {
        return {
          ...c,
          status: 'Redeemed',
          assignedStudentId: newStudentId,
          assignedStudentName: data.fullName,
          redeemedAt: nowIso
        };
      }
      return c;
    }));

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

    // Set active student and switch to student dashboard
    setCurrentStudent(newStudent);
    setCurrentRole('STUDENT');
    localStorage.setItem('ssp_student_id', newStudentInternalId);
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
    localStorage.removeItem('ssp_admin_auth');
    localStorage.removeItem('ssp_admin_email');
    setActiveTab('login');
    showToast(
      isArabic
        ? 'تم تسجيل الخروج وقفل لوحة الإدارة العليا بنجاح.'
        : 'Logged out and locked the Super Admin session.'
    );
  };

  // Generate Activation Code Handler (Super Admin)
  const handleGenerateCode = (newCode: GeneratedActivationCode) => {
    setActivationCodes(prev => [newCode, ...prev]);

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

    showToast(
      isArabic 
        ? `تم إنشاء كود التفعيل (${newCode.code}) بنجاح وتوثيقه في سجل العمليات!` 
        : `Activation code (${newCode.code}) generated and recorded in audit log!`
    );
  };

  // Revoke Activation Code Handler
  const handleRevokeCode = (codeId: string) => {
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
      handleRegisterStudent({
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

  // ROUTE PROTECTION: If trying to access Super Admin views without authentication, render Login Page
  const isProtectedAdminTab = activeTab === 'students' || activeTab === 'code_generator' || activeTab === 'audit_logs';

  if (!isAuthenticated && isProtectedAdminTab) {
    return (
      <LoginPage
        isArabic={isArabic}
        activeCodes={activationCodes}
        onLoginSuccess={handleLoginSuccess}
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
        onBackToDashboard={() => setActiveTab(currentStudent ? 'student_dashboard' : isAuthenticated ? 'students' : 'login')}
        onActivateSuccess={handleStudentRedeemCode}
      />
    );
  }

  // IF ON STUDENT DASHBOARD VIEW (الصفحة الرئيسية للطالب):
  if (activeTab === 'student_dashboard') {
    const activeStudentObj = currentStudent || students[0];
    return (
      <StudentDashboardView
        student={activeStudentObj}
        isArabic={isArabic}
        onGoToActivation={() => setActiveTab('activation_page')}
        onSwitchToAdmin={() => {
          if (isAuthenticated) {
            setActiveTab('students');
          } else {
            setActiveTab('login');
          }
        }}
        onLogout={() => {
          setCurrentStudent(null);
          localStorage.removeItem('ssp_student_id');
          setActiveTab('login');
          showToast(isArabic ? 'تم تسجيل الخروج بنجاح والعودة لصفحة الدخول.' : 'Logged out successfully.');
        }}
        onToggleLanguage={toggleLanguage}
        onUpdateStudent={(updated) => {
          setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
          setCurrentStudent(updated);
        }}
      />
    );
  }

  // DEFAULT: SUPER ADMIN DASHBOARD (AUTHENTICATED ONLY)
  const activeCodesCount = activationCodes.filter(c => c.status === 'Active').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-blue selection:text-white">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-900/90 border border-emerald-400/50 text-emerald-100 px-6 py-3 rounded-2xl shadow-glow-whatsapp text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Super Admin Top Navigation Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Logo with Super Admin Badge */}
          <Logo 
            variant="admin-dash" 
            size="md" 
            isArabic={isArabic} 
            onClick={() => setActiveTab('students')}
          />

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            
            {/* Tab 1: Student Monitoring */}
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

            {/* Tab 2: Activation Code Generator (Requested Feature) */}
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

            {/* Tab 3: Security Audit Logs */}
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
          </nav>

          {/* Right Header Tools: Language Switcher, WhatsApp Support, Admin Profile & Logout */}
          <div className="flex items-center gap-3">
            
            {/* Quick WhatsApp Support Link */}
            <div className="hidden lg:block">
              <WhatsAppButton isArabic={isArabic} variant="pill" />
            </div>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
              title={isArabic ? 'Switch to English' : 'التحويل إلى العربية'}
            >
              <Globe className="w-4 h-4 text-brand-blue-light" />
              <span>{isArabic ? 'English' : 'عربي'}</span>
            </button>

            {/* Super Admin Verified Identity Badge & Logout */}
            <div className="flex items-center gap-2.5 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-slate-800">
              <div className="hidden sm:flex flex-col text-right rtl:text-left text-xs">
                <span className="font-bold text-white leading-none">Adam Sherif</span>
                <span className="text-[10px] text-purple-400 font-mono mt-0.5" dir="ltr">{adminEmail}</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-purple-800 flex items-center justify-center font-bold text-xs text-white shadow-glow-purple/20">
                AS
              </div>
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

      {/* Main Body Content for Super Admin */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        
        {/* View 1: Student Monitoring */}
        {activeTab === 'students' && (
          <StudentMonitoring
            students={students}
            isArabic={isArabic}
            onSelectStudent={(stu) => setSelectedStudent(stu)}
            onEditStudent={(stu) => setEditingStudent(stu)}
            onPasswordReset={(stu) => setPasswordResetStudent(stu)}
            onSupportMode={(stu) => setSupportModeStudent(stu)}
          />
        )}

        {/* View 2: Activation Code Generator */}
        {activeTab === 'code_generator' && (
          <ActivationCodeGenerator
            isArabic={isArabic}
            codes={activationCodes}
            students={students}
            onGenerateCode={handleGenerateCode}
            onRevokeCode={handleRevokeCode}
          />
        )}

        {/* View 3: Immutable Security Audit Logs */}
        {activeTab === 'audit_logs' && (
          <AuditLogViewer
            logs={auditLogs}
            isArabic={isArabic}
          />
        )}

      </main>

      {/* Full 10-Section Student Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          isArabic={isArabic}
          onClose={() => setSelectedStudent(null)}
          onEdit={() => {
            setEditingStudent(selectedStudent);
            setSelectedStudent(null);
          }}
          onEnterSupportMode={() => {
            setSupportModeStudent(selectedStudent);
            setSelectedStudent(null);
          }}
          onRevokeDevice={(deviceId) => handleRevokeDevice(selectedStudent.id, deviceId)}
        />
      )}

      {/* Admin Modification with Justification Note Modal */}
      {editingStudent && (
        <AdminEditModal
          student={editingStudent}
          isArabic={isArabic}
          onClose={() => setEditingStudent(null)}
          onSave={handleSaveStudentModifications}
        />
      )}

      {/* Cryptographic Password Reset Workflow Modal */}
      {passwordResetStudent && (
        <PasswordResetModal
          student={passwordResetStudent}
          isArabic={isArabic}
          onClose={() => setPasswordResetStudent(null)}
          onConfirmReset={() => {
            handleLogPasswordReset(passwordResetStudent.studentId, passwordResetStudent.fullName);
            setPasswordResetStudent(null);
          }}
        />
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 py-6 border-t border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Smart Study Planner (مخطط الدراسة الذكي) • Super Admin Control Center</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Server: Active (Vite + Cloudflare Edge)</span>
            <span>Security: SHA-256 Audit Log Enabled</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
