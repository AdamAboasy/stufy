"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { firebaseConfigured, getFirebase } from "./firebase";
import { academicDetailsError } from "./academics";
import type { EducationLevel, Role } from "./types";

export type AcademicRegistration = {
  educationLevel: EducationLevel;
  academicGrade?: string;
  universityName?: string;
  faculty?: string;
  academicYear?: string;
  otherAcademicLevel?: string;
};

type AuthContextValue = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, academic: AcademicRegistration, phoneNumber?: string) => Promise<void>;
  logOut: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function requireFirebase() {
  const fb = getFirebase();
  if (!fb) throw new Error("firebase-not-configured");
  return fb;
}

function roleFromClaims(claims: Record<string, unknown>, signedIn: boolean): Role | null {
  // Profile fields and client input are deliberately ignored. A missing claim is student-only.
  return claims.role === "super_admin" ? "super_admin" : signedIn ? "student" : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) {
      setLoading(false);
      return;
    }
    return onIdTokenChanged(fb.auth, async (next) => {
      setUser(next);
      if (!next) {
        setRole(null);
        setLoading(false);
        return;
      }
      try {
        const token = await next.getIdTokenResult();
        setRole(roleFromClaims(token.claims, true));
      } catch {
        setRole("student");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      configured: firebaseConfigured,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(requireFirebase().auth, email, password);
      },
      signUp: async (name, email, password, academic, phoneNumber) => {
        if (academicDetailsError(academic)) throw new Error("academic-profile-incomplete");
        const fb = requireFirebase();
        const credential = await createUserWithEmailAndPassword(fb.auth, email, password);
        const cleanName = name.trim();
        if (cleanName) await updateProfile(credential.user, { displayName: cleanName });
        const profile: Record<string, unknown> = {
          uid: credential.user.uid,
          fullName: cleanName,
          role: "student",
          educationLevel: academic.educationLevel,
          updatedAt: serverTimestamp(),
        };
        if (phoneNumber?.trim()) profile.phoneNumber = phoneNumber.trim();
        if (["primary", "preparatory", "secondary"].includes(academic.educationLevel)) {
          const grade = academic.academicGrade?.trim();
          if (grade) profile.academicGrade = grade;
        } else if (academic.educationLevel === "university") {
          const universityName = academic.universityName?.trim();
          const faculty = academic.faculty?.trim();
          const academicYear = academic.academicYear?.trim();
          if (universityName) profile.universityName = universityName;
          if (faculty) profile.faculty = faculty;
          if (academicYear) profile.academicYear = academicYear;
        } else if (academic.educationLevel === "other") {
          const otherAcademicLevel = academic.otherAcademicLevel?.trim();
          if (otherAcademicLevel) profile.otherAcademicLevel = otherAcademicLevel;
        }
        await setDoc(doc(fb.db, "users", credential.user.uid), profile, { merge: true });
        setUser(credential.user);
        const token = await credential.user.getIdTokenResult();
        setRole(roleFromClaims(token.claims, true));
      },
      logOut: async () => {
        await signOut(requireFirebase().auth);
      },
      setDisplayName: async (name) => {
        const fb = requireFirebase();
        const current = fb.auth.currentUser;
        if (!current) return;
        const cleanName = name.trim();
        await updateProfile(current, { displayName: cleanName });
        const profileRef = doc(fb.db, "users", current.uid);
        try {
          await updateDoc(profileRef, { fullName: cleanName, updatedAt: serverTimestamp() });
        } catch (error) {
          if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "not-found") throw error;
          await setDoc(profileRef, { uid: current.uid, fullName: cleanName, role: "student", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
        setUser(current);
      },
    }),
    [user, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
