import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb, Collections } from "@/lib/firebase/admin";
import { hashCode } from "@/lib/crypto";
import { PLAN_DURATIONS } from "@/lib/constants";
import { ApiError } from "@/lib/http";
import { phoneToAuthEmail, restSignIn, restSignUp } from "@/lib/auth/firebase-rest";
import { expirationFrom } from "@/services/subscriptions";
import { registerDevice, verifyDevice } from "@/services/devices";
import { writeLog } from "@/services/logs";
import type { PlanType, SessionUser } from "@/types";

export async function validateActivationCode(plaintext: string) {
  const codeHash = hashCode(plaintext);
  const snap = await adminDb()
    .collection(Collections.activationCodes)
    .where("codeHash", "==", codeHash)
    .limit(1)
    .get();
  if (snap.empty) throw new ApiError("INVALID_CODE", "This activation code is not valid.");
  const data = snap.docs[0].data();
  if (data.status !== "available") {
    throw new ApiError("CODE_UNAVAILABLE", `This code is ${data.status}.`);
  }
  return {
    codeId: snap.docs[0].id,
    codeHash,
    planType: data.planType as PlanType,
  };
}

export async function registerStudent(input: {
  fullName: string;
  phoneNumber: string;
  password: string;
  codeId: string;
  codeHash: string;
  planType: PlanType;
  userAgent: string;
}) {
  const email = phoneToAuthEmail(input.phoneNumber);
  const existing = await adminDb()
    .collection(Collections.students)
    .where("phoneNumber", "==", input.phoneNumber)
    .limit(1)
    .get();
  if (!existing.empty) {
    throw new ApiError("PHONE_TAKEN", "An account already exists for this phone number.");
  }

  let uid = "";
  try {
    const created = await restSignUp(email, input.password);
    uid = created.uid;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "EMAIL_EXISTS") {
      throw new ApiError("PHONE_TAKEN", "An account already exists for this phone number.");
    }
    throw error;
  }

  try {
    await adminAuth().setCustomUserClaims(uid, { role: "student", admin: false });
    await adminAuth().updateUser(uid, { displayName: input.fullName });
  } catch {
    // claims can be retried; continue with transaction
  }

  const now = new Date();
  const expiresAt = expirationFrom(now, input.planType);
  const codeRef = adminDb().collection(Collections.activationCodes).doc(input.codeId);
  const studentRef = adminDb().collection(Collections.students).doc(uid);
  const subRef = adminDb().collection(Collections.subscriptions).doc();

  try {
    await adminDb().runTransaction(async (tx) => {
      const codeSnap = await tx.get(codeRef);
      if (!codeSnap.exists) throw new ApiError("INVALID_CODE", "This activation code is not valid.");
      const code = codeSnap.data()!;
      if (code.status !== "available") {
        throw new ApiError("CODE_UNAVAILABLE", `This code is ${code.status}.`);
      }
      if (code.codeHash !== input.codeHash) {
        throw new ApiError("INVALID_CODE", "This activation code is not valid.");
      }
      tx.set(studentRef, {
        uid,
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        role: "student",
        createdAt: FieldValue.serverTimestamp(),
        accountStatus: "active",
        preferredLanguage: "ar",
        theme: "system",
        timezone: "Africa/Cairo",
        restDays: [5],
        preferredSessionMinutes: 45,
        dailyStudyMinutes: 120,
      });
      tx.update(codeRef, {
        status: "active",
        activatedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        activatedByStudentId: uid,
      });
      tx.set(subRef, {
        studentId: uid,
        activationCodeId: input.codeId,
        planType: input.planType,
        startedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        status: "active",
        renewedAt: null,
        studentName: input.fullName,
        studentPhone: input.phoneNumber,
      });
    });
  } catch (error) {
    try {
      await adminAuth().deleteUser(uid);
    } catch {
      await writeLog({
        actorId: uid,
        actorRole: "student",
        actorName: input.fullName,
        action: "auth.recovery_needed",
        targetId: uid,
        metadata: { reason: "activation_failed_after_account_create" },
      });
    }
    throw error;
  }

  const device = await registerDevice({
    studentId: uid,
    userAgent: input.userAgent,
  });

  await writeLog({
    actorId: uid,
    actorRole: "student",
    actorName: input.fullName,
    action: "code.activate",
    targetId: input.codeId,
    metadata: { planType: input.planType, days: PLAN_DURATIONS[input.planType] },
  });

  const user: SessionUser = {
    uid,
    role: "student",
    admin: false,
    phoneNumber: input.phoneNumber,
    fullName: input.fullName,
    language: "ar",
    accountStatus: "active",
  };
  return { user, deviceToken: device.token };
}

export async function loginWithPhone(input: {
  phoneNumber: string;
  password: string;
  userAgent: string;
  deviceToken: string | null;
}) {
  const email = phoneToAuthEmail(input.phoneNumber);
  let uid: string;
  try {
    const signed = await restSignIn(email, input.password);
    uid = signed.uid;
  } catch {
    throw new ApiError("INVALID_CREDENTIALS", "Incorrect phone number or password.", 401);
  }

  const adminSnap = await adminDb().collection(Collections.admins).doc(uid).get();
  if (adminSnap.exists) {
    const data = adminSnap.data()!;
    const user: SessionUser = {
      uid,
      role: "admin",
      admin: true,
      phoneNumber: data.phoneNumber,
      fullName: data.fullName,
      language: data.preferredLanguage || "ar",
      accountStatus: "active",
    };
    return { user, deviceMismatch: false, deviceToken: input.deviceToken };
  }

  const studentSnap = await adminDb().collection(Collections.students).doc(uid).get();
  if (!studentSnap.exists) {
    throw new ApiError("INVALID_CREDENTIALS", "Incorrect phone number or password.", 401);
  }
  const student = studentSnap.data()!;
  if (student.accountStatus === "suspended") {
    throw new ApiError("SUSPENDED", "This account is suspended.", 403);
  }

  const device = await verifyDevice(uid, input.deviceToken);
  const user: SessionUser = {
    uid,
    role: "student",
    admin: false,
    phoneNumber: student.phoneNumber,
    fullName: student.fullName,
    language: student.preferredLanguage || "ar",
    accountStatus: student.accountStatus,
  };

  if (device.needsRegistration) {
    const registered = await registerDevice({
      studentId: uid,
      userAgent: input.userAgent,
      token: input.deviceToken || undefined,
    });
    return { user, deviceMismatch: false, deviceToken: registered.token };
  }

  if (!device.ok) {
    return { user, deviceMismatch: true, deviceToken: input.deviceToken, currentDevice: device.active };
  }

  return { user, deviceMismatch: false, deviceToken: input.deviceToken };
}
