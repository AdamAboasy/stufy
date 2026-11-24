import { BookPdf, BookChapterMap, GeneratedPlan, RevisionRound, StudySession } from '../types';

/**
 * محرك بناء خطة المذاكرة الذكي
 * ============================================================
 * الطالب بيرفع الكتاب -> بيدخل تاريخ الامتحان -> بيحدد عدد مرات
 * المراجعة اللي عايزها -> المحرك بيقسم صفحات الكتاب على الأيام
 * المتاحة قبل الامتحان، وبعدين بيوزع جولات المراجعة على باقي الوقت.
 *
 * Student uploads the book -> enters exam date -> chooses how many
 * revision rounds -> engine slices the book across the available days
 * and schedules the revision rounds in the remaining time.
 */

const DAY_MS = 24 * 3600 * 1000;

const toIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (iso: string, days: number): string =>
  toIsoDate(new Date(new Date(`${iso}T00:00:00`).getTime() + days * DAY_MS));

export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.max(0, Math.round((new Date(`${toIso}T00:00:00`).getTime() - new Date(`${fromIso}T00:00:00`).getTime()) / DAY_MS));

const todayIso = (): string => toIsoDate(new Date());

const CHAPTER_AR_PREFIX = 'الفصل';
const CHAPTER_EN_PREFIX = 'Chapter';

/**
 * بيقسّم الكتاب لفصول تقديرية متساوية تقريباً (الفصول بتظهر من الكتاب
 * نفسه لو موجودة، غير كده بنقسم على أساس عدد الصفحات).
 */
export const buildChapterMap = (book: BookPdf): BookChapterMap[] => {
  const total = Math.max(1, book.pageCount);
  // فصل تقريبي كل ~40 صفحة، بحد أقصى 12 فصل، وبحد أدنى 3 فصول
  const rawCount = Math.round(total / 40);
  const chapterCount = Math.min(12, Math.max(3, rawCount));

  const pagesPerChapter = Math.ceil(total / chapterCount);
  const chapters: BookChapterMap[] = [];

  for (let i = 0; i < chapterCount; i++) {
    const pageFrom = i * pagesPerChapter + 1;
    const pageTo = Math.min(total, pageFrom + pagesPerChapter - 1);
    if (pageFrom > total) break;
    const pageCount = pageTo - pageFrom + 1;
    chapters.push({
      id: `${book.id}-ch-${i + 1}`,
      index: i + 1,
      title: `${CHAPTER_EN_PREFIX} ${i + 1}`,
      titleAr: `${CHAPTER_AR_PREFIX} ${i + 1}`,
      pageFrom,
      pageTo,
      pageCount,
      weight: Number((pageCount / total).toFixed(3)),
    });
  }

  return chapters;
};

export interface PlanEngineInput {
  book: BookPdf;
  examDate: string;          // YYYY-MM-DD
  revisionRounds: number;    // 0..4
  dailyMinutes: number;      // minutes available per study day
  daysOff?: number[];        // 0=Sunday .. 6=Saturday
  startDate?: string;        // defaults to today
  chapters?: BookChapterMap[];
}

export interface PlanFeasibility {
  availableDays: number;
  totalPages: number;
  pagesPerDay: number;
  minutesPerDay: number;
  isTight: boolean;
  messageAr: string;
  messageEn: string;
}

/**
 * بيحسب هل الوقت كافي ولا محتاج تسريع، قبل ما نبني الخطة.
 */
export const checkFeasibility = (
  book: BookPdf,
  examDate: string,
  revisionRounds: number,
  startDate: string = todayIso()
): PlanFeasibility => {
  const availableDays = daysBetween(startDate, examDate);
  const totalPages = Math.max(1, book.pageCount);
  // 25% من الوقت للمراجعة، والباقي للقراءة الأولى
  const revisionShare = revisionRounds > 0 ? 0.25 : 0;
  const firstPassDays = Math.max(1, Math.floor(availableDays * (1 - revisionShare)));
  const pagesPerDay = Math.ceil(totalPages / firstPassDays);
  const minutesPerDay = Math.min(300, Math.max(30, Math.round((pagesPerDay * 3) / 5) * 5));
  const isTight = pagesPerDay > 15 || availableDays < 7;

  return {
    availableDays,
    totalPages,
    pagesPerDay,
    minutesPerDay,
    isTight,
    messageAr: isTight
      ? `الوقت ضيق شوية: محتاج تذاكر ${pagesPerDay} صفحة يومياً (${minutesPerDay} دقيقة). ممكن تقلل عدد جولات المراجعة أو تزود ساعات المذاكرة.`
      : `خطة مناسبة: ${pagesPerDay} صفحة يومياً (${minutesPerDay} دقيقة) على مدار ${firstPassDays} يوم، وبعدها ${revisionRounds} جولة مراجعة.`,
    messageEn: isTight
      ? `Tight schedule: you need ${pagesPerDay} pages/day (${minutesPerDay} min). Consider fewer revision rounds or more daily study time.`
      : `Comfortable pace: ${pagesPerDay} pages/day (${minutesPerDay} min) across ${firstPassDays} days, then ${revisionRounds} revision round(s).`,
  };
};

