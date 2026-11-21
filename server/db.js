"use strict";

const {
  localDb,
  localAuth,
  localBucket,
  localBackendEnabled,
} = require("./local");

const Collections = {
  admins: "admins",
  students: "students",
  activationCodes: "activationCodes",
  subscriptions: "subscriptions",
  devices: "devices",
  deviceChangeRequests: "deviceChangeRequests",
  uploadedFiles: "uploadedFiles",
  fileProcessingJobs: "fileProcessingJobs",
  extractions: "extractions",
  studyPlans: "studyPlans",
  studyTasks: "studyTasks",
  routines: "routines",
  studySessions: "studySessions",
  notifications: "notifications",
  activityLogs: "activityLogs",
  systemSettings: "systemSettings",
  passwordRecoveryRequests: "passwordRecoveryRequests",
};

// This HTML/CSS/JS build uses the local file-backed backend by default so it runs
// anywhere with zero external services. The same code path mirrors the Firestore
// collections above.
function adminDb() {
  return localDb();
}

function adminAuth() {
  return localAuth();
}

function adminBucket() {
  return localBucket();
}

function useLocalBackend() {
  return localBackendEnabled();
}

function toIso(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

function serializeDoc(id, data) {
  const out = { id };
  for (const [key, value] of Object.entries(data || {})) {
    if (value && typeof value === "object" && typeof value.toDate === "function") {
      out[key] = value.toDate().toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

module.exports = {
  Collections,
  adminDb,
  adminAuth,
  adminBucket,
  useLocalBackend,
  toIso,
  serializeDoc,
};
