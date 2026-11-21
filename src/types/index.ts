export type Language = "ar" | "en";
export type Theme = "light" | "dark" | "system";
export type UserRole = "admin" | "student";
export type AccountStatus = "active" | "suspended";

export type PlanType = "weekly" | "monthly" | "quarterly" | "yearly";
export type CodeStatus =
  | "available"
  | "active"
  | "expired"
  | "revoked"
  | "suspended";
export type SubscriptionStatus =
  | "active"
  | "expired"
  | "suspended"
  | "revoked";

export type DeviceStatus = "active" | "revoked";
export type DeviceRequestStatus = "pending" | "approved" | "rejected";

export type FileProcessingStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "requires_review";

export type SupportedFileType =
  | "pdf"
  | "doc"
  | "docx"
  | "jpg"
  | "jpeg"
  | "png"
  | "webp";

export type PageSource = "printed" | "pdf_index" | "estimated";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "delayed";

export type StudyPlanStatus = "draft" | "active" | "completed" | "paused";

export type RepeatType = "daily" | "weekdays" | "custom" | "once";

export type SessionStatus = "in_progress" | "completed" | "cancelled";

export type NotificationType =
  | "plan_created"
  | "file_processed"
  | "file_failed"
  | "task_deadline"
  | "task_delayed"
  | "schedule_changed"
  | "device_approved"
  | "device_rejected"
  | "subscription_expiring"
  | "subscription_expired"
  | "generic";

export const PLAN_DURATIONS: Record<PlanType, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export interface SessionUser {
  uid: string;
  role: UserRole;
  admin: boolean;
  phoneNumber: string;
  fullName: string;
  language: Language;
  accountStatus: AccountStatus;
}

export interface StudentProfile {
  uid: string;
  fullName: string;
  phoneNumber: string;
  role: "student";
  createdAt: string;
  accountStatus: AccountStatus;
  preferredLanguage: Language;
  theme: Theme;
  timezone: string;
  restDays: number[];
  preferredSessionMinutes: number;
  dailyStudyMinutes: number;
}

export interface AdminProfile {
  uid: string;
  fullName: string;
  phoneNumber: string;
  role: "admin";
  createdAt: string;
}

export interface ActivationCode {
  id: string;
  codeHash: string;
  codePrefix: string;
  planType: PlanType;
  status: CodeStatus;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  activatedByStudentId: string | null;
  createdByAdminId: string;
  notes: string;
  batchId: string;
}

export interface GeneratedCode extends ActivationCode {
  plaintext: string;
}

export interface Subscription {
  id: string;
  studentId: string;
  activationCodeId: string;
  planType: PlanType;
  startedAt: string;
  expiresAt: string;
  status: SubscriptionStatus;
  renewedAt: string | null;
  studentName?: string;
  studentPhone?: string;
}

export interface Device {
  id: string;
  studentId: string;
  deviceTokenHash: string;
  deviceName: string;
  userAgent: string;
  registeredAt: string;
  lastSeenAt: string;
  status: DeviceStatus;
}

export interface DeviceChangeRequest {
  id: string;
  studentId: string;
  studentName: string;
  currentDeviceId: string | null;
  currentDeviceName: string | null;
  requestedDeviceName: string;
  requestedUserAgent: string;
  requestedDeviceTokenHash: string;
  status: DeviceRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByAdminId: string | null;
  adminNote: string;
}

export interface UploadedFile {
  id: string;
  studentId: string;
  originalName: string;
  storagePath: string;
  fileType: SupportedFileType;
  mimeType: string;
  fileSize: number;
  processingStatus: FileProcessingStatus;
  totalPages: number | null;
  extractedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  unreadablePages: number[];
  extractionId: string | null;
}

export interface ExtractedTopic {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  pageSource: PageSource;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  summary: string;
  isEstimate: boolean;
}

export interface ExtractedChapter {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  pageSource: PageSource;
  topics: ExtractedTopic[];
}

export interface ExtractionResult {
  id: string;
  fileId: string;
  studentId: string;
  language: Language | "mixed" | "unknown";
  totalPages: number;
  pageSource: PageSource;
  chapters: ExtractedChapter[];
  uncertainty: string[];
  warnings: string[];
  rawTextPreview: string;
  extractedAt: string;
  usedLlm: boolean;
}

export interface FileProcessingJob {
  id: string;
  fileId: string;
  studentId: string;
  status: FileProcessingStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  originalName: string;
}

export interface Routine {
  id: string;
  studentId: string;
  title: string;
  startTime: string;
  endTime: string;
  repeatDays: number[];
  repeatType: RepeatType;
  customDates: string[];
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface StudyTask {
  id: string;
  planId: string;
  studentId: string;
  title: string;
  subject: string;
  sourceFileId: string;
  sourceFileName: string;
  chapter: string;
  topicId: string | null;
  pageStart: number;
  pageEnd: number;
  pageSource: PageSource;
  scheduledDate: string;
  estimatedDuration: number;
  actualDuration: number;
  status: TaskStatus;
  notes: string;
  sortOrder: number;
  createdAt: string;
  completedAt: string | null;
}

export interface StudyPlan {
  id: string;
  studentId: string;
  title: string;
  sourceFileId: string;
  sourceFileName: string;
  startDate: string;
  endDate: string;
  status: StudyPlanStatus;
  restDays: number[];
  dailyStudyMinutes: number;
  sessionMinutes: number;
  totalChapters: number;
  totalPages: number;
  totalTasks: number;
  completedTasks: number;
  explanation: string;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  studentId: string;
  taskId: string;
  planId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number;
  status: SessionStatus;
}

export interface AppNotification {
  id: string;
  studentId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  readAt: string | null;
  link: string | null;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorRole: UserRole;
  actorName: string;
  action: string;
  targetId: string;
  timestamp: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface DailyStats {
  date: string;
  completedTasks: number;
  remainingTasks: number;
  delayedTasks: number;
  actualMinutes: number;
  pagesCompleted: number;
  completionPercent: number;
}

export interface PlanPreview {
  title: string;
  startDate: string;
  endDate: string;
  totalChapters: number;
  totalPages: number;
  restDays: number[];
  dailyStudyMinutes: number;
  sessionMinutes: number;
  explanation: string;
  warnings: string[];
  days: Array<{
    date: string;
    isRestDay: boolean;
    availableMinutes: number;
    estimatedMinutes: number;
    tasks: Array<{
      title: string;
      chapter: string;
      pageStart: number;
      pageEnd: number;
      pageSource: PageSource;
      estimatedDuration: number;
      topicId: string | null;
      subject: string;
    }>;
  }>;
}

export interface RescheduleProposal {
  reason: string;
  explanation: string;
  plan: PlanPreview;
  unchangedCompleted: number;
  movedTasks: number;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  maxFileSizeMb: number;
  subscriptionReminderDays: number;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}
