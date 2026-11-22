"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { savePlan, useSubjects, useTasks } from "@/lib/data";
import { addDays, formatDate, todayISO, weekdayName } from "@/lib/dates";
import { useI18n, type Key } from "@/lib/i18n";
import { generatePlan, type PlanError } from "@/lib/planner";

const ERROR_KEYS: Record<PlanError, Key> = {
  "invalid-pages": "errInvalidPages",
  "invalid-range": "errInvalidRange",
  "no-study-days": "errNoStudyDays",
  "too-many-days": "errTooManyDays",
};

export default function PlanPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const uid = user?.uid;
  const subjects = useSubjects(uid);
  const tasks = useTasks(uid);

  const [subjectId, setSubjectId] = useState("");
  const [fromPage, setFromPage] = useState("1");
  const [startDate, setStartDate] = useState(() => todayISO());
  const [endDate, setEndDate] = useState(() => addDays(todayISO(), 14));
  const [restDays, setRestDays] = useState<number[]>([5]);
  const [minutesPerPage, setMinutesPerPage] = useState("3");
  const [error, setError] = useState<Key | null>(null);
  const [saving, setSaving] = useState(false);
  const initializedFor = useRef<string>("");

  const subject = subjects.items.find((s) => s.id === subjectId) ?? null;

  // Pick the subject from ?subject=… (or the first one) once subjects are loaded.
  useEffect(() => {
    if (subjectId || subjects.items.length === 0) return;
    const wanted = new URLSearchParams(window.location.search).get("subject");
    const match = subjects.items.find((s) => s.id === wanted) ?? subjects.items[0];
    setSubjectId(match.id);
  }, [subjectId, subjects.items]);

  // Set sensible defaults when the chosen subject changes (never on every data update).
  useEffect(() => {
    if (!subject || initializedFor.current === subject.id) return;
    initializedFor.current = subject.id;
    const lastDone = tasks.items
      .filter((x) => x.subjectId === subject.id && x.done)
      .reduce((max, x) => Math.max(max, x.toPage), 0);
    setFromPage(String(lastDone + 1));
    const today = todayISO();
    setStartDate(today);
    setEndDate(subject.examDate && subject.examDate >= today ? subject.examDate : addDays(today, 14));
  }, [subject, tasks.items]);

  const result = useMemo(() => {
    if (!subject) return null;
    return generatePlan({
      totalPages: subject.totalPages,
      fromPage: Number(fromPage),
      startDate,
      endDate,
      restWeekdays: restDays,
      minutesPerPage: Number(minutesPerPage),
    });
  }, [subject, fromPage, startDate, endDate, restDays, minutesPerPage]);

  const pendingCount = subject
    ? tasks.items.filter((x) => x.subjectId === subject.id && !x.done).length
    : 0;

  function toggleRestDay(day: number) {
    setRestDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  async function onSave() {
    if (!uid || !subject || !result || !result.ok) return;
    let replace = false;
    if (pendingCount > 0) {
      if (!window.confirm(t("replaceConfirm"))) return;
      replace = true;
    }
    setError(null);
    setSaving(true);
    try {
      await savePlan(uid, subject, result.days, replace);
      router.push("/tasks");
    } catch {
      setError("somethingWrong");
      setSaving(false);
    }
  }

  if (!subjects.loading && subjects.items.length === 0) {
    return (
      <div className="stack">
        <h1 className="page-title">{t("planTitle")}</h1>
        <div className="card stack">
          <p className="muted">{t("noSubjectsForPlan")}</p>
          <Link className="btn btn-primary" href="/subjects">
            {t("addSubject")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1 className="page-title">{t("planTitle")}</h1>

      <div className="card stack">
        <div className="field">
          <label htmlFor="plan-subject">{t("chooseSubject")}</label>
          <select
            id="plan-subject"
            className="input"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            {subjects.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.totalPages})
              </option>
            ))}
          </select>
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="plan-from">{t("startPage")}</label>
            <input
              id="plan-from"
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              value={fromPage}
              onChange={(e) => setFromPage(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="plan-minutes">{t("minutesPerPage")}</label>
            <input
              id="plan-minutes"
              className="input"
              type="number"
              inputMode="decimal"
              min={0}
              value={minutesPerPage}
              onChange={(e) => setMinutesPerPage(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="plan-start">{t("startDate")}</label>
            <input
              id="plan-start"
              className="input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="plan-end">{t("endDate")}</label>
            <input
              id="plan-end"
              className="input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <span className="label">{t("restDays")}</span>
          <div className="chips">
            {[6, 0, 1, 2, 3, 4, 5].map((day) => (
              <button
                key={day}
                type="button"
                className="chip"
                aria-pressed={restDays.includes(day)}
                onClick={() => toggleRestDay(day)}
              >
                {weekdayName(day, lang)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {result && !result.ok ? <div className="alert alert-error">{t(ERROR_KEYS[result.error])}</div> : null}

      {result && result.ok ? (
        <div className="card stack">
          <h2>{t("preview")}</h2>
          <div className="alert alert-info">
            {t("planSummary", {
              pages: result.totalToStudy,
              days: result.days.length,
              perDay: result.pagesPerDay,
            })}
          </div>
          <div>
            {result.days.map((day) => (
              <div className="task" key={day.date}>
                <span className="dot" style={{ background: subject?.color }} aria-hidden="true" />
                <div className="task-body">
                  <div className="task-title">{formatDate(day.date, lang)}</div>
                  <div className="muted small">
                    {t("pagesRange", { from: day.fromPage, to: day.toPage })}
                    {day.minutes > 0 ? ` · ${day.minutes} ${t("minutesShort")}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {error ? <div className="alert alert-error">{t(error)}</div> : null}
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? t("loading") : t("savePlan")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
