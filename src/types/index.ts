export type Language = 'ar' | 'en';
export type ThemeMode = 'dark' | 'light';
export type UserRole = 'SUPER_ADMIN' | 'STUDENT' | 'STUDENT_ADMIN';

export type Gender = 'male' | 'female';

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
  /** @deprecated — الرفع اتشال؛ البيانات وصفية فقط */
  fileUrl?: string;
  /** @deprecated — الرفع اتشال؛ البيانات وصفية فقط */
  storagePath?: string;
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

/* ============================================================
   AI Study Plan Engine (books -> auto generated schedule)
   ============================================================ */

export interface StudySession {
  id: string;
  dayIndex: number;          // 0-based day offset from plan start
  date: string;              // YYYY-MM-DD
  chapterTitle: string;
  chapterTitleAr: string;
  pageFrom: number;
  pageTo: number;
  durationMinutes: number;
  kind: 'study' | 'revision' | 'mock';
  roundNumber: number;       // 0 = first pass, 1..N = revision rounds
  title: string;
  titleAr: string;
  isCompleted: boolean;
}

export interface BookChapterMap {
  id: string;
  index: number;
  title: string;
  titleAr: string;
  pageFrom: number;
  pageTo: number;
  pageCount: number;
  weight: number;            // share of the book
}

export interface StudyPreferences {
  examDate: string;
  revisionRounds: number;
  dailyMinutes: number;
  daysOff: number[];         // 0=Sunday .. 6=Saturday
  /** السنة الدراسية اللي الطالب اختارها — المنهج بيتحمّل منها */
  stageId?: string;
  /** كلام الطالب عن يومه وطريقة مذاكرته (اختياري) */
  routineNotes?: string;
  /** المواد اللي اختار يذاكرها (لو مش كل مواد السنة) */
  subjectIds?: string[];
}

/** ملف الطالب الدراسي: السنة + عاداته اليومية اللي عليها بيتبني الجدول */
export interface StudyProfile {
  stageId: string;
  academicYear: string;
  academicYearAr: string;
  /** ساعات المذاكرة المتاحة يومياً */
  dailyHours: number;
  daysOff: number[];         // 0=Sunday .. 6=Saturday
  revisionRounds: number;
  examDate: string;
  subjectIds: string[];
  routineNotes: string;
  updatedAt: string;
}

export interface GeneratedPlan {
  id: string;
  bookId: string;
  bookTitle: string;
  subject: string;
  totalPages: number;
  chapters: BookChapterMap[];
  examDate: string;
  revisionRounds: number;
  dailyMinutes: number;
  startDate: string;
  firstPassEndDate: string;
  createdAt: string;
  sessions: StudySession[];
  rounds: RevisionRound[];
  /** السنة الدراسية اللي الخطة مبنية على منهجها */
  stageId?: string;
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

export interface Student {
  id: string;
  studentId: string; // e.g. "STU-2026-8941"
  /** uid بتاع Firebase Auth لصاحب المستند (بتتحقق منه قواعد الأمان) */
  ownerUid?: string;
  fullName: string;
  fullNameAr: string;
  email: string;
  phoneNumber: string;
  guardianPhoneNumber: string;
  nationalId: string;
  avatarUrl: string;
  gender?: Gender;
  isAdmin?: boolean;         // student promoted to admin by the Super Admin
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
  /** تفضيلات المذاكرة — null لما الطالب لسه ما اختارش (Firestore بيرفض undefined) */
  studyPreferences?: StudyPreferences | null;
  generatedPlan?: GeneratedPlan | null;
  /** السنة الدراسية اللي اختارها الطالب (لمرة واحدة — بيبدأ منها المنهج) */
  curriculumStageId?: string;
  /** عاداته اليومية اللي بيتبني عليها الجدول */
  studyProfile?: StudyProfile | null;
  overallProgress: number; // 0-100
  notes?: string;
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

export type ViewTab =
  | 'students'
  | 'delete_students'
  | 'code_generator'
  | 'audit_logs'
  | 'activation_page'
  | 'student_dashboard'
  | 'login';

export interface AcademicStageOption {
  id: string;
  labelAr: string;
  labelEn: string;
}

