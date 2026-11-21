import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { localAuth, localBackendEnabled, localBucket, localDb } from "@/lib/firebase/local";
import { firebaseWebConfig } from "@/lib/firebase/config";

type ServiceAccountFile = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function serviceAccountPath() {
  return (
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    join(process.cwd(), "serviceAccount.json")
  );
}

export function readServiceAccount(): ServiceAccountFile | null {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID || firebaseWebConfig.projectId,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  const path = serviceAccountPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ServiceAccountFile;
  } catch {
    return null;
  }
}

export function hasAdminCredentials() {
  const account = readServiceAccount();
  return Boolean(account?.client_email && account?.private_key);
}

export function useEmulators() {
  if (process.env.USE_FIREBASE_EMULATORS === "true" && !localBackendEnabled()) return true;
  if (process.env.USE_FIREBASE_EMULATORS === "false") return false;
  return false;
}

export function useLocalBackend() {
  return localBackendEnabled();
}

function ensureApp() {
  if (getApps().length) return;
  if (useLocalBackend()) return;

  const account = readServiceAccount();
  const projectId =
    account?.project_id ||
    process.env.FIREBASE_PROJECT_ID ||
    firebaseWebConfig.projectId ||
    "stufy-dev";
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    firebaseWebConfig.storageBucket ||
    `${projectId}.appspot.com`;

  if (useEmulators()) {
    process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= "127.0.0.1:9199";
    initializeApp({ projectId, storageBucket });
    return;
  }

  if (!account?.client_email || !account.private_key) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
    storageBucket,
  });
}

export function adminAuth() {
  if (useLocalBackend()) return localAuth() as unknown as ReturnType<typeof getAuth>;
  ensureApp();
  return getAuth();
}

export function adminDb() {
  if (useLocalBackend()) return localDb() as unknown as FirebaseFirestore.Firestore;
  ensureApp();
  return getFirestore();
}

export function adminBucket() {
  if (useLocalBackend()) {
    return localBucket() as unknown as ReturnType<typeof getStorage> extends {
      bucket: () => infer B;
    }
      ? B
      : never;
  }
  ensureApp();
  return getStorage().bucket();
}

export const Collections = {
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
} as const;

export function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function serializeDoc<T>(id: string, data: FirebaseFirestore.DocumentData): T {
  const out: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "toDate" in (value as object)) {
      out[key] = (value as { toDate: () => Date }).toDate().toISOString();
    } else {
      out[key] = value;
    }
  }
  return out as T;
}
