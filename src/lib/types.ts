export type Role = "student" | "super_admin";
export type EducationLevel = "primary" | "preparatory" | "secondary" | "university" | "other";

/** Display/profile data only. Authorization must use the Firebase Auth custom claim. */
export type StudentProfile = {
  uid: string;
  fullName: string;
  phoneNumber?: string;
  role: "student";
  educationLevel?: EducationLevel;
  academicGrade?: string;
  universityName?: string;
  faculty?: string;
  academicYear?: string;
  otherAcademicLevel?: string;
  createdAt: number;
  updatedAt: number;
};

/** Existing page-based subject records remain readable during the lesson migration. */
export type Subject = {
  id: string;
  name: string;
  totalPages?: number;
  totalLessons?: number;
  color: string;
  /** ISO date (YYYY-MM-DD) or null */
  examDate: string | null;
  createdAt: number;
};

/** Legacy page task schema. Retain source page ranges; do not treat these as lessons. */
export type Task = {
  id: string;
  subjectId: string;
  subjectName: string;
  color: string;
  date: string;
  fromPage: number;
  toPage: number;
  minutes: number;
  done: boolean;
  doneAt: number | null;
};

export type LessonStatus = "not_started" | "in_progress" | "completed" | "delayed";
export type Difficulty = "easy" | "medium" | "hard";

export type Lesson = {
  id: string;
  studentId: string;
  planId?: string;
  sourceFileId?: string;
  subjectId: string;
  title: string;
  subject: string;
  chapterName?: string;
  description?: string;
  lessonOrder: number;
  difficulty: Difficulty;
  estimatedDuration: number;
  actualDuration: number;
  scheduledDate?: string;
  status: LessonStatus;
  sourcePageStart?: number;
  sourcePageEnd?: number;
  dependsOn?: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type ProcessingStatus = "uploaded" | "queued" | "processing" | "completed" | "failed" | "requires_review";
export type ReviewSection = { title: string; kind: "subtopic" | "exercise" | "revision"; chapterName?: string; sourcePageStart?: number; sourcePageEnd?: number };
export type UploadedFile = {
  id: string;
  studentId: string;
  originalName: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  processingStatus: ProcessingStatus;
  totalPages?: number;
  extractedLessonsCount?: number;
  reviewSections?: ReviewSection[];
  warning?: string;
  createdAt: number;
  updatedAt: number;
};
