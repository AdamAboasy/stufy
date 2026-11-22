"use client";

import { useMemo } from "react";
import Link from "next/link";
import { LessonRow } from "@/components/lesson-row";
import { useAuth } from "@/lib/auth";
import { updateLesson, useLessons } from "@/lib/data";
import { formatDate, todayISO } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { summarizeLessons } from "@/lib/progress";
import type { Lesson, LessonStatus } from "@/lib/types";

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const lessonsState = useLessons(user?.uid);
  const lessons = lessonsState.items;
  const today = todayISO();

  const view = useMemo(() => summarizeLessons(lessons, today), [lessons, today]);

  async function setStatus(lesson: Lesson, status: LessonStatus) {
    if (user?.uid) await updateLesson(user.uid, lesson.id, { status });
  }
  const displayName = user?.displayName?.trim();

  return (
    <div className="stack">
      <h1 className="page-title">{displayName ? t("hello", { name: displayName }) : t("helloNoName")}</h1>
      {lessonsState.error ? <div className="alert alert-error">{lessonsState.error}</div> : null}
      <div className="card stack">
        <div className="row"><strong>{t("overallProgress")}</strong><span className="spacer" /><strong>{view.percent}%</strong></div>
        <div className="progress" role="progressbar" aria-valuenow={view.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${view.percent}%` }} /></div>
      </div>
      <div className="grid-3">
        <div className="card stat"><span className="stat-value">{view.total}</span><span className="stat-label">{t("totalLessons")}</span></div>
        <div className="card stat"><span className="stat-value">{view.completed.length}</span><span className="stat-label">{t("completedLessons")}</span></div>
        <div className="card stat"><span className="stat-value">{view.remaining}</span><span className="stat-label">{t("remainingLessons")}</span></div>
        <div className="card stat"><span className="stat-value">{view.delayed.length}</span><span className="stat-label">{t("delayedLessons")}</span></div>
        <div className="card stat"><span className="stat-value">{view.today.length}</span><span className="stat-label">{t("todaysLessons")}</span></div>
        <div className="card stat"><span className="stat-value">{view.todayPercent}%</span><span className="stat-label">{t("dailyProgress")}</span></div>
        <div className="card stat"><span className="stat-value">{view.weekPercent}%</span><span className="stat-label">{t("weeklyProgress")}</span></div>
      </div>
      {lessonsState.loading ? <p className="muted">{t("loading")}</p> : null}
      {!lessonsState.loading && view.total === 0 ? <div className="card stack"><p className="muted">{t("noLessons")}</p><Link className="btn btn-primary" href="/library">{t("navLibrary")}</Link></div> : null}
      {view.overdue.length ? <section className="stack"><h2 className="day-heading">{t("overdue")}</h2>{view.overdue.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} onStatus={(status) => void setStatus(lesson, status)} />)}</section> : null}
      <section className="stack">
        <h2 className="day-heading">{t("today")} · <span className="muted">{formatDate(today, lang)}</span></h2>
        {!view.today.length && !lessonsState.loading ? <p className="muted">{t("todayEmpty")}</p> : null}
        {view.today.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} onStatus={(status) => void setStatus(lesson, status)} />)}
      </section>
      <section className="stack">
        <h2 className="day-heading">{t("upcoming")}</h2>
        {!view.upcoming.length && !lessonsState.loading ? <p className="muted">{t("noUpcoming")}</p> : null}
        {view.upcoming.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} onStatus={(status) => void setStatus(lesson, status)} />)}
      </section>
    </div>
  );
}
