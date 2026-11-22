"use client";

import { useI18n } from "@/lib/i18n";
import type { Task } from "@/lib/types";

export function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete?: (task: Task) => void;
}) {
  const { t } = useI18n();
  return (
    <div className={`task${task.done ? " done" : ""}`}>
      <span className="dot" style={{ background: task.color }} aria-hidden="true" />
      <div className="task-body">
        <div className="task-title">{task.subjectName}</div>
        <div className="muted small">
          {t("pagesRange", { from: task.fromPage, to: task.toPage })}
          {task.minutes > 0 ? ` · ${task.minutes} ${t("minutesShort")}` : ""}
        </div>
      </div>
      {onDelete ? (
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(task)}>
          {t("delete")}
        </button>
      ) : null}
      <button
        type="button"
        className="check"
        aria-pressed={task.done}
        aria-label={task.done ? t("markUndone") : t("markDone")}
        onClick={() => onToggle(task)}
      >
        {task.done ? "✓" : ""}
      </button>
    </div>
  );
}
