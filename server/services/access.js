"use strict";

const { adminDb, Collections } = require("../db");

const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  allowRegistrations: true,
  adminOnly: true,
  autoLogin: true,
  maxFileSizeMb: 25,
  subscriptionReminderDays: 3,
};

async function getSettings() {
  const snap = await adminDb().collection(Collections.systemSettings).doc("default").get();
  return { ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() : {}) };
}

async function isAdminOnly() {
  const settings = await getSettings();
  return Boolean(settings.adminOnly);
}

async function isAutoLogin() {
  const settings = await getSettings();
  return Boolean(settings.autoLogin);
}

async function setAdminOnly(value, admin) {
  await adminDb().collection(Collections.systemSettings).doc("default").set(
    { adminOnly: Boolean(value), updatedAt: new Date().toISOString() },
    { merge: true },
  );
  if (admin) {
    const { writeLog } = require("./logs");
    await writeLog({
      actorId: admin.uid,
      actorRole: "admin",
      actorName: admin.fullName,
      action: "settings.admin_only",
      targetId: "default",
      metadata: { adminOnly: Boolean(value) },
    });
  }
  return Boolean(value);
}

async function setAutoLogin(value, admin) {
  await adminDb().collection(Collections.systemSettings).doc("default").set(
    { autoLogin: Boolean(value), updatedAt: new Date().toISOString() },
    { merge: true },
  );
  if (admin) {
    const { writeLog } = require("./logs");
    await writeLog({
      actorId: admin.uid,
      actorRole: "admin",
      actorName: admin.fullName,
      action: "settings.auto_login",
      targetId: "default",
      metadata: { autoLogin: Boolean(value) },
    });
  }
  return Boolean(value);
}

// Sign the first admin in automatically (used by the auto-login mode so the
// app opens straight into the admin panel without any sign-in step).
async function autoSignInAdmin() {
  const snap = await adminDb().collection(Collections.admins).limit(1).get();
  if (snap.empty) return null;
  const admin = snap.docs[0].data();
  const { masterLoginOrRegister } = require("./auth");
  return await masterLoginOrRegister(admin.phoneNumber, admin.fullName);
}

module.exports = {
  getSettings,
  isAdminOnly,
  isAutoLogin,
  setAdminOnly,
  setAutoLogin,
  autoSignInAdmin,
  DEFAULT_SETTINGS,
};
