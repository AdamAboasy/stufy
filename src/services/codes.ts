import { FieldValue } from "firebase-admin/firestore";
import { adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import {
  decryptSecret,
  encryptSecret,
  generateActivationCode,
  hashCode,
} from "@/lib/crypto";
import { PLAN_DURATIONS } from "@/lib/constants";
import { ApiError } from "@/lib/http";
import { writeLog } from "@/services/logs";
import type { ActivationCode, CodeStatus, GeneratedCode, PlanType } from "@/types";
import * as XLSX from "xlsx";

export async function generateCodes(input: {
  planType: PlanType;
  quantity: number;
  notes: string;
  adminId: string;
  adminName: string;
}) {
  const batchId = `batch_${Date.now().toString(36)}`;
  const generated: GeneratedCode[] = [];
  const writer = adminDb().batch();

  for (let i = 0; i < input.quantity; i++) {
    const plaintext = generateActivationCode();
    const ref = adminDb().collection(Collections.activationCodes).doc();
    const record = {
      codeHash: hashCode(plaintext),
      codePrefix: plaintext.slice(0, 10),
      codeEncrypted: encryptSecret(plaintext),
      planType: input.planType,
      status: "available" as CodeStatus,
      createdAt: FieldValue.serverTimestamp(),
      activatedAt: null,
      expiresAt: null,
      activatedByStudentId: null,
      createdByAdminId: input.adminId,
      notes: input.notes,
      batchId,
    };
    writer.set(ref, record);
    generated.push({
      id: ref.id,
      codeHash: record.codeHash,
      codePrefix: record.codePrefix,
      planType: input.planType,
      status: "available",
      createdAt: new Date().toISOString(),
      activatedAt: null,
      expiresAt: null,
      activatedByStudentId: null,
      createdByAdminId: input.adminId,
      notes: input.notes,
      batchId,
      plaintext,
    });
  }

  await writer.commit();
  await writeLog({
    actorId: input.adminId,
    actorRole: "admin",
    actorName: input.adminName,
    action: "code.generate",
    targetId: batchId,
    metadata: { quantity: input.quantity, planType: input.planType },
  });
  return { batchId, codes: generated };
}

export async function findCodeByPlaintext(plaintext: string) {
  const codeHash = hashCode(plaintext);
  const snap = await adminDb()
    .collection(Collections.activationCodes)
    .where("codeHash", "==", codeHash)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return serializeDoc<ActivationCode>(snap.docs[0].id, snap.docs[0].data());
}

export async function listCodes(filters: {
  status?: CodeStatus;
  planType?: PlanType;
  search?: string;
  limit?: number;
}) {
  let q: FirebaseFirestore.Query = adminDb().collection(Collections.activationCodes);
  if (filters.status) q = q.where("status", "==", filters.status);
  if (filters.planType) q = q.where("planType", "==", filters.planType);
  q = q.orderBy("createdAt", "desc").limit(filters.limit || 100);
  const snap = await q.get();
  let items = snap.docs.map((d) => serializeDoc<ActivationCode>(d.id, d.data()));
  if (filters.search) {
    const s = filters.search.toUpperCase();
    items = items.filter(
      (c) => c.codePrefix.includes(s) || c.id.includes(filters.search!) || c.notes.includes(filters.search!),
    );
  }
  return items;
}

export async function updateCodeStatus(
  codeId: string,
  status: Extract<CodeStatus, "revoked" | "suspended" | "available">,
  admin: { uid: string; fullName: string },
) {
  const ref = adminDb().collection(Collections.activationCodes).doc(codeId);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Code not found.", 404);
    const current = snap.data()!.status as CodeStatus;
    if (status === "available") {
      throw new ApiError("INVALID", "A used code cannot become available.");
    }
    if (current === "active" && status === "revoked") {
      tx.update(ref, { status: "revoked" });
      return;
    }
    if (current === "available" && (status === "revoked" || status === "suspended")) {
      tx.update(ref, { status });
      return;
    }
    if (current === "suspended" && status === "revoked") {
      tx.update(ref, { status });
      return;
    }
    throw new ApiError("INVALID", `Cannot change status from ${current} to ${status}.`);
  });
  await writeLog({
    actorId: admin.uid,
    actorRole: "admin",
    actorName: admin.fullName,
    action: `code.${status}`,
    targetId: codeId,
  });
}

export function exportCodesXlsx(codes: GeneratedCode[]) {
  const rows = codes.map((c) => ({
    Code: c.plaintext,
    Plan: c.planType,
    DurationDays: PLAN_DURATIONS[c.planType],
    Status: c.status,
    Prefix: c.codePrefix,
    Batch: c.batchId,
    Notes: c.notes,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Codes");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function decryptCode(codeId: string) {
  const snap = await adminDb().collection(Collections.activationCodes).doc(codeId).get();
  if (!snap.exists) throw new ApiError("NOT_FOUND", "Code not found.", 404);
  const encrypted = snap.data()?.codeEncrypted as string | undefined;
  if (!encrypted) throw new ApiError("UNAVAILABLE", "Plaintext is no longer stored for this code.");
  return decryptSecret(encrypted);
}
