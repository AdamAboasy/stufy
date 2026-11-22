"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const en = {
  appName: "Study Management",
  tagline: "Plan your study. Finish on time.",
  loading: "Loading…",
  save: "Save",
  saved: "Saved",
  cancel: "Cancel",
  delete: "Delete",
  pages: "pages",
  minutesShort: "min",
  somethingWrong: "Something went wrong. Please try again.",

  navDashboard: "Home",
  navSubjects: "Subjects",
  navPlan: "Plan",
  navTasks: "Tasks",
  navSettings: "Settings",

  login: "Sign in",
  register: "Create account",
  logout: "Sign out",
  loginTitle: "Welcome back",
  registerTitle: "Create your account",
  fullName: "Full name",
  email: "Email",
  password: "Password",
  noAccount: "Don't have an account?",
  haveAccount: "Already have an account?",
  errInvalidCredentials: "Wrong email or password.",
  errEmailInUse: "This email is already registered.",
  errWeakPassword: "Password must be at least 6 characters.",
  errInvalidEmail: "Please enter a valid email address.",
  errOperationNotAllowed: "Email/password sign-in is not enabled in Firebase yet.",
  errTooManyRequests: "Too many attempts. Please wait a moment and try again.",
  errNetwork: "Network error. Check your connection.",

  setupTitle: "Firebase is not configured",
  setupBody: "Add these environment variables (in Vercel: Settings → Environment Variables), then redeploy:",

  heroTitle: "Turn your books into a realistic study plan",
  heroSub:
    "Add your subjects, pick your exam date and rest days, and get a day-by-day plan with the exact pages to study.",
  getStarted: "Get started",
  goToApp: "Open my dashboard",
  f1Title: "Page-accurate plans",
  f1Desc: "Every page is covered exactly once. Nothing is invented or skipped.",
  f2Title: "Respects your rest days",
  f2Desc: "Choose the days you never study and the plan works around them.",
  f3Title: "Track real progress",
  f3Desc: "Progress and study time come only from tasks you actually complete.",

  hello: "Hello, {name}",
  helloNoName: "Hello",
  today: "Today",
  todayEmpty: "Nothing planned for today.",
  overdue: "Overdue",
  upcoming: "Coming up",
  noUpcoming: "No upcoming tasks.",
  overallProgress: "Overall progress",
  tasksDone: "Tasks done",
  pagesDone: "Pages done",
  studyTime: "Study time",
  hoursShort: "h",

  subjectsTitle: "Subjects",
  addSubject: "Add subject",
  subjectName: "Subject name",
  totalPages: "Total pages",
  examDate: "Exam date (optional)",
  color: "Color",
  noSubjects: "No subjects yet. Add your first one above.",
  confirmDeleteSubject: "Delete this subject and all of its tasks?",
  createPlan: "Create plan",
  progressOf: "{done} of {total} pages",
  errSubjectName: "Enter a subject name.",
  errSubjectPages: "Total pages must be a whole number greater than 0.",

  planTitle: "Study plan",
  chooseSubject: "Subject",
  noSubjectsForPlan: "Add a subject first, then come back to create its plan.",
  startPage: "Start from page",
  startDate: "Start date",
  endDate: "Finish by",
  restDays: "Rest days",
  minutesPerPage: "Minutes per page",
  preview: "Preview",
  savePlan: "Save plan",
  planSummary: "{pages} pages over {days} study days (about {perDay} pages a day).",
  pagesRange: "Pages {from}–{to}",
  replaceConfirm:
    "This subject already has unfinished tasks. Replace them with this plan? Completed tasks are kept.",
  planSaved: "Plan saved.",
  errInvalidPages: "Check the page numbers: the start page must be between 1 and the total pages.",
  errInvalidRange: "The finish date must be on or after the start date.",
  errNoStudyDays: "Every day in this range is a rest day.",
  errTooManyDays: "That range is too long. Choose a period of up to 400 days.",

  tasksTitle: "Tasks",
  filterAll: "All",
  filterToday: "Today",
  filterPending: "Pending",
  filterDone: "Done",
  noTasks: "No tasks here.",
  markDone: "Mark as done",
  markUndone: "Mark as not done",
  confirmDeleteTask: "Delete this task?",

  settingsTitle: "Settings",
  language: "Language",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "System",
  account: "Account",
  displayName: "Display name",
};

export type Key = keyof typeof en;

