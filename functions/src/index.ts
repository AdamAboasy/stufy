import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functions from "firebase-functions/v1";
import { defineSecret } from "firebase-functions/params";
import pdfParse from "pdf-parse";
import { hasExpectedSignature } from "./file-validation.js";

initializeApp();
const db = getFirestore();
const geminiApiKey = defineSecret("GEMINI_API_KEY");

type ExtractedLesson = { title: string; description?: string; difficulty?: "easy" | "medium" | "hard"; estimatedDuration?: number; sourcePageStart?: number; sourcePageEnd?: number; dependsOn?: string[] };
type LessonExtraction = {
  subject: string;
  chapters: Array<{ name: string; lessons: ExtractedLesson[] }>;
  classifiedSections?: Array<{ title: string; kind: "subtopic" | "exercise" | "revision"; chapterName?: string; sourcePageStart?: number; sourcePageEnd?: number }>;
  uncertainSections?: string[];
};

function safeRole(role: unknown): role is "student" | "super_admin" {
  return role === "student" || role === "super_admin";
}

export const initializeStudentRole = functions.auth.user().onCreate(async (user) => {
  const auth = getAuth();
  const existing = await auth.getUser(user.uid);
  const claims = { ...existing.customClaims };
  // A client-created account is always a student. Admin claims are never inferred from profile data.
  if (claims.role !== "super_admin") {
    await auth.setCustomUserClaims(user.uid, { ...claims, role: "student" });
  }
  await db.doc(`users/${user.uid}`).set({
    uid: user.uid,
    fullName: user.displayName ?? "",
    role: "student",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
});

export const setUserRole = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== "super_admin") {
    throw new HttpsError("permission-denied", "Only a Super Admin can assign roles.");
  }
  const uid = typeof request.data?.uid === "string" ? request.data.uid : "";
  const role = request.data?.role;
  if (!uid || !safeRole(role)) throw new HttpsError("invalid-argument", "A valid user ID and role are required.");
  const auth = getAuth();
  const target = await auth.getUser(uid);
  const claims = { ...target.customClaims, role };
  await auth.setCustomUserClaims(uid, claims);
  await db.doc(`users/${uid}`).set({ uid, role, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection("activityLogs").add({
    actorUid: request.auth.uid,
    action: "user.role.changed",
    targetUid: uid,
    role,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { uid, role };
});

async function analyzeText(text: string, apiKey: string): Promise<LessonExtraction> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = `Analyze educational material and extract only source-supported information. Never invent a subject, chapter, lesson, description, difficulty, duration, dependency, or page number. Page markers use [[PDF_PAGE:n]]; cite source pages only when the surrounding text supports them. Preserve source order. Create lesson records only for explicit standalone lessons. Separately classify headings that are subtopics, exercises, or revision sections so they are not treated as lessons. If a section is unclear, report it in uncertainSections rather than guessing. Dependencies must be exact titles of explicit prerequisite lessons in this source; otherwise use an empty list. Return JSON only with shape {"subject":"","chapters":[{"name":"","lessons":[{"title":"","description":"","difficulty":"easy|medium|hard","estimatedDuration":30,"sourcePageStart":1,"sourcePageEnd":2,"dependsOn":[]}]}],"classifiedSections":[{"title":"","kind":"subtopic|exercise|revision","chapterName":"","sourcePageStart":1,"sourcePageEnd":1}],"uncertainSections":[]}. For difficulty choose exactly one of easy, medium, hard. For classifiedSections.kind choose exactly one of subtopic, exercise, revision. Use empty strings/lists when evidence is absent. Source text follows:\n${text.slice(0, 60000)}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }),
  });
  if (!response.ok) throw new Error(`lesson-analysis-${response.status}`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const raw = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const parsed = JSON.parse(raw) as LessonExtraction;
  if (!parsed || typeof parsed.subject !== "string" || !Array.isArray(parsed.chapters)) throw new Error("invalid-analysis-shape");
  return parsed;
}

function normalizeTitle(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Private storage trigger. Text-based PDFs are processed. Unsupported or image-only material
 * is explicitly marked for review; it is never reported as fully analyzed.
 */
export const processUploadedMaterial = onObjectFinalized({
  memory: "1GiB",
  timeoutSeconds: 300,
  secrets: [geminiApiKey],
}, async (event) => {
  const object = event.data;
  const path = object.name ?? "";
  const match = path.match(/^users\/([^/]+)\/files\/([^/]+)$/);
  if (!match || !object.bucket) return;
  const [, uid, fileId] = match;
  const recordRef = db.doc(`users/${uid}/files/${fileId}`);
  const record = await recordRef.get();
  if (!record.exists) return;
  const fileInfo = record.data() ?? {};
  const bucket = getStorage().bucket(object.bucket);
  const file = bucket.file(path);
  await recordRef.set({ processingStatus: "processing", updatedAt: FieldValue.serverTimestamp() }, { merge: true });

  try {
    const size = Number(object.size ?? 0);
    const contentType = object.contentType ?? "";
    if (!size || size > 25 * 1024 * 1024) throw new Error("file-size-invalid");
    const [contents] = await file.download();
    if (!hasExpectedSignature(contents, contentType)) throw new Error("file-content-type-mismatch");
    if (contentType !== "application/pdf") {
      await recordRef.set({ processingStatus: "requires_review", warning: "This format was uploaded securely but automatic lesson extraction is not enabled for it yet.", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return;
    }
    const emptyPages: number[] = [];
    const failedPages: number[] = [];
    const pageTexts: string[] = [];
    const parsedPdf = await pdfParse(contents, { pagerender: async (pageData: { pageNumber?: number; getTextContent: (options: Record<string, boolean>) => Promise<{ items: Array<{ str: string; transform: number[] }> }> }) => {
      const pageNumber = Number(pageData.pageNumber) || pageTexts.length + 1;
      try {
        const textContent = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
        let lastY: number | undefined;
        let pageText = "";
        for (const item of textContent.items) {
          pageText += !lastY || lastY === item.transform[5] ? item.str : `\n${item.str}`;
          lastY = item.transform[5];
        }
        pageTexts.push(pageText);
        if (!pageText.trim()) emptyPages.push(pageNumber);
        return `\n[[PDF_PAGE:${pageNumber}]]\n${pageText}`;
      } catch {
        failedPages.push(pageNumber);
        pageTexts.push("");
        return `\n[[PDF_PAGE:${pageNumber} EXTRACTION_FAILED]]\n`;
      }
    } });
    const totalPages = parsedPdf.numpages;
    const sourceText = parsedPdf.text.trim();
    const extractedText = pageTexts.join("\n").trim();
    if (!extractedText || extractedText.length < 80) {
      const pageWarning = [...failedPages.map((page) => `page ${page} failed`), ...emptyPages.map((page) => `page ${page} has no selectable text`)];
      const warning = pageWarning.length
        ? `Text extraction was incomplete (${pageWarning.join(", ")}). Scanned pages need OCR; OCR is not configured.`
        : "This PDF contains too little selectable text. OCR is required before full lesson extraction.";
      await recordRef.set({ processingStatus: "requires_review", totalPages, reviewSections: [], warning, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return;
    }
    const key = geminiApiKey.value();
    if (!key) {
      await recordRef.set({ processingStatus: "requires_review", totalPages, reviewSections: [], warning: "Text was extracted, but AI lesson analysis is not configured. Add the Gemini secret and retry processing.", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return;
    }
    const inputTruncated = sourceText.length > 60000;
    const result = await analyzeText(sourceText, key);
    const flattened: Array<{ chapter: string; lesson: ExtractedLesson }> = [];
    for (const chapter of result.chapters) {
      const chapterName = typeof chapter?.name === "string" ? chapter.name.trim() : "";
      for (const lesson of Array.isArray(chapter?.lessons) ? chapter.lessons : []) {
        if (lesson && typeof lesson.title === "string" && lesson.title.trim()) flattened.push({ chapter: chapterName, lesson });
      }
    }
    const unique: Array<{ chapter: string; lesson: ExtractedLesson }> = [];
    const seen = new Set<string>();
    const duplicateTitles: string[] = [];
    for (const item of flattened) {
      const identity = `${normalizeTitle(item.chapter)}|${normalizeTitle(item.lesson.title)}`;
      if (seen.has(identity)) { duplicateTitles.push(item.lesson.title.trim()); continue; }
      seen.add(identity);
      unique.push(item);
    }
    const lessonIdByTitle = new Map<string, string>();
    unique.forEach(({ lesson }, index) => {
      const title = normalizeTitle(lesson.title);
      if (title && !lessonIdByTitle.has(title)) lessonIdByTitle.set(title, `${fileId}_${index + 1}`);
    });
    const invalidPageReference = { value: false };
    const pageNumber = (value: unknown): number | undefined => {
      if (value === undefined || value === null || value === "") return undefined;
      const page = Number(value);
      if (!Number.isInteger(page) || page < 1 || page > totalPages) { invalidPageReference.value = true; return undefined; }
      return page;
    };
    const batch = db.batch();
    const unresolvedDependencies: string[] = [];
    unique.forEach(({ chapter, lesson }, index) => {
      const lessonRef = db.doc(`users/${uid}/lessons/${fileId}_${index + 1}`);
      const startPage = pageNumber(lesson.sourcePageStart);
      const endPage = pageNumber(lesson.sourcePageEnd);
      const sourceRangeInvalid = startPage !== undefined && endPage !== undefined && endPage < startPage;
      if (sourceRangeInvalid) invalidPageReference.value = true;
      const requestedDependencies = Array.isArray(lesson.dependsOn) ? lesson.dependsOn.filter((dependency): dependency is string => typeof dependency === "string") : [];
      const dependsOn = requestedDependencies.map((dependency) => lessonIdByTitle.get(normalizeTitle(dependency))).filter((id): id is string => Boolean(id) && id !== lessonRef.id);
      if (requestedDependencies.length !== dependsOn.length) unresolvedDependencies.push(lesson.title);
      const recordData: Record<string, unknown> = {
        id: lessonRef.id, studentId: uid, sourceFileId: fileId, title: lesson.title.trim(),
        subject: result.subject.trim() || "Unspecified", subjectId: "", description: typeof lesson.description === "string" ? lesson.description.trim() : "",
        lessonOrder: index + 1, difficulty: ["easy", "medium", "hard"].includes(lesson.difficulty ?? "") ? lesson.difficulty : "medium",
        estimatedDuration: Math.max(5, Math.min(360, Number(lesson.estimatedDuration) || 30)), actualDuration: 0,
        status: "not_started", dependsOn, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      };
      if (chapter) recordData.chapterName = chapter;
      if (!sourceRangeInvalid && startPage !== undefined) recordData.sourcePageStart = startPage;
      if (!sourceRangeInvalid && endPage !== undefined) recordData.sourcePageEnd = endPage;
      batch.set(lessonRef, recordData, { merge: true });
    });
    await batch.commit();
    const reviewSections = (Array.isArray(result.classifiedSections) ? result.classifiedSections : []).flatMap((section) => {
      if (!section || typeof section.title !== "string" || !section.title.trim() || !["subtopic", "exercise", "revision"].includes(section.kind)) return [];
      const startPage = pageNumber(section.sourcePageStart);
      const endPage = pageNumber(section.sourcePageEnd);
      const invalidRange = startPage !== undefined && endPage !== undefined && endPage < startPage;
      if (invalidRange) invalidPageReference.value = true;
      const review: Record<string, unknown> = { title: section.title.trim(), kind: section.kind };
      if (typeof section.chapterName === "string" && section.chapterName.trim()) review.chapterName = section.chapterName.trim();
      if (!invalidRange && startPage !== undefined) review.sourcePageStart = startPage;
      if (!invalidRange && endPage !== undefined) review.sourcePageEnd = endPage;
      return [review];
    }).slice(0, 100);
    const warningParts: string[] = [];
    if (result.uncertainSections?.length) warningParts.push(`Uncertain sections: ${result.uncertainSections.slice(0, 20).join("; ")}`);
    if (emptyPages.length) warningParts.push(`No selectable text was found on PDF page(s): ${emptyPages.join(", ")}.`);
    if (failedPages.length) warningParts.push(`Text extraction failed on PDF page(s): ${failedPages.join(", ")}.`);
    if (inputTruncated) warningParts.push("Only the first 60,000 characters were analyzed; later material needs review.");
    if (duplicateTitles.length) warningParts.push(`Possible duplicate lessons were omitted: ${Array.from(new Set(duplicateTitles)).slice(0, 20).join("; ")}.`);
    if (unresolvedDependencies.length) warningParts.push(`Some lesson dependencies could not be matched to exact extracted titles: ${Array.from(new Set(unresolvedDependencies)).slice(0, 20).join("; ")}.`);
    if (invalidPageReference.value) warningParts.push("Some generated source page references were outside the document page range and were omitted.");
    if (!unique.length) warningParts.push("No standalone lessons were confidently extracted; review the source material.");
    const warnings = warningParts.join(" ");
    await recordRef.set({
      processingStatus: warnings ? "requires_review" : "completed",
      totalPages,
      extractedLessonsCount: unique.length,
      reviewSections,
      warning: warnings,
      updatedAt: FieldValue.serverTimestamp(),
      originalName: fileInfo.originalName ?? object.name?.split("/").pop() ?? "",
    }, { merge: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "processing-failed";
    await recordRef.set({ processingStatus: "failed", warning: `Processing failed: ${reason}`, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    throw error;
  }
});


function requireOwnedFileId(uid: string, fileId: unknown): string {
  if (typeof fileId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(fileId)) {
    throw new HttpsError("invalid-argument", "A valid file ID is required.");
  }
  return `users/${uid}/files/${fileId}`;
}

export const createPrivateFileUrl = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to access this file.");
  const uid = request.auth.uid;
  const storagePath = requireOwnedFileId(uid, request.data?.fileId);
  const fileRecord = await db.doc(`users/${uid}/files/${request.data.fileId}`).get();
  if (!fileRecord.exists || fileRecord.data()?.storagePath !== storagePath) throw new HttpsError("not-found", "File not found.");
  const bucket = getStorage().bucket();
  const [url] = await bucket.file(storagePath).getSignedUrl({ action: "read", expires: Date.now() + 5 * 60 * 1000 });
  return { url, expiresInSeconds: 300 };
});

export const retryUploadedMaterial = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to retry processing.");
  const uid = request.auth.uid;
  const storagePath = requireOwnedFileId(uid, request.data?.fileId);
  const recordRef = db.doc(`users/${uid}/files/${request.data.fileId}`);
  const record = await recordRef.get();
  if (!record.exists || record.data()?.storagePath !== storagePath) throw new HttpsError("not-found", "File not found.");
  const fileData = record.data() ?? {};
  const missingAiConfiguration = fileData.processingStatus === "requires_review"
    && typeof fileData.warning === "string"
    && fileData.warning.includes("AI lesson analysis is not configured");
  if (fileData.processingStatus !== "failed" && !missingAiConfiguration) throw new HttpsError("failed-precondition", "This file is not eligible for processing retry.");
  const bucket = getStorage().bucket();
  const source = bucket.file(storagePath);
  const [exists] = await source.exists();
  if (!exists) throw new HttpsError("not-found", "The stored file is missing.");
  const temporaryPath = `users/${uid}/retry/${request.data.fileId}-${Date.now()}`;
  const temporary = bucket.file(temporaryPath);
  await source.copy(temporary);
  await temporary.copy(source);
  await temporary.delete();
  await recordRef.set({ processingStatus: "queued", warning: "", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { accepted: true };
});