/**
 * بناء الخطة الكاملة: قراءة أولى + جولات مراجعة + امتحان تجريبي قبل الامتحان.
 */
export const generateStudyPlan = (input: PlanEngineInput): GeneratedPlan => {
  const startDate = input.startDate || todayIso();
  const chapters = input.chapters && input.chapters.length > 0 ? input.chapters : buildChapterMap(input.book);
  const totalDays = Math.max(1, daysBetween(startDate, input.examDate));
  const revisionRounds = Math.max(0, Math.min(6, input.revisionRounds));
  const daysOff = input.daysOff || [];
  const dailyMinutes = Math.max(15, input.dailyMinutes || 90);

  // بنحسب الأيام المتاحة (بعد استبعاد أيام الراحة)
  const studyDayOffsets: number[] = [];
  for (let offset = 0; offset < totalDays; offset++) {
    const date = addDays(startDate, offset);
    const weekday = new Date(`${date}T00:00:00`).getDay();
    if (daysOff.includes(weekday)) continue;
    studyDayOffsets.push(offset);
  }
  const usableOffsets = studyDayOffsets.length > 0 ? studyDayOffsets : [0];

  // توزيع الوقت: أول 70-75% قراءة أولى، والباقي جولات المراجعة
  const firstPassRatio = revisionRounds > 0 ? 0.72 : 0.96;
  const firstPassDaysCount = Math.max(1, Math.floor(usableOffsets.length * firstPassRatio));
  const firstPassOffsets = usableOffsets.slice(0, firstPassDaysCount);
  const revisionOffsets = usableOffsets.slice(firstPassDaysCount);

  const sessions: StudySession[] = [];

  /* ---------- 1) القراءة الأولى: تقسيم صفحات الكتاب على الأيام ---------- */
  const totalPages = chapters.reduce((sum, ch) => sum + ch.pageCount, 0);
  const pagesPerDay = Math.max(1, Math.ceil(totalPages / firstPassOffsets.length));

  let chapterCursor = 0;
  let pageCursor = chapters[0]?.pageFrom ?? 1;

  firstPassOffsets.forEach((offset, dayIdx) => {
    let remaining = pagesPerDay;
    let slice = 0;

    while (remaining > 0 && chapterCursor < chapters.length) {
      const current = chapters[chapterCursor];
      const availableInChapter = current.pageTo - pageCursor + 1;
      const take = Math.min(remaining, availableInChapter);

      const pageFrom = pageCursor;
      const pageTo = pageCursor + take - 1;
      const date = addDays(startDate, offset);

      sessions.push({
        id: `ss-${input.book.id}-fp-${dayIdx}-${slice}`,
        dayIndex: offset,
        date,
        chapterTitle: current.title,
        chapterTitleAr: current.titleAr,
        pageFrom,
        pageTo,
        durationMinutes: Math.min(dailyMinutes, Math.max(20, take * 2)),
        kind: 'study',
        roundNumber: 0,
        title: `Read ${current.title}: pages ${pageFrom}-${pageTo}`,
        titleAr: `مذاكرة ${current.titleAr}: من صفحة ${pageFrom} إلى ${pageTo}`,
        isCompleted: false,
      });

      remaining -= take;
      slice++;

      if (take === availableInChapter) {
        chapterCursor++;
        pageCursor = chapters[chapterCursor]?.pageFrom ?? pageCursor + take;
      } else {
        pageCursor += take;
      }
    }
  });

  /* ---------- 2) جولات المراجعة ---------- */
  const rounds: RevisionRound[] = [];

  if (revisionOffsets.length > 0 && revisionRounds > 0) {
    // توزيع أيام المراجعة على الجولات، مع ترك يوم أو يومين للامتحان التجريبي
    const mockReserve = revisionOffsets.length >= 4 ? 1 : 0;
    const distributable = revisionOffsets.slice(0, revisionOffsets.length - mockReserve);
    const perRound = Math.max(1, Math.floor(distributable.length / revisionRounds));

    for (let round = 1; round <= revisionRounds; round++) {
      const roundOffsets = distributable.slice((round - 1) * perRound, round * perRound);
      const offsetsToUse = roundOffsets.length > 0
        ? roundOffsets
        : [distributable[distributable.length - 1] ?? revisionOffsets[0]];

      const startOffset = offsetsToUse[0];
      const endOffset = offsetsToUse[offsetsToUse.length - 1];

      rounds.push({
        id: `round-${input.book.id}-${round}`,
        roundNumber: round,
        title: `Revision Round ${round} — full book recap`,
        titleAr: `جولة المراجعة ${round} — مراجعة شاملة للكتاب`,
        targetSubjects: [input.book.subject],
        progressPercent: 0,
        status: round === 1 ? 'In Progress' : 'Upcoming',
        startDate: addDays(startDate, startOffset),
        targetDate: addDays(startDate, endOffset),
      });

      // كل يوم في الجولة بيغطي جزء من الكتاب (في الجولات المتقدمة بنضغط أكثر)
      offsetsToUse.forEach((offset, idx) => {
        const chunk = Math.max(1, Math.ceil(totalPages / offsetsToUse.length));
        const pageFrom = Math.min(totalPages, idx * chunk + 1);
        const pageTo = Math.min(totalPages, pageFrom + chunk - 1);
        const date = addDays(startDate, offset);

        sessions.push({
          id: `ss-${input.book.id}-r${round}-${idx}`,
          dayIndex: offset,
          date,
          chapterTitle: `${CHAPTER_EN_PREFIX} coverage`,
          chapterTitleAr: 'تغطية شاملة',
          pageFrom,
          pageTo,
          durationMinutes: round === 1 ? dailyMinutes : Math.round(dailyMinutes * 0.75),
          kind: 'revision',
          roundNumber: round,
          title: `Round ${round} revision — pages ${pageFrom}-${pageTo}`,
          titleAr: `مراجعة الجولة ${round} — من صفحة ${pageFrom} إلى ${pageTo}`,
          isCompleted: false,
        });
      });
    }

    // امتحان تجريبي قبل الامتحان الرسمي
    if (mockReserve === 1) {
      const mockOffset = revisionOffsets[revisionOffsets.length - 1];

      sessions.push({
        id: `ss-${input.book.id}-mock`,
        dayIndex: mockOffset,
        date: addDays(startDate, mockOffset),
        chapterTitle: 'Mock exam',
        chapterTitleAr: 'امتحان تجريبي',
        pageFrom: 1,
        pageTo: totalPages,
        durationMinutes: dailyMinutes,
        kind: 'mock',
        roundNumber: revisionRounds + 1,
        title: 'Full mock exam on the whole book',
        titleAr: 'امتحان تجريبي شامل على الكتاب كامل',
        isCompleted: false,
      });
    }
  } else {
    // مفيش مراجعة مطلوبة: نحط يوم امتحان تجريبي بسيط قبل الامتحان
    const lastOffset = usableOffsets[usableOffsets.length - 1];
    rounds.push({
      id: `round-${input.book.id}-final`,
      roundNumber: 1,
      title: 'Final rapid recap',
      titleAr: 'مراجعة سريعة نهائية',
      targetSubjects: [input.book.subject],
      progressPercent: 0,
      status: 'Upcoming',
      startDate: addDays(startDate, lastOffset),
      targetDate: addDays(startDate, lastOffset),
    });
  }

  sessions.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));

  const firstPassEndDate = sessions.find(s => s.kind === 'revision')?.date
    || sessions[sessions.length - 1]?.date
    || input.examDate;

  return {
    id: `plan-${input.book.id}-${Date.now()}`,
    bookId: input.book.id,
    bookTitle: input.book.title,
    subject: input.book.subject,
    totalPages,
    chapters,
    examDate: input.examDate,
    revisionRounds,
    dailyMinutes,
    startDate,
    firstPassEndDate,
    createdAt: new Date().toISOString(),
    sessions,
    rounds,
  };
};

/**
 * بترجع مهام اليوم من الخطة (للطالب: مذاكرة النهاردة + المراجعة)
 */
export const getTodaySessions = (plan?: GeneratedPlan | null): StudySession[] => {
  if (!plan) return [];
  const today = todayIso();
  return plan.sessions.filter(s => s.date === today);
};

/**
 * بتحوّل جلسات الخطة لجدول جلسات لأسبوع قادم (لعرض التقويم)
 */
export const getUpcomingSessions = (plan: GeneratedPlan | null | undefined, daysAhead = 7): StudySession[] => {
  if (!plan) return [];
  const today = todayIso();
  const limit = addDays(today, daysAhead);
  return plan.sessions.filter(s => s.date >= today && s.date <= limit);
};

export const planProgressPercent = (plan?: GeneratedPlan | null): number => {
  if (!plan || plan.sessions.length === 0) return 0;
  const done = plan.sessions.filter(s => s.isCompleted).length;
  return Math.round((done / plan.sessions.length) * 100);
};

export const formatDateAr = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
};