const ar: Record<Key, string> = {
  appName: "إدارة المذاكرة",
  tagline: "نظّم مذاكرتك وخلّص في ميعادك.",
  loading: "جارٍ التحميل…",
  save: "حفظ",
  saved: "تم الحفظ",
  cancel: "إلغاء",
  delete: "حذف",
  pages: "صفحة",
  minutesShort: "د",
  somethingWrong: "حصلت مشكلة. حاول تاني.",

  navDashboard: "الرئيسية",
  navSubjects: "المواد",
  navPlan: "الخطة",
  navTasks: "المهام",
  navSettings: "الإعدادات",

  login: "تسجيل الدخول",
  register: "إنشاء حساب",
  logout: "تسجيل الخروج",
  loginTitle: "أهلاً بعودتك",
  registerTitle: "أنشئ حسابك",
  fullName: "الاسم بالكامل",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  noAccount: "معندكش حساب؟",
  haveAccount: "عندك حساب بالفعل؟",
  errInvalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  errEmailInUse: "البريد الإلكتروني ده مسجّل قبل كده.",
  errWeakPassword: "كلمة المرور لازم تكون 6 حروف على الأقل.",
  errInvalidEmail: "اكتب بريد إلكتروني صحيح.",
  errOperationNotAllowed: "تسجيل الدخول بالبريد وكلمة المرور مش مفعّل في Firebase لسه.",
  errTooManyRequests: "محاولات كتير. استنى شوية وجرّب تاني.",
  errNetwork: "مشكلة في الاتصال. اتأكد من الإنترنت.",

  setupTitle: "Firebase مش متظبط",
  setupBody: "ضيف المتغيرات دي (في Vercel: Settings ← Environment Variables) وبعدين اعمل Redeploy:",

  heroTitle: "حوّل كتبك لخطة مذاكرة واقعية",
  heroSub: "ضيف موادك، اختار ميعاد الامتحان وأيام الراحة، وخد جدول يومي بالصفحات المطلوبة بالظبط.",
  getStarted: "ابدأ دلوقتي",
  goToApp: "افتح لوحتي",
  f1Title: "خطط دقيقة للصفحات",
  f1Desc: "كل صفحة بتتغطى مرة واحدة بالظبط. مفيش صفحة بتتخترع ولا بتتنسى.",
  f2Title: "بتحترم أيام راحتك",
  f2Desc: "اختار الأيام اللي مش بتذاكر فيها والخطة بتتظبط حواليها.",
  f3Title: "تابع تقدمك الحقيقي",
  f3Desc: "التقدم ووقت المذاكرة بيتحسبوا من المهام اللي خلصتها فعلاً بس.",

  hello: "أهلاً، {name}",
  helloNoName: "أهلاً",
  today: "النهاردة",
  todayEmpty: "مفيش حاجة مخططة النهاردة.",
  overdue: "متأخرة",
  upcoming: "جاية",
  noUpcoming: "مفيش مهام جاية.",
  overallProgress: "التقدم الكلي",
  tasksDone: "مهام مكتملة",
  pagesDone: "صفحات خلصت",
  studyTime: "وقت المذاكرة",
  hoursShort: "س",

  subjectsTitle: "المواد",
  addSubject: "إضافة مادة",
  subjectName: "اسم المادة",
  totalPages: "عدد الصفحات",
  examDate: "ميعاد الامتحان (اختياري)",
  color: "اللون",
  noSubjects: "لسه مفيش مواد. ضيف أول مادة من فوق.",
  confirmDeleteSubject: "تحذف المادة دي وكل مهامها؟",
  createPlan: "إنشاء خطة",
  progressOf: "{done} من {total} صفحة",
  errSubjectName: "اكتب اسم المادة.",
  errSubjectPages: "عدد الصفحات لازم يكون رقم صحيح أكبر من 0.",

  planTitle: "خطة المذاكرة",
  chooseSubject: "المادة",
  noSubjectsForPlan: "ضيف مادة الأول وبعدين ارجع اعمل خطتها.",
  startPage: "ابدأ من صفحة",
  startDate: "تاريخ البداية",
  endDate: "خلّص قبل",
  restDays: "أيام الراحة",
  minutesPerPage: "دقايق لكل صفحة",
  preview: "معاينة",
  savePlan: "حفظ الخطة",
  planSummary: "{pages} صفحة على {days} يوم مذاكرة (حوالي {perDay} صفحة في اليوم).",
  pagesRange: "الصفحات {from}–{to}",
  replaceConfirm: "المادة دي فيها مهام لسه ما خلصتش. تستبدلها بالخطة دي؟ المهام المكتملة هتفضل زي ما هي.",
  planSaved: "تم حفظ الخطة.",
  errInvalidPages: "راجع أرقام الصفحات: صفحة البداية لازم تكون بين 1 وعدد الصفحات.",
  errInvalidRange: "تاريخ النهاية لازم يكون في أو بعد تاريخ البداية.",
  errNoStudyDays: "كل الأيام في الفترة دي أيام راحة.",
  errTooManyDays: "الفترة طويلة أوي. اختار فترة لحد 400 يوم.",

  tasksTitle: "المهام",
  filterAll: "الكل",
  filterToday: "النهاردة",
  filterPending: "لسه",
  filterDone: "خلصت",
  noTasks: "مفيش مهام هنا.",
  markDone: "علّم إنها خلصت",
  markUndone: "علّم إنها ما خلصتش",
  confirmDeleteTask: "تحذف المهمة دي؟",

  settingsTitle: "الإعدادات",
  language: "اللغة",
  theme: "المظهر",
  themeLight: "فاتح",
  themeDark: "داكن",
  themeSystem: "حسب الجهاز",
  account: "الحساب",
  displayName: "الاسم المعروض",
};

const dictionaries: Record<Lang, Record<Key, string>> = { en, ar };

type Vars = Record<string, string | number>;

type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: Key, vars?: Vars) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "study_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch {
      // storage unavailable: keep the default
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: Key, vars?: Vars) => {
      let text = dictionaries[lang][key];
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value));
        }
      }
      return text;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
