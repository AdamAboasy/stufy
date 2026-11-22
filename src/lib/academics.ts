import type { EducationLevel } from "./types";

export type Language = "ar" | "en";
export type AcademicOption = { value: string; label: string };
export type SchoolGradeLevel = "primary" | "preparatory" | "secondary";
export type GradeOptions = Record<Language, Record<SchoolGradeLevel, string[]>>;

/** Defaults are centralized so an administrator-managed Firestore config can replace them later. */
export const ACADEMIC_OPTIONS: Record<EducationLevel, AcademicOption> = {
  primary: { value: "primary", label: "Primary School / المرحلة الابتدائية" },
  preparatory: { value: "preparatory", label: "Preparatory School / المرحلة الإعدادية" },
  secondary: { value: "secondary", label: "Secondary School / المرحلة الثانوية" },
  university: { value: "university", label: "University / الجامعة" },
  other: { value: "other", label: "Other / أخرى" },
};

export const LEVEL_LABELS: Record<Language, Record<EducationLevel, string>> = {
  en: { primary: "Primary School", preparatory: "Preparatory School", secondary: "Secondary School", university: "University", other: "Other" },
  ar: { primary: "المرحلة الابتدائية", preparatory: "المرحلة الإعدادية", secondary: "المرحلة الثانوية", university: "الجامعة", other: "أخرى" },
};

export const DEFAULT_GRADE_OPTIONS: GradeOptions = {
  en: {
    primary: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"],
    preparatory: ["Grade 1", "Grade 2", "Grade 3"],
    secondary: ["Grade 1", "Grade 2", "Grade 3"],
  },
  ar: {
    primary: ["الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس"],
    preparatory: ["الصف الأول", "الصف الثاني", "الصف الثالث"],
    secondary: ["الصف الأول", "الصف الثاني", "الصف الثالث"],
  },
};

export function normalizeGradeOptions(raw: unknown): GradeOptions {
  const result: GradeOptions = structuredClone(DEFAULT_GRADE_OPTIONS);
  if (!raw || typeof raw !== "object") return result;
  const input = raw as Record<string, unknown>;
  for (const language of ["en", "ar"] as const) {
    const localized = input[language];
    if (!localized || typeof localized !== "object") continue;
    const levels = localized as Record<string, unknown>;
    for (const level of ["primary", "preparatory", "secondary"] as const) {
      const values = levels[level];
      if (Array.isArray(values)) {
        result[language][level] = Array.from(new Set(values.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))).slice(0, 30);
      }
    }
  }
  return result;
}

export function gradesFor(level: EducationLevel, language: Language, options: GradeOptions = DEFAULT_GRADE_OPTIONS): string[] {
  if (level === "university" || level === "other") return [];
  return options[language][level];
}

export const ACADEMIC_COPY: Record<Language, {
  question: string; level: string; grade: string; select: string; university: string;
  universityName: string; faculty: string; academicYear: string; otherLevel: string;
  required: string; save: string;
}> = {
  en: {
    question: "What is your current academic year?", level: "Education level", grade: "Grade", select: "Choose an option",
    university: "University details (optional)", universityName: "University name", faculty: "Faculty", academicYear: "Academic year",
    otherLevel: "Please specify your academic level", required: "Choose your education level to continue.", save: "Save academic information",
  },
  ar: {
    question: "أنت في سنة دراسية كام؟", level: "المرحلة الدراسية", grade: "الصف الدراسي", select: "اختر من القائمة",
    university: "بيانات الجامعة (اختيارية)", universityName: "اسم الجامعة", faculty: "الكلية", academicYear: "السنة الدراسية",
    otherLevel: "يرجى تحديد مرحلتك الدراسية", required: "اختر المرحلة الدراسية للمتابعة.", save: "حفظ البيانات الدراسية",
  },
};
