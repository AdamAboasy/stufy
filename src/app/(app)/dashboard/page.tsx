"use client";

import { useMemo } from "react";
import { TaskRow } from "@/components/task-row";
import { useAuth } from "@/lib/auth";
import { setTaskDone, useTasks } from "@/lib/data";
import { formatDate, todayISO } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import type { Task } from "@/lib/types";

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const uid = user?.uid;
  const { items: tasks, loading, error } = useTasks(uid);

  const today = todayISO();

  const view = useMemo(() => {
    const done = tasks.filter((x) => x.done);
    const pagesDone = done.reduce((sum, x) => sum + (x.toPage - x.fromPage + 1), 0);
    const minutesDone = done.reduce((sum, x) => sum + x.minutes, 0);
    return {
      todays: tasks.filter((x) => x.date === today),
      overdue: tasks.filter((x) => x.date < today && !x.done),
      upcoming: tasks.filter((x) => x.date > today && !x.done).slice(0, 5),
      percent: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
      doneCount: done.length,
      total: tasks.length,
      pagesDone,
      minutesDone,
    };
  }, [tasks, today]);

  function toggle(task: Task) {
    if (uid) void setTaskDone(uid, task.id, !task.done);
  }

  const hours = Math.floor(view.minutesDone / 60);
  const mins = view.minutesDone % 60;
  const name = user?.displayName?.trim();

  return (
    <div className="stack">
      <h1 className="page-title">{name ? t("hello", { name }) : t("helloNoName")}</h1>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card stack">
        <div className="row">
          <strong>{t("overallProgress")}</strong>
          <span className="spacer" />
          <strong>{view.percent}%</strong>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={view.percent} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${view.percent}%` }} />
        </div>
      </div>

      <div className="grid-3">
        <div className="card stat">
          <span className="stat-value">
            {view.doneCount}/{view.total}
          </span>
          <span className="stat-label">{t("tasksDone")}</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{view.pagesDone}</span>
          <span className="stat-label">{t("pagesDone")}</span>
        </div>
        <div className="card stat">
          <span className="stat-value">
            {hours}
            {t("hoursShort")} {mins}
            {t("minutesShort")}
          </span>
          <span className="stat-label">{t("studyTime")}</span>
        </div>
      </div>

      {loading ? <p className="muted">{t("loading")}</p> : null}

      {view.overdue.length > 0 ? (
        <section>
          <h2 className="day-heading">{t("overdue")}</h2>
          {view.overdue.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={toggle} />
          ))}
        </section>
      ) : null}

      <section>
        <h2 className="day-heading">
          {t("today")} · <span className="muted">{formatDate(today, lang)}</span>
        </h2>
        {view.todays.length === 0 && !loading ? <p className="muted">{t("todayEmpty")}</p> : null}
        {view.todays.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={toggle} />
        ))}
      </section>

      <section>
        <h2 className="day-heading">{t("upcoming")}</h2>
        {view.upcoming.length === 0 && !loading ? <p className="muted">{t("noUpcoming")}</p> : null}
        {view.upcoming.map((task) => (
          <div key={task.id}>
            <div className="muted small" style={{ margin: "4px 2px" }}>
              {formatDate(task.date, lang)}
            </div>
            <TaskRow task={task} onToggle={toggle} />
          </div>
        ))}
      </section>
    </div>
  );
}
