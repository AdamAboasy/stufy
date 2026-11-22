"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebase } from "@/lib/firebase";
import { ACADEMIC_COPY, DEFAULT_GRADE_OPTIONS, LEVEL_LABELS, normalizeGradeOptions, type GradeOptions, type Language, type SchoolGradeLevel } from "@/lib/academics";
import { useAcademicOptions } from "@/lib/academic-options";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { EducationLevel, Role } from "@/lib/types";

type StudentRow = {
  uid: string; fullName?: string; phoneNumber?: string; role?: Role; educationLevel?: EducationLevel;
  academicGrade?: string; universityName?: string; faculty?: string; academicYear?: string;
  subscriptionType?: string; subscriptionStatus?: string; subscriptionExpiresAt?: string | number | { toDate: () => Date };
  accountStatus?: string; registeredDevice?: string;
};
type ActivityRow = { id: string; actorUid?: string; targetUid?: string; action?: string; role?: Role; createdAt?: { toDate: () => Date } };
const EDUCATION_LEVELS: EducationLevel[] = ["primary", "preparatory", "secondary", "university", "other"];

function formatExpiration(value: StudentRow["subscriptionExpiresAt"], language: "ar" | "en", fallback: string): string {
  if (value === undefined || value === null || value === "") return fallback;
  const date = typeof value === "number" ? new Date(value)
    : typeof value === "object" && "toDate" in value ? value.toDate()
      : typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return typeof value === "string" ? value : fallback;
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export default function AdminPage() {
  const { t, lang } = useI18n();
  const { user, role } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [education, setEducation] = useState("");
  const [grade, setGrade] = useState("");
  const [subscription, setSubscription] = useState("");
  const [account, setAccount] = useState("");
  const [changingUid, setChangingUid] = useState<string | null>(null);
  const copy = ACADEMIC_COPY[lang];
  const gradeOptions = useAcademicOptions();
  const [gradeOptionsDraft, setGradeOptionsDraft] = useState<GradeOptions>(DEFAULT_GRADE_OPTIONS);
  const [savingOptions, setSavingOptions] = useState(false);

  useEffect(() => setGradeOptionsDraft(gradeOptions), [gradeOptions]);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb || role !== "super_admin") { setLoading(false); return; }
    return onSnapshot(collection(fb.db, "users"), (snapshot) => {
      setStudents(snapshot.docs.map((item) => ({ uid: item.id, ...(item.data() as object) }) as StudentRow));
      setLoading(false);
    }, (snapshotError) => { setError(snapshotError.message); setLoading(false); });
  }, [role]);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb || role !== "super_admin") { setActivityLoading(false); return; }
    const recent = query(collection(fb.db, "activityLogs"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(recent, (snapshot) => {
      setActivity(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as object) }) as ActivityRow));
      setActivityLoading(false);
    }, (snapshotError) => { setError(snapshotError.message); setActivityLoading(false); });
  }, [role]);

  const grades = useMemo(() => Array.from(new Set(students.filter((student) => !education || student.educationLevel === education).map((student) => student.academicGrade).filter((value): value is string => Boolean(value)))), [students, education]);
  const subscriptionStatuses = useMemo(() => Array.from(new Set(["active", "inactive", ...students.map((student) => student.subscriptionStatus).filter((value): value is string => Boolean(value))])), [students]);
  const accountStatuses = useMemo(() => Array.from(new Set(["active", "suspended", ...students.map((student) => student.accountStatus).filter((value): value is string => Boolean(value))])), [students]);
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return students.filter((student) => {
      const searchable = `${student.fullName ?? ""} ${student.phoneNumber ?? ""}`.toLocaleLowerCase();
      return (!needle || searchable.includes(needle)) && (!education || student.educationLevel === education)
        && (!grade || student.academicGrade === grade) && (!subscription || student.subscriptionStatus === subscription)
        && (!account || student.accountStatus === account);
    });
  }, [students, search, education, grade, subscription, account]);

  async function changeRole(targetUid: string, nextRole: Role) {
    const fb = getFirebase();
    if (!fb || role !== "super_admin") return;
    setChangingUid(targetUid); setError("");
    try {
      const assign = httpsCallable<{ uid: string; role: Role }, { uid: string; role: Role }>(getFunctions(fb.app), "setUserRole");
      await assign({ uid: targetUid, role: nextRole });
    } catch { setError(t("somethingWrong")); }
    finally { setChangingUid(null); }
  }

  async function saveGradeOptions(event: FormEvent) {
    event.preventDefault();
    const fb = getFirebase();
    if (!fb || role !== "super_admin") return;
    setSavingOptions(true); setError("");
    try {
      await setDoc(doc(fb.db, "configuration", "academic"), { gradeOptions: normalizeGradeOptions(gradeOptionsDraft), updatedAt: serverTimestamp() }, { merge: true });
    } catch { setError(t("somethingWrong")); }
    finally { setSavingOptions(false); }
  }

  function editGradeOptions(language: Language, level: SchoolGradeLevel, value: string) {
    setGradeOptionsDraft((current) => ({ ...current, [language]: { ...current[language], [level]: value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 30) } }));
  }

  if (role !== "super_admin") return <div className="card alert-error">{t("adminForbidden")}</div>;
  const label = (value: string | undefined) => value || t("notAvailable");

  return (
    <div className="stack">
      <h1 className="page-title">{t("adminTitle")}</h1>
      <form className="card stack" onSubmit={saveGradeOptions}>
        <h2>{t("gradeOptionsHeading")}</h2>
        <p className="muted small">{t("gradeOptionsHint")}</p>
        {(["primary", "preparatory", "secondary"] as SchoolGradeLevel[]).map((level) => <fieldset className="academic-fields stack" key={level}>
          <legend>{LEVEL_LABELS[lang][level]}</legend>
          <div className="grid-2">
            {(["en", "ar"] as Language[]).map((language) => <div className="field" key={language}>
              <label htmlFor={`grade-options-${level}-${language}`}>{language === "en" ? t("optionsEnglish") : t("optionsArabic")}</label>
              <textarea id={`grade-options-${level}-${language}`} className="input" rows={4} dir={language === "ar" ? "rtl" : "ltr"} value={gradeOptionsDraft[language][level].join("\n")} onChange={(event) => editGradeOptions(language, level, event.target.value)} />
            </div>)}
          </div>
        </fieldset>)}
        <button className="btn btn-primary" type="submit" disabled={savingOptions}>{savingOptions ? t("loading") : t("saveAcademicOptions")}</button>
      </form>
      <div className="card stack">
        <div className="row"><strong>{t("adminStudents")}</strong><span className="spacer" /><span>{visible.length}</span></div>
        <div className="field"><label htmlFor="admin-search">{t("adminSearch")}</label><input id="admin-search" className="input" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="grid-2">
          <div className="field"><label htmlFor="education-filter">{t("adminEducation")}</label><select id="education-filter" className="input" value={education} onChange={(e) => { setEducation(e.target.value); setGrade(""); }}><option value="">{t("filterEducationAll")}</option>{EDUCATION_LEVELS.map((level) => <option key={level} value={level}>{LEVEL_LABELS[lang][level]}</option>)}</select></div>
          <div className="field"><label htmlFor="grade-filter">{t("adminGrade")}</label><select id="grade-filter" className="input" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">{t("filterGradeAll")}</option>{grades.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          <div className="field"><label htmlFor="subscription-filter">{t("adminSubscription")}</label><select id="subscription-filter" className="input" value={subscription} onChange={(e) => setSubscription(e.target.value)}><option value="">{t("filterStatusAll")}</option>{subscriptionStatuses.map((status) => <option key={status} value={status}>{status === "active" || status === "inactive" ? t(status) : status}</option>)}</select></div>
          <div className="field"><label htmlFor="account-filter">{t("adminAccount")}</label><select id="account-filter" className="input" value={account} onChange={(e) => setAccount(e.target.value)}><option value="">{t("filterStatusAll")}</option>{accountStatuses.map((status) => <option key={status} value={status}>{status === "active" ? t("active") : status === "suspended" ? t("suspended") : status}</option>)}</select></div>
        </div>
      </div>
      <section className="card stack">
        <h2>{t("activityLogsTitle")}</h2>
        {activityLoading ? <p className="muted">{t("loading")}</p> : null}
        {!activityLoading && !activity.length ? <p className="muted">{t("noActivity")}</p> : null}
        {activity.map((item) => {
          const actor = students.find((student) => student.uid === item.actorUid)?.fullName || t("notAvailable");
          const target = students.find((student) => student.uid === item.targetUid)?.fullName || t("notAvailable");
          const date = item.createdAt?.toDate().toLocaleString(lang === "ar" ? "ar" : "en");
          return <div className="task" key={item.id}><span className="dot" aria-hidden="true" /><div className="task-body"><div className="task-title">{t("activityRoleChanged")}</div><div className="muted small">{actor} → {target} · {item.role === "super_admin" ? t("navAdmin") : t("navDashboard")}{date ? ` · ${date}` : ""}</div></div></div>;
        })}
      </section>
      {loading ? <p className="muted">{t("loading")}</p> : null}
      {error ? <div className="alert alert-error">{error}</div> : null}
      {!loading && !visible.length ? <p className="muted">{t("noStudentMatches")}</p> : null}
      {visible.map((student) => <article className="card stack" key={student.uid}>
        <div className="row"><strong>{label(student.fullName)}</strong><span className="spacer" /><span className="status-pill">{student.role === "super_admin" ? t("navAdmin") : t("navDashboard")}</span></div>
        <div className="admin-profile-grid">
          <span><b>{t("phoneNumber")}</b><span dir="ltr">{label(student.phoneNumber)}</span></span>
          <span><b>{t("adminEducation")}</b><span>{student.educationLevel ? LEVEL_LABELS[lang][student.educationLevel] : t("notAvailable")}</span></span>
          <span><b>{copy.grade}</b><span>{label(student.academicGrade)}</span></span>
          <span><b>{copy.universityName}</b><span>{label(student.universityName)}</span></span>
          <span><b>{copy.faculty}</b><span>{label(student.faculty)}</span></span>
          <span><b>{copy.academicYear}</b><span>{label(student.academicYear)}</span></span>
          <span><b>{t("adminSubscription")}</b><span>{label(student.subscriptionType)} · {label(student.subscriptionStatus)}</span></span>
          <span><b>{t("subscriptionExpiration")}</b><span>{formatExpiration(student.subscriptionExpiresAt, lang, t("notAvailable"))}</span></span>
          <span><b>{t("adminAccount")}</b><span>{label(student.accountStatus)}</span></span>
          <span><b>{t("registeredDevice")}</b><span>{label(student.registeredDevice)}</span></span>
        </div>
        {student.uid !== user?.uid ? <button className="btn btn-sm" type="button" disabled={changingUid === student.uid} onClick={() => void changeRole(student.uid, student.role === "super_admin" ? "student" : "super_admin")}>{changingUid === student.uid ? t("loading") : student.role === "super_admin" ? t("adminMakeStudent") : t("adminMakeAdmin")}</button> : null}
      </article>)}
    </div>
  );
}
