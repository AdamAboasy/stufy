import { FieldValue } from "firebase-admin/firestore";
import { adminBucket, adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { detectFile } from "@/lib/files/magic";
import { ApiError } from "@/lib/http";
import { extractDocument } from "@/services/ai/extract";
import { notifyStudent } from "@/services/notifications";
import type { ExtractionResult, FileProcessingJob, UploadedFile } from "@/types";

const processing = new Set<string>();

export async function uploadStudentFile(input: {
  studentId: string;
  filename: string;
  buffer: Buffer;
}) {
  if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new ApiError("FILE_TOO_LARGE", "File exceeds the 25 MB limit.");
  }
  const detected = detectFile(input.buffer, input.filename);
  const fileRef = adminDb().collection(Collections.uploadedFiles).doc();
  const storagePath = `student-files/${input.studentId}/${fileRef.id}/${input.filename}`;
  await adminBucket().file(storagePath).save(input.buffer, {
    contentType: detected.mime,
    metadata: { studentId: input.studentId, originalName: input.filename },
  });

  const file: Omit<UploadedFile, "createdAt" | "extractedAt"> & {
    createdAt: FirebaseFirestore.FieldValue;
    extractedAt: null;
  } = {
    id: fileRef.id,
    studentId: input.studentId,
    originalName: input.filename,
    storagePath,
    fileType: detected.type,
    mimeType: detected.mime,
    fileSize: input.buffer.length,
    processingStatus: "queued",
    totalPages: null,
    extractedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    errorMessage: null,
    unreadablePages: [],
    extractionId: null,
  };
  await fileRef.set(file);

  const jobRef = adminDb().collection(Collections.fileProcessingJobs).doc();
  await jobRef.set({
    fileId: fileRef.id,
    studentId: input.studentId,
    status: "queued",
    createdAt: FieldValue.serverTimestamp(),
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
    originalName: input.filename,
  });

  void processFileJob(jobRef.id, fileRef.id, input.studentId, input.buffer, detected.mime);

  return serializeDoc<UploadedFile>(fileRef.id, {
    ...file,
    createdAt: new Date(),
  });
}

export async function processFileJob(
  jobId: string,
  fileId: string,
  studentId: string,
  buffer: Buffer,
  mimeType: string,
) {
  if (processing.has(fileId)) return;
  processing.add(fileId);
  const jobRef = adminDb().collection(Collections.fileProcessingJobs).doc(jobId);
  const fileRef = adminDb().collection(Collections.uploadedFiles).doc(fileId);
  try {
    await jobRef.update({
      status: "processing",
      startedAt: FieldValue.serverTimestamp(),
    });
    await fileRef.update({ processingStatus: "processing" });

    const extraction = await extractDocument({ buffer, mimeType, fileId, studentId });
    const extractionRef = adminDb().collection(Collections.extractions).doc(extraction.id);
    await extractionRef.set(extraction);

    const failed = extraction.chapters.length === 0;
    const needsReview = extraction.uncertainty.length > 0 || failed;
    const status = failed ? "failed" : needsReview ? "requires_review" : "completed";

    await fileRef.update({
      processingStatus: status,
      totalPages: extraction.totalPages,
      extractedAt: FieldValue.serverTimestamp(),
      extractionId: extraction.id,
      errorMessage: failed ? extraction.warnings.join(" ") : null,
      unreadablePages: [],
    });
    await jobRef.update({
      status,
      finishedAt: FieldValue.serverTimestamp(),
      errorMessage: failed ? extraction.warnings.join(" ") : null,
    });

    await notifyStudent({
      studentId,
      type: failed ? "file_failed" : "file_processed",
      title: failed ? "File processing failed" : "File ready",
      body: failed
        ? "We could not extract readable content. You can retry processing."
        : needsReview
          ? "Your file was processed with some uncertainty. Review the extraction before planning."
          : "Your material is ready for study plan generation.",
      link: "/library",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    await fileRef.update({ processingStatus: "failed", errorMessage: message });
    await jobRef.update({
      status: "failed",
      finishedAt: FieldValue.serverTimestamp(),
      errorMessage: message,
    });
    await notifyStudent({
      studentId,
      type: "file_failed",
      title: "File processing failed",
      body: message,
      link: "/library",
    });
  } finally {
    processing.delete(fileId);
  }
}

export async function retryFile(studentId: string, fileId: string) {
  const snap = await adminDb().collection(Collections.uploadedFiles).doc(fileId).get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "File not found.", 404);
  }
  const file = snap.data()!;
  const [buf] = await adminBucket().file(file.storagePath).download();
  const jobRef = adminDb().collection(Collections.fileProcessingJobs).doc();
  await jobRef.set({
    fileId,
    studentId,
    status: "queued",
    createdAt: FieldValue.serverTimestamp(),
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
    originalName: file.originalName,
  });
  await snap.ref.update({ processingStatus: "queued", errorMessage: null });
  void processFileJob(jobRef.id, fileId, studentId, buf, file.mimeType);
}

export async function listFiles(studentId: string) {
  const snap = await adminDb()
    .collection(Collections.uploadedFiles)
    .where("studentId", "==", studentId)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return snap.docs.map((d) => serializeDoc<UploadedFile>(d.id, d.data()));
}

export async function getFile(studentId: string, fileId: string) {
  const snap = await adminDb().collection(Collections.uploadedFiles).doc(fileId).get();
  if (!snap.exists || snap.data()?.studentId !== studentId) {
    throw new ApiError("NOT_FOUND", "File not found.", 404);
  }
  return serializeDoc<UploadedFile>(snap.id, snap.data()!);
}

export async function getExtraction(studentId: string, fileId: string) {
  const file = await getFile(studentId, fileId);
  if (!file.extractionId) return null;
  const snap = await adminDb().collection(Collections.extractions).doc(file.extractionId).get();
  if (!snap.exists) return null;
  return snap.data() as ExtractionResult;
}

export async function deleteFile(studentId: string, fileId: string) {
  const file = await getFile(studentId, fileId);
  try {
    await adminBucket().file(file.storagePath).delete({ ignoreNotFound: true });
  } catch {
    // storage may be unavailable in some emulator states
  }
  await adminDb().collection(Collections.uploadedFiles).doc(fileId).delete();
}

export async function listAllJobs() {
  const snap = await adminDb()
    .collection(Collections.fileProcessingJobs)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return snap.docs.map((d) => serializeDoc<FileProcessingJob>(d.id, d.data()));
}
