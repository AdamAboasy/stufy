"use client";

import { useMemo, useState } from "react";
import { LessonRow } from "@/components/lesson-row";
import { useAuth } from "@/lib/auth";
import { updateLesson, useLessons } from "@/lib/data";
import { formatDate, todayISO } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import type { Lesson, LessonStatus } from "@/lib/types";

type Filter = "all" | "today" | "pending" | "done";

export default function TasksPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { items, loading, error } = useLessons(user?.uid);
  const [filter, setFilter] = useState<Filter>("pending");
  const today = todayISO();
  const grouped = useMemo(() => {
    const unique = Array.from(new Map(items.map((lesson) => [lesson.id, lesson])).values());
    const visible = unique.filter((lesson) => {
      if (filter === "today") return lesson.scheduledDate === today;
      if (filter === "pending") return lesson.status !== "completed";
      if (filter === "done") return lesson.status === "completed";
      return true;
    });
    const byDate = new Map<string, Lesson[]>();
    for (const lesson of visible) {
      const date = lesson.scheduledDate ?? "unplanned";
      byDate.set(date, [...(byDate.get(date) ?? []), lesson]);
    }
    return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items, filter, today]);
  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: t("filterAll") }, { id: "today", label: t("filterToday") },
    { id: "pending", label: t("filterPending") }, { id: "done", label: t("filterDone") },
  ];
  async function setStatus(lesson: Lesson, status: LessonStatus) { if (user?.uid) await updateLesson(user.uid, lesson.id, { status }); }

  return (
    <div className="stack">
      <h1 className="page-title">{t("tasksTitle")}</h1>
      <div className="chips">{filters.map((item) => <button key={item.id} type="button" className="chip" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">{t("loading")}</p> : null}
      {!loading && grouped.length === 0 ? <p className="muted">{t("noLessons")}</p> : null}
      {grouped.map(([date, dayLessons]) => <section className="stack" key={date}><h2 className="day-heading">{date === "unplanned" ? t("upcoming") : formatDate(date, lang)}</h2>{dayLessons.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} onStatus={(status) => void setStatus(lesson, status)} />)}</section>)}
    </div>
  );
}
