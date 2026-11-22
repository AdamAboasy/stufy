"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { firebaseConfigured, getFirebase } from "./firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function requireAuth() {
  const fb = getFirebase();
  if (!fb) throw new Error("firebase-not-configured");
  return fb.auth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, bump] = useState(0);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(fb.auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(requireAuth(), email, password);
      },
      signUp: async (name, email, password) => {
        const auth = requireAuth();
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
        setUser(cred.user);
        bump((n) => n + 1);
      },
      logOut: async () => {
        await signOut(requireAuth());
      },
      setDisplayName: async (name) => {
        const auth = requireAuth();
        if (!auth.currentUser) return;
        await updateProfile(auth.currentUser, { displayName: name.trim() });
        setUser(auth.currentUser);
        bump((n) => n + 1);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
