"use strict";

const { adminDb, adminAuth, Collections } = require("../db");
const { generateToken, hashToken } = require("../crypto");
const { ApiError } = require("../errors");
const { writeLog } = require("./logs");
const { notifyStudent } = require("./notifications");

function parseDeviceName(userAgent) {
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)) return "Safari";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Mobile|Android|iPhone/i.test(userAgent)) return "Mobile browser";
  return "Web browser";
}

async function getActiveDevice(studentId) {
  const snap = await adminDb()
    .collection(Collections.devices)
    .where("studentId", "==", studentId)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function registerDevice(input) {
  const token = input.token || generateToken();
  const ref = adminDb().collection(Collections.devices).doc();
  await ref.set({
    studentId: input.studentId,
    deviceTokenHash: hashToken(token),
    deviceName: parseDeviceName(input.userAgent),
    userAgent: (input.userAgent || "").slice(0, 300),
    registeredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    status: "active",
  });
  return { deviceId: ref.id, token };
}

async function verifyDevice(studentId, token) {
  const active = await getActiveDevice(studentId);
  if (!active) return { ok: true, needsRegistration: true, active: null };
  if (!token) return { ok: false, needsRegistration: false, active };
  if (active.deviceTokenHash === hashToken(token)) {
    await adminDb().collection(Collections.devices).doc(active.id).update({
      lastSeenAt: new Date().toISOString(),
    });
    return { ok: true, needsRegistration: false, active };
  }
  return { ok: false, needsRegistration: false, active };
}

async function createDeviceChangeRequest(input) {
  const active = await getActiveDevice(input.studentId);
  const pending = await adminDb()
    .collection(Collections.deviceChangeRequests)
    .where("studentId", "==", input.studentId)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!pending.empty) {
    throw new ApiError("PENDING", "A device change request is already pending.");
  }
  const token = generateToken();
  const ref = adminDb().collection(Collections.deviceChangeRequests).doc();
  await ref.set({
    studentId: input.studentId,
    studentName: input.studentName,
    currentDeviceId: active?.id || null,
    currentDeviceName: active?.deviceName || null,
    requestedDeviceName: parseDeviceName(input.userAgent),
    requestedUserAgent: (input.userAgent || "").slice(0, 300),
    requestedDeviceTokenHash: hashToken(token),
    requestedDeviceTokenEncrypted: token,
    status: "pending",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedByAdminId: null,
    adminNote: "",
  });
  return { requestId: ref.id, token };
}

async function listDeviceRequests(status) {
  let q = adminDb().collection(Collections.deviceChangeRequests);
  if (status) q = q.where("status", "==", status);
  const snap = await q.orderBy("createdAt", "desc").limit(100).get();
  return snap.docs.map((d) => {
    const data = { ...d.data() };
    delete data.requestedDeviceTokenEncrypted;
    return { id: d.id, ...data };
  });
}

async function resolveDeviceRequest(input) {
  const ref = adminDb().collection(Collections.deviceChangeRequests).doc(input.requestId);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError("NOT_FOUND", "Request not found.", 404);
  const data = snap.data();
  if (data.status !== "pending") throw new ApiError("INVALID", "Request is already resolved.");

  if (!input.approve) {
    await ref.update({
      status: "rejected",
      resolvedAt: new Date().toISOString(),
      resolvedByAdminId: input.adminId,
      adminNote: input.note || "",
    });
    await notifyStudent({
      studentId: data.studentId,
      type: "device_rejected",
      title: "Device change rejected",
      body: "Your request to use a new device was rejected. Keep using your registered device.",
    });
    await writeLog({
      actorId: input.adminId,
      actorRole: "admin",
      actorName: input.adminName,
      action: "device.reject",
      targetId: input.requestId,
    });
    return { approved: false };
  }

  const active = await getActiveDevice(data.studentId);
  const batch = adminDb().batch();
  if (active) {
    batch.update(adminDb().collection(Collections.devices).doc(active.id), {
      status: "revoked",
    });
  }
  const deviceRef = adminDb().collection(Collections.devices).doc();
  batch.set(deviceRef, {
    studentId: data.studentId,
    deviceTokenHash: data.requestedDeviceTokenHash,
    deviceName: data.requestedDeviceName,
    userAgent: data.requestedUserAgent,
    registeredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    status: "active",
  });
  batch.update(ref, {
    status: "approved",
    resolvedAt: new Date().toISOString(),
    resolvedByAdminId: input.adminId,
    adminNote: input.note || "",
  });
  await batch.commit();

  try {
    await adminAuth().revokeRefreshTokens(data.studentId);
  } catch {
    // Auth emulator / missing user should not block device rotation.
  }

  await notifyStudent({
    studentId: data.studentId,
    type: "device_approved",
    title: "Device change approved",
    body: "You can now use your new device. The previous device was revoked.",
  });
  await writeLog({
    actorId: input.adminId,
    actorRole: "admin",
    actorName: input.adminName,
    action: "device.approve",
    targetId: input.requestId,
  });
  return { approved: true };
}

module.exports = {
  parseDeviceName,
  getActiveDevice,
  registerDevice,
  verifyDevice,
  createDeviceChangeRequest,
  listDeviceRequests,
  resolveDeviceRequest,
};
