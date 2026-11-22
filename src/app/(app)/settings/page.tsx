"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ACADEMIC_COPY, LEVEL_LABELS, academicDetailsError, gradesFor } from "@/lib/academics";
import { useAcademicOptions } from "@/lib/academic-options";
import { updateAcademicProfile, useProfile } from "@/lib/data";
import { useI18n, type Key, type Lang } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";
import type { EducationLevel } from "@/lib/types";

const THEMES: Array<{ id: Theme; label: Key }> = [
  { id: "light", label: "themeLight" },
  { id: "dark", label: "themeDark" },
  { id: "system", label: "themeSystem" },
];
const LEVELS: EducationLevel[] = ["primary", "preparatory", "secondary", "university", "other"];

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const copy = ACADEMIC_COPY[lang];
  const gradeOptions = useAcademicOptions();
  const { theme, setTheme } = useTheme();
  const { user, logOut, setDisplayName } = useAuth();
  const profile = useProfile(user?.uid);
  const router = useRouter();
  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">("");
  const [academicGrade, setAcademicGrade] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [otherAcademicLevel, setOtherAcademicLevel] = useState("");
  const [saved, setSaved] = useState(false);
  const [academicSaved, setAcademicSaved] = useState(false);
  const [error, setError] = useState(false);
  const [academicError, setAcademicError] = useState(false);

  useEffect(() => {
    setName(user?.displayName ?? profile.item?.fullName ?? "");
  }, [user?.displayName, profile.item?.fullName]);
  useEffect(() => {
    const p = profile.item;
    if (!p) return;
    setEducationLevel(p.educationLevel ?? "");
    setAcademicGrade(p.academicGrade ?? "");
    setUniversityName(p.universityName ?? "");
    setFaculty(p.faculty ?? "");
    setAcademicYear(p.academicYear ?? "");
    setOtherAcademicLevel(p.otherAcademicLevel ?? "");
  }, [profile.item]);

  async function onSaveName(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    setError(false);
    try { await setDisplayName(name); setSaved(true); } catch { setError(true); }
  }

  async function onSaveAcademic(event: FormEvent) {
    event.preventDefault();
    if (!user?.uid || !educationLevel || academicDetailsError({ educationLevel, academicGrade, otherAcademicLevel })) { setAcademicError(true); return; }
    setAcademicSaved(false);
    setAcademicError(false);
    try {
      await updateAcademicProfile(user.uid, { educationLevel, academicGrade, universityName, faculty, academicYear, otherAcademicLevel });
      setAcademicSaved(true);
    } catch { setAcademicError(true); }
  }

  async function onLogout() { await logOut(); router.replace("/login"); }
  const languages: Array<{ id: Lang; label: string }> = [{ id: "ar", label: "العربية" }, { id: "en", label: "English" }];
  const grades = educationLevel ? gradesFor(educationLevel, lang, gradeOptions) : [];

  return (
    <div className="stack">
      <h1 className="page-title">{t("settingsTitle")}</h1>
      <div className="card stack">
        <h2>{t("language")}</h2>
        <div className="chips">{languages.map((l) => <button key={l.id} type="button" className="chip" aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>)}</div>
      </div>
      <div className="card stack">
        <h2>{t("theme")}</h2>
        <div className="chips">{THEMES.map((item) => <button key={item.id} type="button" className="chip" aria-pressed={theme === item.id} onClick={() => setTheme(item.id)}>{t(item.label)}</button>)}</div>
      </div>
      <form className="card stack" onSubmit={onSaveAcademic}>
        <h2>{copy.question}</h2>
        {profile.loading ? <p className="muted">{t("loading")}</p> : null}
        <div className="field">
          <label htmlFor="profile-education-level">{copy.level}</label>
          <select id="profile-education-level" className="input" required value={educationLevel} onChange={(e) => { setEducationLevel(e.target.value as EducationLevel | ""); setAcademicGrade(""); }}>
            <option value="">{copy.select}</option>
            {LEVELS.map((level) => <option key={level} value={level}>{LEVEL_LABELS[lang][level]}</option>)}
          </select>
        </div>
        {grades.length ? <div className="field"><label htmlFor="profile-grade">{copy.grade}</label><select id="profile-grade" className="input" required value={academicGrade} onChange={(e) => setAcademicGrade(e.target.value)}><option value="">{copy.select}</option>{grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></div> : null}
        {educationLevel === "university" ? <div className="grid-2"><div className="field"><label htmlFor="profile-university">{copy.universityName}</label><input id="profile-university" className="input" value={universityName} onChange={(e) => setUniversityName(e.target.value)} /></div><div className="field"><label htmlFor="profile-faculty">{copy.faculty}</label><input id="profile-faculty" className="input" value={faculty} onChange={(e) => setFaculty(e.target.value)} /></div><div className="field"><label htmlFor="profile-academic-year">{copy.academicYear}</label><input id="profile-academic-year" className="input" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} /></div></div> : null}
        {educationLevel === "other" ? <div className="field"><label htmlFor="profile-other">{copy.otherLevel}</label><input id="profile-other" className="input" value={otherAcademicLevel} onChange={(e) => setOtherAcademicLevel(e.target.value)} required /></div> : null}
        {academicSaved ? <div className="alert alert-success">{t("saved")}</div> : null}
        {academicError || profile.error ? <div className="alert alert-error">{t("somethingWrong")}</div> : null}
        <button className="btn btn-primary" type="submit">{copy.save}</button>
      </form>
      <form className="card stack" onSubmit={onSaveName}>
        <h2>{t("account")}</h2>
        <div className="muted" dir="ltr" style={{ textAlign: "start" }}>{user?.email}</div>
        <div className="field"><label htmlFor="display-name">{t("displayName")}</label><input id="display-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        {saved ? <div className="alert alert-success">{t("saved")}</div> : null}
        {error ? <div className="alert alert-error">{t("somethingWrong")}</div> : null}
        <div className="row"><button className="btn btn-primary" type="submit">{t("save")}</button><span className="spacer" /><button className="btn btn-danger" type="button" onClick={onLogout}>{t("logout")}</button></div>
      </form>
    </div>
  );
}
