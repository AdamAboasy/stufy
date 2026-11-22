"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LangToggle } from "@/components/lang-toggle";
import { Logo } from "@/components/logo";
import { SetupNotice } from "@/components/setup-notice";
import { ACADEMIC_COPY, LEVEL_LABELS, gradesFor } from "@/lib/academics";
import { useAcademicOptions } from "@/lib/academic-options";
import { useAuth } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";
import type { EducationLevel } from "@/lib/types";

const LEVELS: EducationLevel[] = ["primary", "preparatory", "secondary", "university", "other"];

function errorKey(error: unknown): Key {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-login-credentials": return "errInvalidCredentials";
    case "auth/email-already-in-use": return "errEmailInUse";
    case "auth/weak-password": return "errWeakPassword";
    case "auth/invalid-email": return "errInvalidEmail";
    case "auth/operation-not-allowed": return "errOperationNotAllowed";
    case "auth/too-many-requests": return "errTooManyRequests";
    case "auth/network-request-failed": return "errNetwork";
    default: return "somethingWrong";
  }
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t, lang } = useI18n();
  const copy = ACADEMIC_COPY[lang];
  const gradeOptions = useAcademicOptions();
  const { user, loading, configured, signIn, signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">("");
  const [academicGrade, setAcademicGrade] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [otherAcademicLevel, setOtherAcademicLevel] = useState("");
  const [error, setError] = useState<Key | "academicRequired" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "register" && !educationLevel) {
      setError("academicRequired");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") await signIn(email.trim(), password);
      else await signUp(name, email.trim(), password, {
        educationLevel: educationLevel as EducationLevel,
        academicGrade,
        universityName,
        faculty,
        academicYear,
        otherAcademicLevel,
      }, phoneNumber);
      router.replace("/dashboard");
    } catch (err) {
      setError(errorKey(err));
      setBusy(false);
    }
  }

  const isLogin = mode === "login";
  const grades = educationLevel ? gradesFor(educationLevel, lang, gradeOptions) : [];

  return (
    <div className="auth-wrap">
      <div className="corner"><LangToggle /></div>
      <div className="auth-card stack">
        <div className="center stack" style={{ alignItems: "center" }}>
          <Logo size={88} />
          <h1>{isLogin ? t("loginTitle") : t("registerTitle")}</h1>
        </div>
        {!configured ? <SetupNotice /> : (
          <form className="card stack" onSubmit={onSubmit}>
            {!isLogin ? <div className="field"><label htmlFor="name">{t("fullName")}</label><input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></div> : null}
            {!isLogin ? <div className="field"><label htmlFor="phone-number">{t("phoneNumber")}</label><input id="phone-number" className="input" type="tel" dir="ltr" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} autoComplete="tel" /></div> : null}
            {!isLogin ? (
              <fieldset className="academic-fields stack">
                <legend>{copy.question}</legend>
                <div className="field">
                  <label htmlFor="education-level">{copy.level}</label>
                  <select id="education-level" className="input" required value={educationLevel} onChange={(e) => { setEducationLevel(e.target.value as EducationLevel | ""); setAcademicGrade(""); }}>
                    <option value="">{copy.select}</option>
                    {LEVELS.map((level) => <option key={level} value={level}>{LEVEL_LABELS[lang][level]}</option>)}
                  </select>
                </div>
                {grades.length ? <div className="field"><label htmlFor="academic-grade">{copy.grade}</label><select id="academic-grade" className="input" value={academicGrade} onChange={(e) => setAcademicGrade(e.target.value)}><option value="">{copy.select}</option>{grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></div> : null}
                {educationLevel === "university" ? <div className="stack"><p className="muted small">{copy.university}</p><div className="field"><label htmlFor="university-name">{copy.universityName}</label><input id="university-name" className="input" value={universityName} onChange={(e) => setUniversityName(e.target.value)} /></div><div className="field"><label htmlFor="faculty">{copy.faculty}</label><input id="faculty" className="input" value={faculty} onChange={(e) => setFaculty(e.target.value)} /></div><div className="field"><label htmlFor="academic-year">{copy.academicYear}</label><input id="academic-year" className="input" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} /></div></div> : null}
                {educationLevel === "other" ? <div className="field"><label htmlFor="other-level">{copy.otherLevel}</label><input id="other-level" className="input" value={otherAcademicLevel} onChange={(e) => setOtherAcademicLevel(e.target.value)} required /></div> : null}
              </fieldset>
            ) : null}
            <div className="field"><label htmlFor="email">{t("email")}</label><input id="email" className="input" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            <div className="field"><label htmlFor="password">{t("password")}</label><input id="password" className="input" type="password" dir="ltr" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isLogin ? "current-password" : "new-password"} /></div>
            {error ? <div className="alert alert-error" role="alert">{error === "academicRequired" ? copy.required : t(error)}</div> : null}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? t("loading") : isLogin ? t("login") : t("register")}</button>
          </form>
        )}
        <p className="center muted">{isLogin ? t("noAccount") : t("haveAccount")} <Link href={isLogin ? "/register" : "/login"}>{isLogin ? t("register") : t("login")}</Link></p>
      </div>
    </div>
  );
}
