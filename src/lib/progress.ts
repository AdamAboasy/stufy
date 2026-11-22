import { addDays } from "./dates.ts";
import type { Lesson } from "./types";

export function summarizeLessons(lessons: Lesson[], today: string) {
  const unique = Array.from(new Map(lessons.map((lesson) => [lesson.id, lesson])).values());
  const completed = unique.filter((lesson) => lesson.status === "completed");
  const delayed = unique.filter((lesson) => lesson.status === "delayed" || Boolean(lesson.scheduledDate && lesson.scheduledDate < today && lesson.status !== "completed"));
  const todayLessons = unique.filter((lesson) => lesson.scheduledDate === today);
  const todayCompleted = todayLessons.filter((lesson) => lesson.status === "completed").length;
  const weekStart = addDays(today, -6);
  const weekLessons = unique.filter((lesson) => lesson.scheduledDate && lesson.scheduledDate >= weekStart && lesson.scheduledDate <= today);
  const weekCompleted = weekLessons.filter((lesson) => lesson.status === "completed").length;
  return {
    unique,
    completed,
    delayed,
    today: todayLessons,
    overdue: unique.filter((lesson) => lesson.scheduledDate && lesson.scheduledDate < today && lesson.status !== "completed"),
    upcoming: unique.filter((lesson) => lesson.scheduledDate && lesson.scheduledDate > today && lesson.status !== "completed").slice(0, 6),
    total: unique.length,
    remaining: unique.length - completed.length,
    percent: unique.length ? Math.round(completed.length / unique.length * 100) : 0,
    weekLessons: weekLessons.length,
    weekPercent: weekLessons.length ? Math.round(weekCompleted / weekLessons.length * 100) : 0,
    todayPercent: todayLessons.length ? Math.round(todayCompleted / todayLessons.length * 100) : 0,
  };
}
