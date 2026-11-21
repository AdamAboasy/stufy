import { useEmulators, useLocalBackend } from "@/lib/firebase/admin";
import { localSignIn, localSignUp } from "@/lib/firebase/local";

function authBase() {
  if (useEmulators()) {
    return "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
  }
  return "https://identitytoolkit.googleapis.com/v1";
}

function apiKey() {
  if (useEmulators()) return "fake-api-key";
  const key = process.env.FIREBASE_WEB_API_KEY;
  if (!key) throw new Error("FIREBASE_WEB_API_KEY is not configured.");
  return key;
}

export function phoneToAuthEmail(phoneNumber: string) {
  const digits = phoneNumber.replace(/[^\d]/g, "");
  return `${digits}@users.stufy.local`;
}

export async function restSignIn(email: string, password: string) {
  if (useLocalBackend()) return localSignIn(email, password);
  const res = await fetch(
    `${authBase()}/accounts:signInWithPassword?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = (await res.json()) as {
    idToken?: string;
    localId?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.idToken || !data.localId) {
    const message = data.error?.message || "INVALID_CREDENTIALS";
    throw Object.assign(new Error(message), { code: message });
  }
  return { idToken: data.idToken, uid: data.localId };
}

export async function restSignUp(email: string, password: string) {
  if (useLocalBackend()) return localSignUp(email, password);
  const res = await fetch(`${authBase()}/accounts:signUp?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = (await res.json()) as {
    idToken?: string;
    localId?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.localId) {
    const message = data.error?.message || "SIGNUP_FAILED";
    throw Object.assign(new Error(message), { code: message });
  }
  return { idToken: data.idToken || "", uid: data.localId };
}
