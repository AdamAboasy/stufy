/**
 * إحصائيات الطالب الحقيقية — بتتحسب من جدوله الفعلي (generatedPlan).
 * ============================================================
 * قبل كده `overallProgress` و`performanceReport` كانوا بيتكتبوا بصفر وقت التسجيل
 * ومبيتحدّثوش أبداً، فالأدمن كان يشوف أصفار حتى لو الطالب خلّص حصص.
 * دلوقتي الأرقام مشتقّة من الحصص المكتملة وبتتحدّث عند أي عرض/حفظ.
 *
 * ملاحظة: الحصة مفيهاش وقت إنجاز، فالـ streak والنشاط الأسبوعي بيتحسبوا على
 * «تاريخ الحصة المجدولة» للحصص المكتملة (تقريب موثّق).
 *
 * Pure module (no Firebase/DOM) so it is unit-testable with node --test.
 */
import type { GeneratedPlan, PerformanceReport, Student } from '../types';

export interface DerivedStats {
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  delayedSessions: number;
  progressPercent: number;
  totalHoursStudied: number;
  averageDailyMinutes: number;
  studyStreakDays: number;
  weeklyActivity: { day: string; hours: number }[];
}

export const toLocalIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (iso: string, delta: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toLocalIsoDate(d);
};

export const deriveStats = (plan: GeneratedPlan | null | undefined, today: string): DerivedStats => {
  const sessions = plan?.sessions ?? [];
  const done = sessions.filter(s => s.isCompleted);
  const minutesByDay = new Map<string, number>();
  for (const s of done) {
    minutesByDay.set(s.date, (minutesByDay.get(s.date) || 0) + (s.durationMinutes || 0));
  }
  const totalMinutes = done.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  // streak: أيام متتالية فيها حصة مكتملة، بتنتهي النهاردة (أو امبارح لو النهاردة لسه)
  let cursor = minutesByDay.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (minutesByDay.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const weeklyActivity: { day: string; hours: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const iso = addDays(today, -i);
    const label = new Date(`${iso}T00:00:00`).toLocaleDateString('en', { weekday: 'short' });
    weeklyActivity.push({ day: label, hours: Math.round(((minutesByDay.get(iso) || 0) / 60) * 10) / 10 });
  }

  return {
    totalSessions: sessions.length,
    completedSessions: done.length,
    remainingSessions: sessions.length - done.length,
    delayedSessions: sessions.filter(s => !s.isCompleted && s.date < today).length,
    progressPercent: sessions.length ? Math.round((done.length / sessions.length) * 100) : 0,
    totalHoursStudied: Math.round((totalMinutes / 60) * 10) / 10,
    averageDailyMinutes: minutesByDay.size ? Math.round(totalMinutes / minutesByDay.size) : 0,
    studyStreakDays: streak,
    weeklyActivity
  };
};

/**
 * بيرجّع الطالب بأرقام محسوبة من خطته. لو مفيش خطة بنسيب القيم المخزّنة زي ما هي
 * (طلبة قدامى). حقول الاختبارات/الإتقان بتفضل زي ما هي — مبنخترعش درجات.
 */
export const withDerivedStats = (student: Student, today: string): Student => {
  const plan = student.generatedPlan;
  if (!plan || !plan.sessions?.length) return student;
  const s = deriveStats(plan, today);
  const prev: PerformanceReport = student.performanceReport || {
    overallScore: 0,
    studyStreakDays: 0,
    totalHoursStudied: 0,
    quizAccuracyPercent: 0,
    averageDailyMinutes: 0,
    subjectMastery: [],
    weeklyActivity: []
  };
  return {
    ...student,
    overallProgress: s.progressPercent,
    performanceReport: {
      ...prev,
      studyStreakDays: s.studyStreakDays,
      totalHoursStudied: s.totalHoursStudied,
      averageDailyMinutes: s.averageDailyMinutes,
      weeklyActivity: s.weeklyActivity
    }
  };
};
