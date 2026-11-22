"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { saveLessonAssignments, useLessons } from "@/lib/data";
import { addDays, formatDate, todayISO, weekdayName } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { generateLessonPlan, validateLessonAssignments, type ScheduledLesson } from "@/lib/lesson-planner";

const ERRORS = {
  "no-lessons": "noLessonsForPlan",
  "invalid-range": "errInvalidRange",
  "no-study-days": "errNoStudyDays",
  "invalid-time": "errInvalidStudyTime",
  "dependencies-exceed-window": "errDependenciesWindow",
  "edited-date-invalid": "errEditedDateInvalid",
  "daily-capacity-exceeded": "errDailyCapacityExceeded",
  "invalid-preview": "errInvalidPreview",
} as const;

export default function PlanPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const { items: lessons, loading } = useLessons(user?.uid);
  const [startDate, setStartDate] = useState(() => todayISO());
  const [endDate, setEndDate] = useState(() => addDays(todayISO(), 14));
  const [restDays, setRestDays] = useState<number[]>([5]);
  const [dailyMinutes, setDailyMinutes] = useState("90");
  const [sessionMinutes, setSessionMinutes] = useState("30");
  const [preview, setPreview] = useState<ScheduledLesson[] | null>(null);
  const [error, setError] = useState<keyof typeof ERRORS | "save" | null>(null);
  const [saving, setSaving] = useState(false);

  const planableLessons = useMemo(() => Array.from(new Map(lessons.filter((lesson) => lesson.status !== "completed").map((lesson) => [lesson.id, lesson])).values()), [lessons]);
  const subjects = useMemo(() => Array.from(new Set(planableLessons.map((lesson) => lesson.subject).filter(Boolean))), [planableLessons]);
  const [subjectFilter, setSubjectFilter] = useState("");
  const selectedLessons = useMemo(() => subjectFilter ? planableLessons.filter((lesson) => lesson.subject === subjectFilter) : planableLessons, [planableLessons, subjectFilter]);
  const planInput = useMemo(() => ({
    lessons: selectedLessons, startDate, endDate, restWeekdays: restDays,
    dailyAvailableMinutes: Number(dailyMinutes), preferredSessionMinutes: Number(sessionMinutes),
    completedLessonIds: lessons.filter((lesson) => lesson.status === "completed").map((lesson) => lesson.id),
  }), [selectedLessons, startDate, endDate, restDays, dailyMinutes, sessionMinutes, lessons]);
  const previewValidationError = preview ? validateLessonAssignments(planInput, preview) : null;

  function toggleRestDay(day: number) { setRestDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]); }
  function createPreview() {
    setError(null);
    const result = generateLessonPlan(planInput);
    if (!result.ok) { setPreview(null); setError(result.error); return; }
    setPreview(result.assignments);
  }
  function changeDate(lessonId: string, scheduledDate: string) {
    setPreview((current) => current?.map((assignment) => assignment.lessonId === lessonId ? { ...assignment, scheduledDate } : assignment) ?? null);
  }
  async function save() {
    if (!user?.uid || !preview?.length) return;
    if (validateLessonAssignments(planInput, preview)) return;
    setSaving(true); setError(null);
    try { await saveLessonAssignments(user.uid, preview); router.push("/tasks"); }
    catch { setError("save"); setSaving(false); }
  }
  const previewMinutes = preview?.reduce((sum, item) => sum + item.estimatedDuration, 0) ?? 0;
  const usedDays = new Set(preview?.map((item) => item.scheduledDate) ?? []).size;

  return (
    <div className="stack">
      <h1 className="page-title">{t("planTitle")}</h1>
      {loading ? <p className="muted">{t("loading")}</p> : null}
      {!loading && lessons.length === 0 ? <div className="card stack"><p className="muted">{t("noLessonsForPlan")}</p><button className="btn btn-primary" type="button" onClick={() => router.push("/library")}>{t("navLibrary")}</button></div> : null}
      {lessons.length > 0 ? <>
        <div className="card stack">
          {subjects.length ? <div className="field"><label htmlFor="plan-subject">{t("chooseSubject")}</label><select id="plan-subject" className="input" value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setPreview(null); }}><option value="">{t("filterAll")}</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></div> : null}
          <div className="grid-2">
            <div className="field"><label htmlFor="plan-start">{t("startDate")}</label><input id="plan-start" className="input" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreview(null); }} /></div>
            <div className="field"><label htmlFor="plan-end">{t("endDate")}</label><input id="plan-end" className="input" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPreview(null); }} /></div>
            <div className="field"><label htmlFor="daily-time">{t("dailyAvailableTime")}</label><input id="daily-time" className="input" type="number" min={1} value={dailyMinutes} onChange={(e) => { setDailyMinutes(e.target.value); setPreview(null); }} /></div>
            <div className="field"><label htmlFor="session-time">{t("preferredSession")}</label><input id="session-time" className="input" type="number" min={1} value={sessionMinutes} onChange={(e) => { setSessionMinutes(e.target.value); setPreview(null); }} /></div>
          </div>
          <div className="field"><span className="label">{t("restDays")}</span><div className="chips">{[6, 0, 1, 2, 3, 4, 5].map((day) => <button key={day} type="button" className="chip" aria-pressed={restDays.includes(day)} onClick={() => { toggleRestDay(day); setPreview(null); }}>{weekdayName(day, lang)}</button>)}</div></div>
          <p className="muted small">{selectedLessons.length} {t("totalLessons")}</p>
          <button className="btn btn-primary" type="button" onClick={createPreview} disabled={!selectedLessons.length}>{t("preview")}</button>
        </div>
        {error && error !== "save" ? <div className="alert alert-error">{t(ERRORS[error])}</div> : null}
        {error === "save" ? <div className="alert alert-error">{t("somethingWrong")}</div> : null}
        {preview ? <div className="card stack">
          <h2>{t("preview")}</h2>
          <div className="alert alert-info">{t("lessonPlanSummary", { lessons: preview.length, days: usedDays, minutes: previewMinutes })}</div>
          {previewValidationError ? <div className="alert alert-error">{t(ERRORS[previewValidationError])}</div> : null}
          <p className="muted small">{t("editScheduleDates")}</p>
          {preview.map((assignment) => {
            const lesson = selectedLessons.find((item) => item.id === assignment.lessonId);
            if (!lesson) return null;
            return <div className="task" key={assignment.lessonId}><span className="dot" aria-hidden="true" /><div className="task-body"><div className="task-title">{lesson.title}</div><div className="muted small">{lesson.subject} · {assignment.estimatedDuration} {t("minutesShort")}</div></div><label className="sr-only" htmlFor={`date-${lesson.id}`}>{t("startDate")}</label><input id={`date-${lesson.id}`} className="input lesson-date-input" type="date" min={startDate} max={endDate} value={assignment.scheduledDate} onChange={(e) => changeDate(lesson.id, e.target.value)} title={formatDate(assignment.scheduledDate, lang)} /></div>;
          })}
          <button className="btn btn-primary" type="button" onClick={() => void save()} disabled={saving || Boolean(previewValidationError)}>{saving ? t("loading") : t("savePlan")}</button>
        </div> : null}
      </> : null}
    </div>
  );
}
