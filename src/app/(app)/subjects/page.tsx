"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { addSubject, deleteSubject, useSubjects, useTasks } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { useI18n, type Key } from "@/lib/i18n";
import type { Subject } from "@/lib/types";

const COLORS = ["#1d4ed8", "#0ea5e9", "#16a34a", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6"];

export default function SubjectsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const uid = user?.uid;
  const subjects = useSubjects(uid);
  const tasks = useTasks(uid);

  const [name, setName] = useState("");
  const [pages, setPages] = useState("");
  const [examDate, setExamDate] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<Key | null>(null);
  const [busy, setBusy] = useState(false);

  const pagesDoneBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks.items) {
      if (task.done) map.set(task.subjectId, (map.get(task.subjectId) ?? 0) + (task.toPage - task.fromPage + 1));
    }
    return map;
  }, [tasks.items]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid) return;
    const total = Number(pages);
    if (!name.trim()) return setError("errSubjectName");
    if (!Number.isInteger(total) || total < 1) return setError("errSubjectPages");
    setError(null);
    setBusy(true);
    try {
      await addSubject(uid, { name: name.trim(), totalPages: total, color, examDate: examDate || null });
      setName("");
      setPages("");
      setExamDate("");
    } catch {
      setError("somethingWrong");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(subject: Subject) {
    if (!uid) return;
    if (!window.confirm(t("confirmDeleteSubject"))) return;
    try {
      await deleteSubject(uid, subject.id);
    } catch {
      setError("somethingWrong");
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">{t("subjectsTitle")}</h1>

      <form className="card stack" onSubmit={onSubmit}>
        <h2>{t("addSubject")}</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="subject-name">{t("subjectName")}</label>
            <input id="subject-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="subject-pages">{t("totalPages")}</label>
            <input
              id="subject-pages"
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              value={pages}
              onChange={(e) => setPages(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="subject-exam">{t("examDate")}</label>
          <input
            id="subject-exam"
            className="input"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="label">{t("color")}</span>
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                style={{ background: c }}
                aria-pressed={color === c}
                aria-label={c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        {error ? <div className="alert alert-error">{t(error)}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {t("addSubject")}
        </button>
      </form>

      {subjects.loading ? <p className="muted">{t("loading")}</p> : null}
      {!subjects.loading && subjects.items.length === 0 ? <p className="muted">{t("noSubjects")}</p> : null}

      {subjects.items.map((subject) => {
        const done = Math.min(pagesDoneBySubject.get(subject.id) ?? 0, subject.totalPages);
        const percent = Math.round((done / subject.totalPages) * 100);
        return (
          <div className="card stack" key={subject.id}>
            <div className="row">
              <span className="dot" style={{ background: subject.color }} aria-hidden="true" />
              <strong>{subject.name}</strong>
              <span className="spacer" />
              {subject.examDate ? <span className="muted small">{formatDate(subject.examDate, lang)}</span> : null}
            </div>
            <div className="progress">
              <span style={{ width: `${percent}%`, background: subject.color }} />
            </div>
            <div className="muted small">{t("progressOf", { done, total: subject.totalPages })}</div>
            <div className="row">
              <Link className="btn btn-sm btn-primary" href={`/plan?subject=${subject.id}`}>
                {t("createPlan")}
              </Link>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete(subject)}>
                {t("delete")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
