"use strict";

const { adminDb, adminAuth, Collections } = require("../db");
const { hashCode } = require("../crypto");
const { PLAN_DURATIONS, MASTER_ADMIN_CODE } = require("../constants");
const { ApiError } = require("../errors");
const { localSignUp, localSignIn } = require("../local");
const { expirationFrom } = require("./subscriptions");
const { registerDevice, verifyDevice } = require("./devices");
const { writeLog } = require("./logs");

function phoneToAuthEmail(phone) {
  const digits = phone.replace(/[^0-9]/g, "");
  return `${digits}@users.stufy.local`;
}

async function signUp(email, password) {
  return localSignUp(email, password);
}

async function signIn(email, password) {
  return localSignIn(email, password);
}

async function validateActivationCode(plaintext) {
  const normalized = String(plaintext || "").trim().toUpperCase();

  // Master admin code: grants manager/admin access. Only the manager holds it.
  if (MASTER_ADMIN_CODE && normalized === String(MASTER_ADMIN_CODE).toUpperCase()) {
    return {
      codeId: "master",
      codeHash: hashCode(normalized),
      planType: "master",
      isAdmin: true,
    };
  }

  const codeHash = hashCode(normalized);
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
    planType: data.planType,
    isAdmin: false,
  };
}

async function registerStudent(input) {
  const email = phoneToAuthEmail(input.phoneNumber);

  // Reject if the phone is already registered (as a student or as an admin).
  const existingStudent = await adminDb()
    .collection(Collections.students)
    .where("phoneNumber", "==", input.phoneNumber)
    .limit(1)
    .get();
  if (!existingStudent.empty) {
    throw new ApiError("PHONE_TAKEN", "An account already exists for this phone number.");
  }
  const existingAdmin = await adminDb()
    .collection(Collections.admins)
    .where("phoneNumber", "==", input.phoneNumber)
    .limit(1)
    .get();
  if (!existingAdmin.empty) {
    throw new ApiError("PHONE_TAKEN", "An account already exists for this phone number.");
  }

  let uid = "";
  try {
    const created = await signUp(email, input.password);
    uid = created.uid;
  } catch (error) {
    if (error.code === "EMAIL_EXISTS") {
      throw new ApiError("PHONE_TAKEN", "An account already exists for this phone number.");
    }
    throw error;
  }

  // ---- Master-code path: create an admin / manager account. ----
  if (input.isAdmin) {
    try {
      await adminAuth().setCustomUserClaims(uid, { role: "admin", admin: true });
      await adminAuth().updateUser(uid, { displayName: input.fullName });
      await adminDb().collection(Collections.admins).doc(uid).set({
        uid,
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        role: "admin",
        preferredLanguage: "ar",
        createdAt: new Date().toISOString(),
      });
    } catch {
      await adminAuth().deleteUser(uid);
      throw new ApiError("INTERNAL", "Could not create the admin account.");
    }
    await writeLog({
      actorId: uid,
      actorRole: "admin",
      actorName: input.fullName,
      action: "admin.create",
      targetId: uid,
      metadata: { via: "master_code" },
    });
    return {
      user: {
        uid,
        role: "admin",
        admin: true,
        phoneNumber: input.phoneNumber,
        fullName: input.fullName,
        language: "ar",
        accountStatus: "active",
      },
      deviceToken: null,
    };
  }

  // ---- Regular student path: consume a plan code and create a subscription. ----
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
      const code = codeSnap.data();
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
        createdAt: new Date().toISOString(),
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
        activatedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        activatedByStudentId: uid,
      });
      tx.set(subRef, {
        studentId: uid,
        activationCodeId: input.codeId,
        planType: input.planType,
        startedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
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

  const user = {
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

async function loginWithPhone(input) {
  const email = phoneToAuthEmail(input.phoneNumber);
  let uid;
  try {
    const signed = await signIn(email, input.password);
    uid = signed.uid;
  } catch {
    throw new ApiError("INVALID_CREDENTIALS", "Incorrect phone number or password.", 401);
  }

  const adminSnap = await adminDb().collection(Collections.admins).doc(uid).get();
  if (adminSnap.exists) {
    const data = adminSnap.data();
    const user = {
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
  const student = studentSnap.data();
  if (student.accountStatus === "suspended") {
    throw new ApiError("SUSPENDED", "This account is suspended.", 403);
  }

  const device = await verifyDevice(uid, input.deviceToken);
  const user = {
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

module.exports = {
  phoneToAuthEmail,
  signUp,
  signIn,
  validateActivationCode,
  registerStudent,
  loginWithPhone,
};
