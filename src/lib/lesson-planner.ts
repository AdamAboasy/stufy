import { parseISODate, toISODate } from "./dates.ts";
import type { Lesson } from "./types";

export type LessonPlanInput = {
  lessons: Lesson[];
  startDate: string;
  endDate: string;
  restWeekdays: number[];
  dailyAvailableMinutes: number;
  preferredSessionMinutes: number;
  /** Prerequisites already completed by the student need not be included in this plan. */
  completedLessonIds?: string[];
};
export type ScheduledLesson = { lessonId: string; scheduledDate: string; estimatedDuration: number };
export type LessonPlanError = "no-lessons" | "invalid-range" | "no-study-days" | "invalid-time" | "dependencies-exceed-window" | "edited-date-invalid" | "daily-capacity-exceeded" | "invalid-preview";
export type LessonPlanResult = { ok: true; assignments: ScheduledLesson[]; daysUsed: number; totalMinutes: number } | { ok: false; error: LessonPlanError };

const DIFFICULTY_WEIGHT = { easy: 1, medium: 1.15, hard: 1.35 } as const;

function uniqueLessons(lessons: Lesson[]): Lesson[] {
  return Array.from(new Map(lessons.map((lesson) => [lesson.id, lesson])).values());
}

/** Schedule each unique lesson once, preserving source order unless dependencies require otherwise. */
export function generateLessonPlan(input: LessonPlanInput): LessonPlanResult {
  const { restWeekdays, startDate, endDate } = input;
  const lessons = uniqueLessons(input.lessons);
  if (!lessons.length) return { ok: false, error: "no-lessons" };
  if (!Number.isFinite(input.dailyAvailableMinutes) || input.dailyAvailableMinutes <= 0 || !Number.isFinite(input.preferredSessionMinutes) || input.preferredSessionMinutes <= 0) return { ok: false, error: "invalid-time" };
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  if (!start || !end || end.getTime() < start.getTime()) return { ok: false, error: "invalid-range" };

  const dates: string[] = [];
  const cursor = new Date(start);
  let scanned = 0;
  while (cursor.getTime() <= end.getTime()) {
    if (++scanned > 400) return { ok: false, error: "invalid-range" };
    if (!restWeekdays.includes(cursor.getDay())) dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (!dates.length) return { ok: false, error: "no-study-days" };

  const pending = [...lessons].sort((a, b) => a.lessonOrder - b.lessonOrder || a.id.localeCompare(b.id));
  const allIds = new Set(pending.map((lesson) => lesson.id));
  const completedIds = new Set(input.completedLessonIds ?? []);
  const assignments: ScheduledLesson[] = [];
  const scheduledDates = new Map<string, string>();
  while (pending.length) {
    const readyIndex = pending.findIndex((lesson) => (lesson.dependsOn ?? []).every((id) => completedIds.has(id) || (allIds.has(id) && scheduledDates.has(id))));
    if (readyIndex < 0) return { ok: false, error: "dependencies-exceed-window" };
    const [lesson] = pending.splice(readyIndex, 1);
    const dependencyDates = (lesson.dependsOn ?? []).map((id) => scheduledDates.get(id)).filter((date): date is string => Boolean(date));
    const latestDependency = dependencyDates.sort().at(-1);
    const firstPossibleDate = latestDependency ? dates.findIndex((date) => date > latestDependency) : 0;
    if (firstPossibleDate < 0) return { ok: false, error: "dependencies-exceed-window" };

    const rawMinutes = Math.max(5, lesson.estimatedDuration || input.preferredSessionMinutes);
    const weightedMinutes = Math.max(input.preferredSessionMinutes, Math.round(rawMinutes * DIFFICULTY_WEIGHT[lesson.difficulty]));
    const duration = Math.min(weightedMinutes, input.dailyAvailableMinutes);
    let chosenDate: string | undefined;
    for (let index = firstPossibleDate; index < dates.length; index += 1) {
      const date = dates[index];
      const alreadyUsed = assignments.filter((assignment) => assignment.scheduledDate === date).reduce((sum, assignment) => sum + assignment.estimatedDuration, 0);
      if (input.dailyAvailableMinutes - alreadyUsed >= duration) { chosenDate = date; break; }
    }
    if (!chosenDate) return { ok: false, error: "dependencies-exceed-window" };
    scheduledDates.set(lesson.id, chosenDate);
    assignments.push({ lessonId: lesson.id, scheduledDate: chosenDate, estimatedDuration: duration });
  }

  return {
    ok: true,
    assignments,
    daysUsed: new Set(assignments.map((assignment) => assignment.scheduledDate)).size,
    totalMinutes: assignments.reduce((sum, assignment) => sum + assignment.estimatedDuration, 0),
  };
}

/** Revalidate the complete preview before save so edits cannot violate planner constraints. */
export function validateLessonAssignments(input: LessonPlanInput, assignments: ScheduledLesson[]): LessonPlanError | null {
  const lessons = uniqueLessons(input.lessons);
  if (!lessons.length) return "no-lessons";
  if (!Number.isFinite(input.dailyAvailableMinutes) || input.dailyAvailableMinutes <= 0 || !Number.isFinite(input.preferredSessionMinutes) || input.preferredSessionMinutes <= 0) return "invalid-time";
  const start = parseISODate(input.startDate);
  const end = parseISODate(input.endDate);
  if (!start || !end || end.getTime() < start.getTime()) return "invalid-range";

  const byId = new Map(assignments.map((assignment) => [assignment.lessonId, assignment]));
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  if (assignments.length !== lessonIds.size || byId.size !== assignments.length || lessons.some((lesson) => !byId.has(lesson.id))) return "invalid-preview";

  const dailyMinutes = new Map<string, number>();
  const restDays = new Set(input.restWeekdays);
  for (const assignment of assignments) {
    const date = parseISODate(assignment.scheduledDate);
    if (!date || assignment.scheduledDate < input.startDate || assignment.scheduledDate > input.endDate || restDays.has(date.getDay())) return "edited-date-invalid";
    if (!Number.isFinite(assignment.estimatedDuration) || assignment.estimatedDuration <= 0) return "invalid-preview";
    const total = (dailyMinutes.get(assignment.scheduledDate) ?? 0) + assignment.estimatedDuration;
    if (total > input.dailyAvailableMinutes) return "daily-capacity-exceeded";
    dailyMinutes.set(assignment.scheduledDate, total);
  }

  const completedIds = new Set(input.completedLessonIds ?? []);
  for (const lesson of lessons) {
    const assignment = byId.get(lesson.id)!;
    for (const prerequisiteId of lesson.dependsOn ?? []) {
      if (completedIds.has(prerequisiteId)) continue;
      const prerequisite = byId.get(prerequisiteId);
      if (!prerequisite || prerequisite.scheduledDate >= assignment.scheduledDate) return "dependencies-exceed-window";
    }
  }
  return null;
}
