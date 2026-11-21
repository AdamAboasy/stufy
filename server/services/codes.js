"use strict";

const { adminDb, Collections } = require("../db");
const {
  decryptSecret,
  encryptSecret,
  generateActivationCode,
  hashCode,
} = require("../crypto");
const { PLAN_DURATIONS } = require("../constants");
const { ApiError } = require("../errors");
const { writeLog } = require("./logs");

async function generateCodes(input) {
  const batchId = `batch_${Date.now().toString(36)}`;
  const generated = [];
  const writer = adminDb().batch();

  for (let i = 0; i < input.quantity; i++) {
    const plaintext = generateActivationCode();
    const ref = adminDb().collection(Collections.activationCodes).doc();
    const record = {
      codeHash: hashCode(plaintext),
      codePrefix: plaintext.slice(0, 10),
      codeEncrypted: encryptSecret(plaintext),
      planType: input.planType,
      status: "available",
      createdAt: new Date().toISOString(),
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

async function findCodeByPlaintext(plaintext) {
  const codeHash = hashCode(plaintext);
  const snap = await adminDb()
    .collection(Collections.activationCodes)
    .where("codeHash", "==", codeHash)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function listCodes(filters) {
  let q = adminDb().collection(Collections.activationCodes);
  if (filters.status) q = q.where("status", "==", filters.status);
  if (filters.planType) q = q.where("planType", "==", filters.planType);
  q = q.orderBy("createdAt", "desc").limit(filters.limit || 100);
  const snap = await q.get();
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (filters.search) {
    const s = filters.search.toUpperCase();
    items = items.filter(
      (c) => c.codePrefix.includes(s) || c.id.includes(filters.search) || (c.notes || "").includes(filters.search),
    );
  }
  return items;
}

async function updateCodeStatus(codeId, status, admin) {
  const ref = adminDb().collection(Collections.activationCodes).doc(codeId);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Code not found.", 404);
    const current = snap.data().status;
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

function exportCodesXlsx(codes) {
  const rows = codes.map((c) => ({
    Code: c.plaintext,
    Plan: c.planType,
    DurationDays: PLAN_DURATIONS[c.planType],
    Status: c.status,
    Prefix: c.codePrefix,
    Batch: c.batchId,
    Notes: c.notes,
  }));
  return rows;
}

async function decryptCode(codeId) {
  const snap = await adminDb().collection(Collections.activationCodes).doc(codeId).get();
  if (!snap.exists) throw new ApiError("NOT_FOUND", "Code not found.", 404);
  const encrypted = snap.data()?.codeEncrypted;
  if (!encrypted) throw new ApiError("UNAVAILABLE", "Plaintext is no longer stored for this code.");
  return decryptSecret(encrypted);
}

module.exports = {
  generateCodes,
  findCodeByPlaintext,
  listCodes,
  updateCodeStatus,
  exportCodesXlsx,
  decryptCode,
};
