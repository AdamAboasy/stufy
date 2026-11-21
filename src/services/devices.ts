import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import { generateToken, hashToken } from "@/lib/crypto";
import { ApiError } from "@/lib/http";
import { writeLog } from "@/services/logs";
import { notifyStudent } from "@/services/notifications";
import type { Device, DeviceChangeRequest } from "@/types";

export function parseDeviceName(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)) return "Safari";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Mobile|Android|iPhone/i.test(userAgent)) return "Mobile browser";
  return "Web browser";
}

export async function getActiveDevice(studentId: string) {
  const snap = await adminDb()
    .collection(Collections.devices)
    .where("studentId", "==", studentId)
    .where("status", "==", "active")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return serializeDoc<Device>(snap.docs[0].id, snap.docs[0].data());
}

export async function registerDevice(input: {
  studentId: string;
  userAgent: string;
  token?: string;
}) {
  const token = input.token || generateToken();
  const ref = adminDb().collection(Collections.devices).doc();
  await ref.set({
    studentId: input.studentId,
    deviceTokenHash: hashToken(token),
    deviceName: parseDeviceName(input.userAgent),
    userAgent: input.userAgent.slice(0, 300),
    registeredAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
    status: "active",
  });
  return { deviceId: ref.id, token };
}

export async function verifyDevice(studentId: string, token: string | null) {
  const active = await getActiveDevice(studentId);
  if (!active) return { ok: true as const, needsRegistration: true, active: null };
  if (!token) return { ok: false as const, needsRegistration: false, active };
  if (active.deviceTokenHash === hashToken(token)) {
    await adminDb().collection(Collections.devices).doc(active.id).update({
      lastSeenAt: FieldValue.serverTimestamp(),
    });
    return { ok: true as const, needsRegistration: false, active };
  }
  return { ok: false as const, needsRegistration: false, active };
}

export async function createDeviceChangeRequest(input: {
  studentId: string;
  studentName: string;
  userAgent: string;
}) {
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
    requestedUserAgent: input.userAgent.slice(0, 300),
    requestedDeviceTokenHash: hashToken(token),
    requestedDeviceTokenEncrypted: token,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    resolvedAt: null,
    resolvedByAdminId: null,
    adminNote: "",
  });
  return { requestId: ref.id, token };
}

export async function listDeviceRequests(status?: string) {
  let q: FirebaseFirestore.Query = adminDb().collection(Collections.deviceChangeRequests);
  if (status) q = q.where("status", "==", status);
  const snap = await q.orderBy("createdAt", "desc").limit(100).get();
  return snap.docs.map((d) => {
    const data = { ...d.data() };
    delete data.requestedDeviceTokenEncrypted;
    return serializeDoc<DeviceChangeRequest>(d.id, data);
  });
}

export async function resolveDeviceRequest(input: {
  requestId: string;
  approve: boolean;
  adminId: string;
  adminName: string;
  note?: string;
}) {
  const ref = adminDb().collection(Collections.deviceChangeRequests).doc(input.requestId);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError("NOT_FOUND", "Request not found.", 404);
  const data = snap.data()!;
  if (data.status !== "pending") throw new ApiError("INVALID", "Request is already resolved.");

  if (!input.approve) {
    await ref.update({
      status: "rejected",
      resolvedAt: FieldValue.serverTimestamp(),
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
    registeredAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
    status: "active",
  });
  batch.update(ref, {
    status: "approved",
    resolvedAt: FieldValue.serverTimestamp(),
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
