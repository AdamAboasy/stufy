import React, { useState } from 'react';
import { Student, AuditLog, ViewTab, UserRole } from './types';
import { INITIAL_STUDENTS, INITIAL_AUDIT_LOGS } from './data/mockData';
import { Logo } from './components/brand/Logo';
import { WhatsAppButton } from './components/whatsapp/WhatsAppButton';
import { StudentMonitoring } from './components/admin/StudentMonitoring';
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
  Eye, 
  UserCircle, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';

export const App: React.FC = () => {
  // Global App State
  const [isArabic, setIsArabic] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('students');
  const [currentRole, setCurrentRole] = useState<UserRole>('SUPER_ADMIN');

  // Data State
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // Selected Student & Modals State
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

  // Admin Save Modifications with Immutable Audit Log Generation
  const handleSaveStudentModifications = (
    updatedStudent: Student,
    newLogs: Omit<AuditLog, 'id' | 'timestamp'>[]
  ) => {
    // 1. Update students array
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    if (selectedStudent && selectedStudent.id === updatedStudent.id) {
      setSelectedStudent(updatedStudent);
    }

    // 2. Prepend immutable audit logs with generated IDs and timestamps
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

    // Log the revocation in Audit Trail
    const newAuditLog: AuditLog = {
      id: `log-dev-revoke-${Date.now()}`,
      adminId: 'ADMIN-SUPER-01',
      adminName: 'Super Admin',
      targetStudentId: targetStudent.studentId,
      studentName: targetStudent.fullName,
      actionSource: 'ADMIN',
      changedField: 'registeredDevices (Revocation)',
      oldValue: `${revokedDevice?.deviceName || 'Device'} (Linked)`,
      newValue: 'Device Revoked & Session Terminated',
      reason: 'Admin revoked unauthorized/inactive device session to enforce 3-device concurrency limit',
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
      adminId: 'ADMIN-SUPER-01',
      adminName: 'Super Admin',
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
        onBackToDashboard={() => setActiveTab('students')}
        onActivateSuccess={(code) => {
          showToast(
            isArabic 
              ? `تم تفعيل الكود (${code}) بنجاح! تم ترقية الحساب وتفعيل المناهج.` 
              : `Code (${code}) activated successfully!`
          );
        }}
      />
    );
  }

  // IF ON STUDENT DASHBOARD VIEW:
  if (activeTab === 'student_dashboard') {
    const defaultStudent = students[0];
    return (
      <StudentDashboardView
        student={defaultStudent}
        isArabic={isArabic}
        onGoToActivation={() => setActiveTab('activation_page')}
        onSwitchToAdmin={() => setActiveTab('students')}
      />
    );
  }

  // IF ON LOGIN PAGE:
  if (activeTab === 'login') {
    return (
      <LoginPage
        isArabic={isArabic}
        onLoginSuccess={(role) => {
          setCurrentRole(role);
          if (role === 'SUPER_ADMIN') {
            setActiveTab('students');
          } else {
            setActiveTab('student_dashboard');
          }
        }}
        onGoToActivation={() => setActiveTab('activation_page')}
      />
    );
  }

  // DEFAULT: SUPER ADMIN DASHBOARD
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
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'students'
                  ? 'bg-brand-blue text-white shadow-glow-blue/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isArabic ? 'مراقبة ومتابعة الطلاب' : 'Student Monitoring'}</span>
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'audit_logs'
                  ? 'bg-brand-purple text-white shadow-glow-purple/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isArabic ? 'سجلات التدقيق الأمني' : 'Audit Logs'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950 text-purple-300 border border-purple-500/40">
                {auditLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('activation_page')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-brand-whatsapp" />
              <span>{isArabic ? 'صفحة التفعيل' : 'Activation Code'}</span>
            </button>

            <button
              onClick={() => setActiveTab('student_dashboard')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-brand-blue-electric" />
              <span>{isArabic ? 'بوابة الطالب' : 'Student View'}</span>
            </button>
          </nav>

          {/* Right Header Tools: Language Switcher, WhatsApp Button & Profile */}
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

            {/* Admin Profile Pill */}
            <div className="flex items-center gap-2 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-purple-800 flex items-center justify-center font-bold text-xs text-white shadow-glow-purple/20">
                SA
              </div>
              <button
                onClick={() => setActiveTab('login')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                title={isArabic ? 'تسجيل الخروج' : 'Sign Out'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

        {/* Mobile Sub-Navigation */}
        <div className="md:hidden flex items-center justify-around pt-3 border-t border-slate-800/80 mt-2 text-xs">
          <button
            onClick={() => setActiveTab('students')}
            className={`py-1.5 px-3 rounded-lg font-bold ${activeTab === 'students' ? 'text-brand-blue-electric bg-brand-blue/15' : 'text-slate-400'}`}
          >
            {isArabic ? 'مراقبة الطلاب' : 'Students'}
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`py-1.5 px-3 rounded-lg font-bold ${activeTab === 'audit_logs' ? 'text-brand-purple-light bg-brand-purple/15' : 'text-slate-400'}`}
          >
            {isArabic ? 'سجل التدقيق' : 'Audit Logs'}
          </button>
          <button
            onClick={() => setActiveTab('activation_page')}
            className={`py-1.5 px-3 rounded-lg font-bold ${activeTab === 'activation_page' ? 'text-brand-whatsapp bg-brand-whatsapp/15' : 'text-slate-400'}`}
          >
            {isArabic ? 'التفعيل' : 'Activate'}
          </button>
        </div>
      </header>

      {/* Main Admin Dashboard Content Area */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1">
        
        {/* VIEW 1: DEDICATED STUDENT MONITORING SECTION */}
        {activeTab === 'students' && (
          <StudentMonitoring
            students={students}
            isArabic={isArabic}
            onSelectStudent={(student) => setSelectedStudent(student)}
            onEditStudent={(student) => setEditingStudent(student)}
            onLaunchSupportMode={(student) => setSupportModeStudent(student)}
            onResetPassword={(student) => setPasswordResetStudent(student)}
          />
        )}

        {/* VIEW 2: SECURITY AUDIT LOGS SECTION */}
        {activeTab === 'audit_logs' && (
          <AuditLogViewer
            logs={auditLogs}
            isArabic={isArabic}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-5 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Logo variant="symbol" size={20} />
          <span>© 2026 Smart Study Planner (مخطط الدراسة الذكي) • Super Admin Intelligence System</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {isArabic ? 'النظام متصل وآمن' : 'System Operational & Secure'}
          </span>
          <span>Version 2.4.0-Production</span>
        </div>
      </footer>

      {/* MODAL 1: Full 10-Section Student Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          isOpen={!!selectedStudent}
          isArabic={isArabic}
          onClose={() => setSelectedStudent(null)}
          onEdit={(s) => setEditingStudent(s)}
          onLaunchSupportMode={(s) => {
            setSelectedStudent(null);
            setSupportModeStudent(s);
          }}
          onRevokeDevice={handleRevokeDevice}
          onGeneratePasswordReset={(s) => setPasswordResetStudent(s)}
        />
      )}

      {/* MODAL 2: Admin Edit Student & Mandatory Audit Reason Dialog */}
      {editingStudent && (
        <AdminEditModal
          student={editingStudent}
          isOpen={!!editingStudent}
          isArabic={isArabic}
          onClose={() => setEditingStudent(null)}
          onSave={handleSaveStudentModifications}
        />
      )}

      {/* MODAL 3: Secure Password Reset Workflow Dialog */}
      {passwordResetStudent && (
        <PasswordResetModal
          student={passwordResetStudent}
          isOpen={!!passwordResetStudent}
          isArabic={isArabic}
          onClose={() => setPasswordResetStudent(null)}
          onLogResetAction={handleLogPasswordReset}
        />
      )}

    </div>
  );
};
