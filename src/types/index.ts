export type Language = 'ar' | 'en';
export type ThemeMode = 'dark' | 'light';
export type UserRole = 'SUPER_ADMIN' | 'STUDENT';

export type SubscriptionPlan = 'Free' | 'Basic' | 'Pro' | 'Elite VIP';
export type AccountStatus = 'Active' | 'Suspended' | 'Expired' | 'Pending';

export interface RegisteredDevice {
  id: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  ipAddress: string;
  deviceFingerprint: string;
  lastActive: string;
  isCurrent?: boolean;
}

export interface BookPdf {
  id: string;
  title: string;
  subject: string;
  originalFilename: string;
  fileSizeMb: number;
  pageCount: number;
  uploadDate: string;
  isIndexed: boolean;
  analyzedSummary: string;
  keyConceptsCount: number;
}

export interface Lesson {
  id: string;
  title: string;
  titleAr: string;
  durationMinutes: number;
  isCompleted: boolean;
  quizzesTaken: number;
  masteryScore: number; // 0-100
}

export interface Chapter {
  id: string;
  title: string;
  titleAr: string;
  subjectId: string;
  lessons: Lesson[];
}

export interface Subject {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  icon: string;
  color: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  chapters: Chapter[];
}

export interface DailyTask {
  id: string;
  title: string;
  titleAr: string;
  subject: string;
  scheduledTime: string;
  durationMinutes: number;
  isCompleted: boolean;
  streakDays: number;
  isOverdue: boolean;
  completedAt?: string;
}

export interface StudyPlan {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  weeklyTargetHours: number;
  hoursCompleted: number;
  pacing: 'Optimal' | 'Aggressive' | 'Light' | 'Behind Schedule';
  status: 'Active' | 'Completed' | 'Archived';
  completionRate: number;
  tasksCount: number;
}

export interface RevisionRound {
  id: string;
  roundNumber: number;
  title: string;
  titleAr: string;
  targetSubjects: string[];
  progressPercent: number;
  status: 'In Progress' | 'Completed' | 'Upcoming';
  startDate: string;
  targetDate: string;
  mockExamScore?: number;
}

export interface ExamRevisionPlanner {
  targetExamDate: string;
  daysRemaining: number;
  rounds: RevisionRound[];
  weakPoints: { subject: string; topic: string; recommendedAction: string }[];
  nextMockExam: string;
}

export interface PerformanceReport {
  overallScore: number;
  studyStreakDays: number;
  totalHoursStudied: number;
  quizAccuracyPercent: number;
  averageDailyMinutes: number;
  subjectMastery: { subject: string; score: number; color: string }[];
  weeklyActivity: { day: string; hours: number }[];
}

export interface ActivationHistoryItem {
  id: string;
  code: string;
  plan: SubscriptionPlan;
  durationMonths: number;
  activatedAt: string;
  expiresAt: string;
  status: 'Active' | 'Expired' | 'Renewed';
  paymentReference: string;
  paymentMethod: string;
}

export type Gender = 'male' | 'female';

export interface EducationStageOption {
  value: string;
  ar: string;
  en: string;
}

export const EDUCATION_STAGES: EducationStageOption[] = [
  { value: 'primary', ar: 'المرحلة الابتدائية', en: 'Primary School' },
  { value: 'preparatory', ar: 'المرحلة الإعدادية', en: 'Preparatory School' },
  { value: 'secondary-1', ar: 'الصف الأول الثانوي', en: '1st Secondary' },
  { value: 'secondary-2', ar: 'الصف الثاني الثانوي', en: '2nd Secondary' },
  { value: 'secondary-3', ar: 'الصف الثالث الثانوي', en: '3rd Secondary' },
  { value: 'university', ar: 'المرحلة الجامعية', en: 'University' }
];

export interface StudyPlanTask {
  id: string;
  date: string; // YYYY-MM-DD (local date)
  kind: 'study' | 'revision';
  round: number; // 0 = first study pass, 1..n = revision rounds
  pagesFrom: number;
  pagesTo: number;
  estimatedMinutes: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface BookStudyPlan {
  id: string;
  bookTitle: string;
  subject: string;
  originalFilename: string;
  pageCount: number;
  examDate: string; // YYYY-MM-DD
  revisionRounds: number;
  createdAt: string;
  startDate: string; // YYYY-MM-DD
  tasks: StudyPlanTask[];
}

export interface Student {
  id: string;
  studentId: string; // e.g. "STU-2026-8941"
  fullName: string;
  fullNameAr: string;
  email: string;
  phoneNumber: string;
  guardianPhoneNumber: string;
  nationalId: string;
  avatarUrl: string;
  academicYear: string;
  academicYearAr: string;
  status: AccountStatus;
  subscriptionPlan: SubscriptionPlan;
  registrationDate: string;
  subscriptionExpiryDate: string;
  lastActivity: string;
  registeredDevices: RegisteredDevice[];
  uploadedPdfs: BookPdf[];
  studyPlans: StudyPlan[];
  subjects: Subject[];
  dailyTasks: DailyTask[];
  revisionPlanner: ExamRevisionPlanner;
  performanceReport: PerformanceReport;
  activationHistory: ActivationHistoryItem[];
  overallProgress: number; // 0-100
  notes?: string;
  gender?: Gender;
  educationStage?: string; // EDUCATION_STAGES value
  isAdmin?: boolean; // a student who is also granted admin-panel access
  bookPlans?: BookStudyPlan[]; // study plans generated from the student's uploaded books
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  targetStudentId: string;
  studentName: string;
  actionSource: 'ADMIN' | 'STUDENT';
  changedField: string;
  oldValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
}

export interface GeneratedActivationCode {
  id: string;
  code: string;
  plan: SubscriptionPlan;
  durationMonths: number;
  maxDevices: number;
  status: 'Active' | 'Redeemed' | 'Revoked' | 'Expired';
  createdAt: string;
  expiresAt: string;
  assignedStudentId?: string;
  assignedStudentName?: string;
  redeemedAt?: string;
  notes?: string;
  createdByName: string;
}

export type ViewTab = 'students' | 'code_generator' | 'audit_logs' | 'activation_page' | 'student_dashboard' | 'student_settings' | 'login';

