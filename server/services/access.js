"use strict";

const { adminDb, Collections } = require("../db");

const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  allowRegistrations: true,
  adminOnly: true,
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

module.exports = { getSettings, isAdminOnly, setAdminOnly, DEFAULT_SETTINGS };
