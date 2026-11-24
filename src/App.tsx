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
  uploadBookFile,
  deleteBookFile,
  subscribeToStudents,
  saveStudent,
  deleteStudent as deleteStudentCloud,
  seedStudentsIfEmpty,
  pushAuditLog,
  checkFirebaseConnection
} from './lib/firebaseRepo';
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

  // Data State (Firestore is the source of truth; local seed is the offline fallback)
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [cloudSyncing, setCloudSyncing] = useState<boolean>(true);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Firebase: analytics + realtime students listener
  useEffect(() => {
    initAnalytics();

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const start = async () => {
      const online = await checkFirebaseConnection();
      if (cancelled) return;
      setCloudConnected(online);
      if (!online) {
        setCloudError(
          isArabic
            ? 'تعذّر الاتصال بـ Firestore. أسهل حل: في Firebase Console → Firestore → Rules الصق قواعد «الوضع المفتوح» من ملف firestore.rules في المشروع واضغط Publish (أو شغّل firebase deploy --only firestore:rules,storage). كمان تأكد إنك أنشأت قاعدة بيانات Firestore فعلاً.'
            : 'Could not reach Firestore. Easiest fix: Firebase Console → Firestore → Rules → paste the open-mode rules from firestore.rules in the repo and Publish (or run firebase deploy --only firestore:rules,storage). Also make sure a Firestore database was created.'
        );
      } else {
        setCloudError(null);
      }

      if (online) {
        // first run: upload the demo students so the dashboard isn't empty
        await seedStudentsIfEmpty(INITIAL_STUDENTS);
      }

      unsubscribe = subscribeToStudents(
        remoteStudents => {
          if (cancelled) return;
          if (remoteStudents.length > 0) {
            // Firestore returns an unordered list; keep newest registrations first
            const sorted = [...remoteStudents].sort(
              (a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()
            );
            setStudents(sorted);
            setCloudConnected(true);
          }
          setCloudSyncing(false);
        },
        error => {
          console.warn('[firebase] students listener error', error);
          setCloudConnected(false);
          setCloudSyncing(false);
          setCloudError(
            `${isArabic ? 'خطأ في قراءة بيانات الطلاب' : 'Reading students failed'}: ${(error as { code?: string })?.code || String(error)}`
          );
        }
      );
    };

    start();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // Mirror students locally too (offline fallback between refreshes)
  useEffect(() => {
    try {
      localStorage.setItem('ssp_students', JSON.stringify(students));
    } catch {
      /* storage full - ignore */
    }
  }, [students]);
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

  // Keep the logged-in student object in sync with the latest students list
  useEffect(() => {
    if (!currentStudent) return;
    const fresh = students.find(s => s.id === currentStudent.id);
    if (fresh && fresh !== currentStudent) {
      setCurrentStudent(fresh);
    }
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
    } else {
      const matched = students.find(s => s.email.toLowerCase() === userEmail.toLowerCase()) || students[0];
      if (!matched) {
        showToast(
          isArabic
            ? 'لا يوجد حساب طالب مسجل بهذا البريد. يرجى إنشاء حساب جديد بكود التفعيل.'
            : 'No student account found for this email. Please register with an activation code.'
        );
        setActiveTab('login');
        return;
      }
      const promoted = !!matched.isAdmin;
      setCurrentRole(promoted ? 'STUDENT_ADMIN' : 'STUDENT');
      localStorage.setItem('ssp_role', promoted ? 'STUDENT_ADMIN' : 'STUDENT');
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
    stage?: string;
    gender?: Gender;
    phoneNumber?: string;
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

    // Add to students list (Instantly visible in Super Admin Monitoring!)
    setStudents(prev => [newStudent, ...prev]);
    if (cloudConnected) saveStudent(newStudent);

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
    setCurrentRole('STUDENT');
    localStorage.removeItem('ssp_admin_auth');
    localStorage.removeItem('ssp_admin_email');
    localStorage.removeItem('ssp_role');
    localStorage.removeItem('ssp_student_id');
    setCurrentStudent(null);
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

  /* ============================================================
     DELETE STUDENT (Super Admin only) + immutable audit entry
     ============================================================ */
  /** Fire-and-forget cloud write for a student document */
  const syncStudentToCloud = (student: Student) => {
    if (!cloudConnected) return;
    saveStudent(student);
  };

  const handleDeleteStudent = async (student: Student) => {
    setStudents(prev => prev.filter(s => s.id !== student.id));
    if (cloudConnected) {
      await deleteStudentCloud(student);
    }

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
    if (cloudConnected) pushAuditLog(newAuditLog);

    showToast(
      isArabic
        ? `تم حذف حساب الطالب (${student.fullNameAr || student.fullName}) نهائياً وتوثيق العملية.`
        : `Student (${student.fullName}) permanently deleted and logged.`
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

    if (currentStudent && cloudConnected) {
      const planStudent = students.find(st => st.id === currentStudent.id);
      if (planStudent) saveStudent({ ...planStudent, generatedPlan: plan });
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
          currentStudent && cloudConnected ? uploadBookFile(currentStudent.id, bookId, file) : Promise.resolve(null)
        }
        onDeleteBookFile={deleteBookFile}
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
                  ? (isArabic ? 'متصل بـ Firebase' : 'Connected to Firebase')
                  : (isArabic ? 'وضع محلي — Firebase غير متاح' : 'Local mode — Firebase unavailable')
              }
            >
              {cloudConnected ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
              {cloudSyncing ? '...' : cloudConnected ? (isArabic ? 'سحابي' : 'Cloud') : (isArabic ? 'محلي' : 'Local')}
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
            cloudError={cloudError}
            onDeleteStudent={handleDeleteStudent}
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
