"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { deleteObject, ref, uploadBytesResumable, type UploadTask } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { createUploadedFileRecord, deleteUploadedFileAndLessons, updateLesson, useLessons, useUploadedFiles } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { getFirebase } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";
import type { Lesson, UploadedFile } from "@/lib/types";

const MAX_BYTES = 25 * 1024 * 1024;
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
};

function fileMime(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? file.type;
}
function formatBytes(size: number): string {
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}
function processingLabel(status: UploadedFile["processingStatus"], t: (key: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string): string {
  const keys = { uploaded: "statusUploaded", queued: "statusQueued", processing: "statusProcessing", completed: "statusCompleted", failed: "statusFailed", requires_review: "statusReview" } as const;
  return t(keys[status] as Parameters<ReturnType<typeof useI18n>["t"]>[0]);
}

export default function LibraryPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { items: files, loading } = useUploadedFiles(user?.uid);
  const { items: lessons } = useLessons(user?.uid);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeTask = useRef<UploadTask | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [currentName, setCurrentName] = useState("");
  const [error, setError] = useState("");
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, Partial<Lesson>>>({});
  const [savingLesson, setSavingLesson] = useState<string | null>(null);
  const [savedLesson, setSavedLesson] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function validType(mime: string) { return Object.values(MIME_BY_EXT).includes(mime); }
  async function fileSignatureValid(file: File, mime: string) {
    const buffer = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (mime === "application/pdf") return new TextDecoder().decode(buffer.slice(0, 5)) === "%PDF-";
    if (mime === "image/jpeg") return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    if (mime === "image/png") return Array.from(buffer.slice(0, 8)).join(",") === "137,80,78,71,13,10,26,10";
    if (mime === "image/webp") return new TextDecoder().decode(buffer.slice(0, 4)) === "RIFF" && new TextDecoder().decode(buffer.slice(8, 12)) === "WEBP";
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return buffer[0] === 0x50 && buffer[1] === 0x4b;
    if (mime === "application/msword") return Array.from(buffer.slice(0, 8)).join(",") === "208,207,17,224,161,177,26,225";
    return false;
  }

  async function uploadFile(file: File) {
    if (activeTask.current || progress !== null) return;
    const uid = user?.uid;
    const fb = getFirebase();
    if (!uid || !fb) return;
    const mime = fileMime(file);
    setError("");
    setRetryFile(null);
    if (!validType(mime) || file.size > MAX_BYTES || file.size === 0 || !(await fileSignatureValid(file, mime))) {
      setError(t("uploadFailed"));
      return;
    }
    setCurrentName(file.name);
    setProgress(0);
    let record: { id: string; storagePath: string } | null = null;
    try {
      record = await createUploadedFileRecord(uid, { originalName: file.name, fileType: mime, fileSize: file.size });
      const task = uploadBytesResumable(ref(fb.storage, record.storagePath), file, { contentType: mime, customMetadata: { ownerUid: uid, fileId: record.id } });
      activeTask.current = task;
      await new Promise<void>((resolve, reject) => task.on("state_changed", (snapshot) => setProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve));
      activeTask.current = null;
      setRetryFile(null);
      if (mime === "application/pdf") {
        setPreviewUrl(URL.createObjectURL(file));
        setPreviewName(file.name);
      }
    } catch (uploadError) {
      activeTask.current = null;
      if (record) {
        try { await deleteObject(ref(fb.storage, record.storagePath)); } catch { /* The upload may not have created an object. */ }
        try { await deleteUploadedFileAndLessons(uid, record.id, record.storagePath); } catch { /* Keep the original upload error. */ }
      }
      const code = typeof uploadError === "object" && uploadError !== null && "code" in uploadError ? String(uploadError.code) : "";
      if (code === "storage/canceled") setError("");
      else { setError(t("uploadFailed")); setRetryFile(file); }
    } finally {
      setProgress(null);
      setCurrentName("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) void uploadFile(file); }
  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void uploadFile(file); }

  async function retry(file: UploadedFile) {
    const fb = getFirebase();
    if (!fb || !user?.uid) return;
    setRetrying(file.id); setError("");
    try {
      const retryProcessing = httpsCallable<{ fileId: string }, { accepted: boolean }>(getFunctions(fb.app), "retryUploadedMaterial");
      await retryProcessing({ fileId: file.id });
    } catch { setError(t("uploadFailed")); }
    finally { setRetrying(null); }
  }

  async function openPreview(file: UploadedFile) {
    const fb = getFirebase();
    if (!fb) return;
    try {
      const createUrl = httpsCallable<{ fileId: string }, { url: string }>(getFunctions(fb.app), "createPrivateFileUrl");
      const response = await createUrl({ fileId: file.id });
      setPreviewUrl(response.data.url);
      setPreviewName(file.originalName);
    } catch { setError(t("somethingWrong")); }
  }

  async function remove(file: UploadedFile) {
    if (!user?.uid || !window.confirm(t("deleteFileConfirm"))) return;
    try {
      await deleteUploadedFileAndLessons(user.uid, file.id, file.storagePath);
      if (previewName === file.originalName) { setPreviewUrl(null); setPreviewName(""); }
      setLessonDrafts((current) => {
        const next = { ...current };
        lessons.filter((lesson) => lesson.sourceFileId === file.id).forEach((lesson) => delete next[lesson.id]);
        return next;
      });
    } catch { setError(t("somethingWrong")); }
  }

  function lessonDraft(lesson: Lesson): Partial<Lesson> {
    return lessonDrafts[lesson.id] ?? {
      title: lesson.title, subject: lesson.subject, chapterName: lesson.chapterName ?? "",
      description: lesson.description ?? "", lessonOrder: lesson.lessonOrder,
      difficulty: lesson.difficulty, estimatedDuration: lesson.estimatedDuration,
    };
  }

  function editLesson(lesson: Lesson, field: keyof Lesson, value: string | number) {
    setSavedLesson(null);
    setLessonDrafts((current) => ({ ...current, [lesson.id]: { ...lessonDraft(lesson), [field]: value } }));
  }

  async function saveLesson(lesson: Lesson) {
    if (!user?.uid) return;
    const draft = lessonDraft(lesson);
    const title = String(draft.title ?? "").trim();
    const subject = String(draft.subject ?? "").trim();
    const duration = Number(draft.estimatedDuration);
    const order = Number(draft.lessonOrder);
    if (!title || !subject || !Number.isFinite(duration) || duration < 5 || duration > 360 || !Number.isInteger(order) || order < 1) { setError(t("somethingWrong")); return; }
    setSavingLesson(lesson.id); setError("");
    try {
      await updateLesson(user.uid, lesson.id, {
        title, subject, chapterName: String(draft.chapterName ?? "").trim(), description: String(draft.description ?? "").trim(),
        lessonOrder: order, difficulty: draft.difficulty as Lesson["difficulty"], estimatedDuration: duration,
      });
      setLessonDrafts((current) => { const next = { ...current }; delete next[lesson.id]; return next; });
      setSavedLesson(lesson.id);
    } catch { setError(t("somethingWrong")); }
    finally { setSavingLesson(null); }
  }

  return (
    <div className="stack">
      <h1 className="page-title">{t("libraryTitle")}</h1>
      <p className="muted">{t("uploadDescription")}</p>
      <p className="muted small">{t("aiPrivacyNote")}</p>
      <div className={`upload-dropzone card stack ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        <strong>{t("dropFiles")}</strong>
        <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>{t("browseFiles")}</button>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" hidden onChange={onInput} />
        <span className="muted small">{t("acceptedFormats")}</span>
      </div>
      {progress !== null ? <div className="card stack"><div className="row"><strong>{currentName}</strong><span className="spacer" /><span>{progress}%</span></div><div className="progress"><span style={{ width: `${progress}%` }} /></div><button className="btn btn-sm" type="button" onClick={() => activeTask.current?.cancel()}>{t("cancelUpload")}</button></div> : null}
      {error ? <div className="alert alert-error" role="alert">{error}{retryFile ? <button className="btn btn-sm" type="button" onClick={() => void uploadFile(retryFile)}>{t("retry")}</button> : null}</div> : null}
      {previewUrl ? <div className="card stack"><div className="row"><h2>{previewName}</h2><span className="spacer" /><button className="btn btn-sm" type="button" onClick={() => { setPreviewUrl(null); setPreviewName(""); }}>{t("cancel")}</button></div><iframe className="pdf-preview" title={previewName} src={previewUrl} /></div> : null}
      <section className="stack"><h2>{t("libraryTitle")}</h2>{loading ? <p className="muted">{t("loading")}</p> : null}{!loading && files.length === 0 ? <p className="muted">{t("noLessons")}</p> : null}
        {files.map((file) => {
          const fileLessons = lessons.filter((lesson) => lesson.sourceFileId === file.id);
          return <article className="card stack" key={file.id}>
            <div className="row"><strong className="file-name">{file.originalName}</strong><span className="spacer" /><span className="muted small">{formatBytes(file.fileSize)}</span><span className={`status-pill status-${file.processingStatus}`}>{processingLabel(file.processingStatus, t)}</span></div>
            {file.warning ? <div className="alert alert-info">{file.warning}</div> : null}
            {file.reviewSections?.length ? <div className="alert alert-info"><strong>{t("otherMaterialSections")}</strong><ul>{file.reviewSections.map((section, index) => <li key={`${section.kind}-${index}`}>{t(section.kind)}: {section.title}{section.chapterName ? ` · ${section.chapterName}` : ""}</li>)}</ul></div> : null}
            <div className="row"><span className="muted small">{fileLessons.length} {t("totalLessons").toLocaleLowerCase()}</span><span className="spacer" />
              {file.fileType === "application/pdf" ? <button className="btn btn-sm" type="button" onClick={() => void openPreview(file)}>{t("preview")}</button> : null}
              {file.processingStatus === "failed" || (file.processingStatus === "requires_review" && file.warning?.includes("AI lesson analysis is not configured")) ? <button className="btn btn-sm" type="button" disabled={retrying === file.id} onClick={() => void retry(file)}>{retrying === file.id ? t("loading") : t("retry")}</button> : null}
              <button className="btn btn-sm btn-danger" type="button" onClick={() => void remove(file)}>{t("delete")}</button>
            </div>
            {fileLessons.length ? <section className="stack">
              <h3>{t("editExtractedLessons")}</h3>
              {fileLessons.map((lesson) => {
                const draft = lessonDraft(lesson);
                return <div className="lesson-edit card stack" key={lesson.id}>
                  <div className="grid-2">
                    <div className="field"><label htmlFor={`lesson-title-${lesson.id}`}>{t("lessonTitleLabel")}</label><input id={`lesson-title-${lesson.id}`} className="input" value={draft.title ?? ""} onChange={(event) => editLesson(lesson, "title", event.target.value)} /></div>
                    <div className="field"><label htmlFor={`lesson-subject-${lesson.id}`}>{t("subjectLabel")}</label><input id={`lesson-subject-${lesson.id}`} className="input" value={draft.subject ?? ""} onChange={(event) => editLesson(lesson, "subject", event.target.value)} /></div>
                    <div className="field"><label htmlFor={`lesson-chapter-${lesson.id}`}>{t("chapterLabel")}</label><input id={`lesson-chapter-${lesson.id}`} className="input" value={draft.chapterName ?? ""} onChange={(event) => editLesson(lesson, "chapterName", event.target.value)} /></div>
                    <div className="field"><label htmlFor={`lesson-order-${lesson.id}`}>{t("lessonOrderLabel")}</label><input id={`lesson-order-${lesson.id}`} className="input" type="number" min={1} value={draft.lessonOrder ?? 1} onChange={(event) => editLesson(lesson, "lessonOrder", Number(event.target.value))} /></div>
                    <div className="field"><label htmlFor={`lesson-difficulty-${lesson.id}`}>{t("difficulty")}</label><select id={`lesson-difficulty-${lesson.id}`} className="input" value={draft.difficulty ?? "medium"} onChange={(event) => editLesson(lesson, "difficulty", event.target.value)}><option value="easy">{t("easy")}</option><option value="medium">{t("medium")}</option><option value="hard">{t("hard")}</option></select></div>
                    <div className="field"><label htmlFor={`lesson-duration-${lesson.id}`}>{t("estimatedDuration")}</label><input id={`lesson-duration-${lesson.id}`} className="input" type="number" min={5} max={360} value={draft.estimatedDuration ?? 30} onChange={(event) => editLesson(lesson, "estimatedDuration", Number(event.target.value))} /></div>
                  </div>
                  <div className="field"><label htmlFor={`lesson-description-${lesson.id}`}>{t("lessonDescriptionLabel")}</label><textarea id={`lesson-description-${lesson.id}`} className="input" rows={2} value={draft.description ?? ""} onChange={(event) => editLesson(lesson, "description", event.target.value)} /></div>
                  <div className="row">{savedLesson === lesson.id ? <span className="alert alert-success">{t("saved")}</span> : null}<span className="spacer" /><button className="btn btn-sm btn-primary" type="button" disabled={savingLesson === lesson.id} onClick={() => void saveLesson(lesson)}>{savingLesson === lesson.id ? t("loading") : t("save")}</button></div>
                </div>;
              })}
            </section> : null}
          </article>;
        })}
      </section>
    </div>
  );
}
