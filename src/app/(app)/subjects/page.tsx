"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { addSubject, deleteSubject, useLessons, useSubjects } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { useI18n, type Key } from "@/lib/i18n";
import type { Subject } from "@/lib/types";

const COLORS = ["#5268E8", "#7957D5", "#9b5de5", "#ec4899", "#f43f5e", "#fb7c43", "#f5a524", "#10b981", "#14b8a6", "#0ea5e9", "#16a34a", "#84cc16"];

export default function SubjectsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const uid = user?.uid;
  const subjects = useSubjects(uid);
  const lessons = useLessons(uid);
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<Key | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    const unique = Array.from(new Map(lessons.items.map((lesson) => [lesson.id, lesson])).values());
    for (const lesson of unique) {
      const current = map.get(lesson.subject) ?? { total: 0, completed: 0 };
      current.total += 1;
      if (lesson.status === "completed") current.completed += 1;
      map.set(lesson.subject, current);
    }
    return map;
  }, [lessons.items]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid) return;
    if (!name.trim()) return setError("errSubjectName");
    setError(null); setBusy(true);
    try {
      await addSubject(uid, { name: name.trim(), totalLessons: 0, color, examDate: examDate || null });
      setName(""); setExamDate("");
    } catch { setError("somethingWrong"); }
    finally { setBusy(false); }
  }

  async function onDelete(subject: Subject) {
    if (!uid || !window.confirm(t("confirmDeleteSubject"))) return;
    try { await deleteSubject(uid, subject.id); } catch { setError("somethingWrong"); }
  }

  return (
    <div className="stack">
      <h1 className="page-title">{t("subjectsTitle")}</h1>
      <form className="card stack" onSubmit={onSubmit}>
        <h2>{t("addSubject")}</h2>
        <div className="grid-2">
          <div className="field"><label htmlFor="subject-name">{t("subjectName")}</label><input id="subject-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="subject-exam">{t("examDate")}</label><input id="subject-exam" className="input" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div>
        </div>
        <div className="field"><span className="label">{t("color")}</span><div className="swatches">{COLORS.map((choice) => <button key={choice} type="button" className="swatch" style={{ background: choice }} aria-pressed={color === choice} aria-label={choice} onClick={() => setColor(choice)} />)}</div></div>
        {error ? <div className="alert alert-error">{t(error)}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? t("loading") : t("addSubject")}</button>
      </form>
      {subjects.loading || lessons.loading ? <p className="muted">{t("loading")}</p> : null}
      {!subjects.loading && !lessons.loading && subjects.items.length === 0 ? <p className="muted">{t("noSubjects")}</p> : null}
      {subjects.items.map((subject) => {
        const count = counts.get(subject.name) ?? { total: 0, completed: 0 };
        const percent = count.total ? Math.round(count.completed / count.total * 100) : 0;
        return <div className="card stack" key={subject.id}>
          <div className="row"><span className="dot" style={{ background: subject.color }} aria-hidden="true" /><strong>{subject.name}</strong><span className="spacer" />{subject.examDate ? <span className="muted small">{formatDate(subject.examDate, lang)}</span> : null}</div>
          <div className="progress"><span style={{ width: `${percent}%`, background: subject.color }} /></div>
          <div className="muted small">{t("completedLessons")}: {count.completed} / {count.total}</div>
          <div className="row"><Link className="btn btn-sm btn-primary" href="/plan">{t("createPlan")}</Link><button type="button" className="btn btn-sm btn-danger" onClick={() => void onDelete(subject)}>{t("delete")}</button></div>
        </div>;
      })}
      {lessons.items.length > 0 ? <div className="card"><p className="muted small">{lessons.items.length} {t("totalLessons").toLocaleLowerCase(lang === "ar" ? "ar" : "en")}</p><Link className="btn btn-sm" href="/tasks">{t("navTasks")}</Link></div> : null}
    </div>
  );
}
