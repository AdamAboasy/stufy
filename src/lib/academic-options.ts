"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebase } from "./firebase";
import { DEFAULT_GRADE_OPTIONS, normalizeGradeOptions, type GradeOptions } from "./academics";

export function useAcademicOptions(): GradeOptions {
  const [options, setOptions] = useState(DEFAULT_GRADE_OPTIONS);
  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return;
    return onSnapshot(doc(fb.db, "configuration", "academic"), (snapshot) => {
      setOptions(snapshot.exists() ? normalizeGradeOptions(snapshot.data().gradeOptions) : DEFAULT_GRADE_OPTIONS);
    }, () => setOptions(DEFAULT_GRADE_OPTIONS));
  }, []);
  return options;
}
