"use client";

import type { Lesson, LessonStatus } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";

const STATUS_LABELS: Record<LessonStatus, "notStarted" | "inProgress" | "completedLessons" | "delayedLessons"> = {
  not_started: "notStarted",
  in_progress: "inProgress",
  completed: "completedLessons",
  delayed: "delayedLessons",
};

export function LessonRow({ lesson, onStatus }: { lesson: Lesson; onStatus?: (status: LessonStatus) => void }) {
  const { t, lang } = useI18n();
  const nextStatus: LessonStatus = lesson.status === "completed" ? "not_started" : "completed";
  return (
    <article className={`task lesson-card ${lesson.status === "completed" ? "done" : ""}`}>
      <span className="dot" aria-hidden="true" style={{ background: lesson.difficulty === "hard" ? "#dc2626" : lesson.difficulty === "easy" ? "#16a34a" : "#5268E8" }} />
      <div className="task-body">
        <div className="task-title">{lesson.title}</div>
        <div className="muted small">
          {lesson.subject}{lesson.chapterName ? ` · ${lesson.chapterName}` : ""}
          {lesson.scheduledDate ? ` · ${formatDate(lesson.scheduledDate, lang)}` : ""}
          {lesson.estimatedDuration ? ` · ${lesson.estimatedDuration} ${t("minutesShort")}` : ""}
          {lesson.sourcePageStart ? ` · ${t("lessonSource")} ${lesson.sourcePageStart}${lesson.sourcePageEnd && lesson.sourcePageEnd !== lesson.sourcePageStart ? `–${lesson.sourcePageEnd}` : ""}` : ""}
        </div>
        {lesson.description ? <p className="lesson-description muted small">{lesson.description}</p> : null}
        <span className="status-pill" data-status={lesson.status}>{t(STATUS_LABELS[lesson.status])}</span>
      </div>
      {onStatus ? <button className="btn btn-sm" type="button" onClick={() => onStatus(nextStatus)} aria-label={`${t(STATUS_LABELS[nextStatus])}: ${lesson.title}`}>{t(nextStatus === "completed" ? "markDone" : "markUndone")}</button> : null}
    </article>
  );
}
