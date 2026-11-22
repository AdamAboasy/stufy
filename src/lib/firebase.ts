import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// NEXT_PUBLIC_* variables must be referenced literally so Next.js can inline them.
const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);
export type FirebaseServices = { app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage };

let cached: FirebaseServices | null = null;

/** Returns Firebase services, or null when unconfigured. Call only in the browser. */
export function getFirebase(): FirebaseServices | null {
  if (!firebaseConfigured) return null;
  if (cached) return cached;
  const app = getApps().length ? getApp() : initializeApp(config);
  cached = { app, auth: getAuth(app), db: getFirestore(app), storage: getStorage(app) };
  return cached;
}
