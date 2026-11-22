"use client";

import { useMemo, useState } from "react";
import { TaskRow } from "@/components/task-row";
import { useAuth } from "@/lib/auth";
import { deleteTask, setTaskDone, useTasks } from "@/lib/data";
import { formatDate, todayISO } from "@/lib/dates";
import { useI18n, type Key } from "@/lib/i18n";
import type { Task } from "@/lib/types";

type Filter = "all" | "today" | "pending" | "done";

const FILTERS: Array<{ id: Filter; label: Key }> = [
  { id: "all", label: "filterAll" },
  { id: "today", label: "filterToday" },
  { id: "pending", label: "filterPending" },
  { id: "done", label: "filterDone" },
];

export default function TasksPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const uid = user?.uid;
  const { items, loading, error } = useTasks(uid);
  const [filter, setFilter] = useState<Filter>("pending");

  const groups = useMemo(() => {
    const today = todayISO();
    const visible = items.filter((task) => {
      if (filter === "today") return task.date === today;
      if (filter === "pending") return !task.done;
      if (filter === "done") return task.done;
      return true;
    });
    const byDate = new Map<string, Task[]>();
    for (const task of visible) byDate.set(task.date, [...(byDate.get(task.date) ?? []), task]);
    return Array.from(byDate.entries());
  }, [items, filter]);

  function toggle(task: Task) {
    if (uid) void setTaskDone(uid, task.id, !task.done);
  }

  function remove(task: Task) {
    if (!uid) return;
    if (window.confirm(t("confirmDeleteTask"))) void deleteTask(uid, task.id);
  }

  return (
    <div className="stack">
      <h1 className="page-title">{t("tasksTitle")}</h1>

      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {t(f.label)}
          </button>
        ))}
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading ? <p className="muted">{t("loading")}</p> : null}
      {!loading && groups.length === 0 ? <p className="muted">{t("noTasks")}</p> : null}

      {groups.map(([date, dayTasks]) => (
        <section key={date}>
          <h2 className="day-heading">{formatDate(date, lang)}</h2>
          {dayTasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={toggle} onDelete={remove} />
          ))}
        </section>
      ))}
    </div>
  );
}
