import { adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import { addDaysYmd, ymdInZone } from "@/lib/utils";
import type { DailyStats, StudySession, StudyTask } from "@/types";

export async function studentStats(studentId: string, timezone: string) {
  const today = ymdInZone(new Date(), timezone);
  const weekStart = addDaysYmd(today, -6);

  const tasksSnap = await adminDb()
    .collection(Collections.studyTasks)
    .where("studentId", "==", studentId)
    .limit(500)
    .get();
  const tasks = tasksSnap.docs.map((d) => serializeDoc<StudyTask>(d.id, d.data()));

  const sessionsSnap = await adminDb()
    .collection(Collections.studySessions)
    .where("studentId", "==", studentId)
    .limit(500)
    .get();
  const sessions = sessionsSnap.docs.map((d) => serializeDoc<StudySession>(d.id, d.data()));

  const todayTasks = tasks.filter((t) => t.scheduledDate === today);
  const completedToday = todayTasks.filter((t) => t.status === "completed");
  const delayed = tasks.filter((t) => t.status === "delayed");
  const remaining = tasks.filter((t) => t.status !== "completed");

  const minutesFromSessions = (from: string, to: string) =>
    sessions
      .filter((s) => s.startedAt.slice(0, 10) >= from && s.startedAt.slice(0, 10) <= to)
      .reduce((sum, s) => sum + (s.duration || 0), 0);

  const pagesCompleted = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + Math.max(0, t.pageEnd - t.pageStart + 1), 0);

  const daily: DailyStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDaysYmd(today, -i);
    const dayTasks = tasks.filter((t) => t.scheduledDate === date);
    const done = dayTasks.filter((t) => t.status === "completed");
    daily.push({
      date,
      completedTasks: done.length,
      remainingTasks: dayTasks.length - done.length,
      delayedTasks: dayTasks.filter((t) => t.status === "delayed").length,
      actualMinutes: minutesFromSessions(date, date),
      pagesCompleted: done.reduce((s, t) => s + Math.max(0, t.pageEnd - t.pageStart + 1), 0),
      completionPercent: dayTasks.length ? Math.round((done.length / dayTasks.length) * 100) : 0,
    });
  }

  const bySubject: Record<string, { completed: number; total: number }> = {};
  for (const t of tasks) {
    const key = t.subject || t.chapter || "General";
    bySubject[key] ||= { completed: 0, total: 0 };
    bySubject[key].total += 1;
    if (t.status === "completed") bySubject[key].completed += 1;
  }

  return {
    today: {
      date: today,
      completedTasks: completedToday.length,
      remainingTasks: todayTasks.length - completedToday.length,
      delayedTasks: todayTasks.filter((t) => t.status === "delayed").length,
      actualMinutes: minutesFromSessions(today, today),
      pagesCompleted: completedToday.reduce((s, t) => s + Math.max(0, t.pageEnd - t.pageStart + 1), 0),
      completionPercent: todayTasks.length ? Math.round((completedToday.length / todayTasks.length) * 100) : 0,
    } satisfies DailyStats,
    week: {
      start: weekStart,
      end: today,
      studyMinutes: minutesFromSessions(weekStart, today),
      completedTasks: tasks.filter((t) => t.status === "completed" && t.scheduledDate >= weekStart).length,
      delayedTasks: delayed.length,
    },
    overall: {
      totalStudyMinutes: sessions.reduce((s, x) => s + (x.duration || 0), 0),
      totalPagesStudied: pagesCompleted,
      remainingTasks: remaining.length,
      delayedTasks: delayed.length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === "completed").length,
      overallProgress: tasks.length
        ? Math.round((tasks.filter((t) => t.status === "completed").length / tasks.length) * 100)
        : 0,
    },
    daily,
    bySubject: Object.entries(bySubject).map(([subject, v]) => ({
      subject,
      ...v,
      percent: v.total ? Math.round((v.completed / v.total) * 100) : 0,
    })),
  };
}
