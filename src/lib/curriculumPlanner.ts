/**
 * محرك توزيع المنهج على الوقت
 * ==========================
 * مش بيقسّم صفحات! بيقسّم **أبواب/دروس المنهج** على الأيام المتاحة قبل
 * الامتحان، حسب الساعات المتاحة لكل يوم وأيام الراحة.
 *
 * The plan is sliced over curriculum chapters/lessons (never page numbers),
 * using the student's daily availability and the days left until the exam.
 */
import { GeneratedPlan, StudySession, RevisionRound } from '../types';
import {
  CurriculumSubject,
  StageCurriculum,
  totalLessons
} from '../data/curriculum';

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
  Math.max(
    0,
    Math.round(
      (new Date(`${toIso}T00:00:00`).getTime() - new Date(`${fromIso}T00:00:00`).getTime()) / DAY_MS
    )
  );

export interface CurriculumPlanInput {
  curriculum: StageCurriculum;
  /** المواد اللي الطالب اختارها (افتراضي: كل مواد المرحلة) */
  subjectIds?: string[];
  examDate: string;          // YYYY-MM-DD
  /** ساعات متاحة في اليوم */
  dailyHours: number;        // 0.5 .. 12
  /** أيام الراحة 0=الأحد .. 6=السبت */
  daysOff?: number[];
  /** عدد جولات المراجعة قبل الامتحان */
  revisionRounds: number;    // 0..4
  startDate?: string;
}

export interface DailySlot {
  subjectId: string;
  subjectNameAr: string;
  chapterTitleAr: string;
  chapterTitleEn: string;
  minutes: number;
  kind: 'study' | 'revision' | 'mock';
  round: number;
}

/** إجمالي الساعات المتاحة فعلياً قبل الامتحان (بعد أيام الراحة) */
export const availableStudyHours = (
  examDate: string,
  dailyHours: number,
  daysOff: number[] = [],
  startDate: string = toIsoDate(new Date())
): number => {
  const total = daysBetween(startDate, examDate);
  let usable = 0;
  for (let offset = 0; offset < total; offset++) {
    const weekday = new Date(`${addDays(startDate, offset)}T00:00:00`).getDay();
    if (!daysOff.includes(weekday)) usable++;
  }
  return Math.round(usable * dailyHours * 10) / 10;
};

/** هل الوقت كافي لتغطية المنهج؟ + خطة الإنقاذ لو ضيق */
export const checkCurriculumFeasibility = (
  curriculum: StageCurriculum,
  subjectIds: string[],
  examDate: string,
  dailyHours: number,
  daysOff: number[] = [],
  startDate: string = toIsoDate(new Date())
) => {
  const subjects = curriculum.subjects.filter(s => subjectIds.includes(s.id));
  const lessons = subjects.reduce(
    (sum, s) => sum + s.chapters.reduce((inner, c) => inner + c.lessons, 0),
    0
  );
  // تقدير متحفظ: الدرس/الباب محتاج ~60 دقيقة (فهم + تمرين + تلخيص)
  const neededHours = Math.round((lessons * 60) / 60);
  // ساعة المذاكرة الفعلية ≈ 80% من الوقت (بريك + تنقّل) — الحساب واقعي
  const available = Math.round(availableStudyHours(examDate, dailyHours, daysOff, startDate) * 0.8);
  const days = daysBetween(startDate, examDate);
  const ratio = available > 0 ? neededHours / available : 99;

  return {
    lessons,
    neededHours,
    availableHours: available,
    days,
    ratio,
    isTight: ratio > 0.85,
    isImpossible: ratio > 1.2,
    messageAr:
      ratio > 1.2
        ? `الوقت مش كافي: محتاج ~${neededHours} ساعة والمتاح ${available} ساعة. قلّل المواد أو زوّد ساعات المذاكرة اليومية.`
        : ratio > 0.85
        ? `الجدول مضغوط شوية: محتاج ~${neededHours} ساعة من ${available} متاحة — التزم بالبرنامج يومياً.`
        : `تمام جداً: محتاج ~${neededHours} ساعة من ${available} ساعة متاحة قبل الامتحان.`,
    messageEn:
      ratio > 1.2
        ? `Not enough time: ~${neededHours}h needed vs ${available}h available. Drop a subject or raise daily hours.`
        : ratio > 0.85
        ? `Tight: ~${neededHours}h needed out of ${available}h available — keep up daily.`
        : `Comfortable: ~${neededHours}h needed out of ${available}h available.`
  };
};

/**
 * بناء الخطة: كل يوم بيتقسم لأجزاء (slots) — كل جزء باب من مادة، بترتيب
 * تدويري بين المواد عشان مفيش مادة تتأخر.
 */
export const buildCurriculumPlan = (input: CurriculumPlanInput): GeneratedPlan => {
  const startDate = input.startDate || toIsoDate(new Date());
  const subjects = input.curriculum.subjects.filter(s =>
    (input.subjectIds && input.subjectIds.length > 0 ? input.subjectIds : [s.id]).includes(s.id)
  );
  const dailyMinutes = Math.max(30, Math.round(input.dailyHours * 60));
  const daysOff = input.daysOff || [];
  const totalDays = Math.max(1, daysBetween(startDate, examDateSafe(input.examDate)));
  let revisionRounds = Math.max(0, Math.min(4, input.revisionRounds));

  // أيام المذاكرة (بعد استبعاد أيام الراحة)
  const usableOffsets: number[] = [];
  for (let offset = 0; offset < totalDays; offset++) {
    const weekday = new Date(`${addDays(startDate, offset)}T00:00:00`).getDay();
    if (!daysOff.includes(weekday)) usableOffsets.push(offset);
  }
  const effectiveOffsets = usableOffsets.length > 0 ? usableOffsets : [0];

  // نسبة الوقت للقراءة الأولى مقابل المراجعة
  const firstPassRatio = revisionRounds > 0 ? 0.72 : 0.96;
  const firstPassCount = Math.max(1, Math.floor(effectiveOffsets.length * firstPassRatio));
  const firstPassOffsets = effectiveOffsets.slice(0, firstPassCount);
  const revisionOffsets = effectiveOffsets.slice(firstPassCount);

  /* ---------- 1) تحضير قائمة الأبواب بترتيب تدويري بين المواد ---------- */
  type Unit = {
    subject: CurriculumSubject;
    chapterIndex: number;
    chapterTitleAr: string;
    chapterTitleEn: string;
    lessons: number;
  };

  const queues = subjects.map(subject => ({
    subject,
    chapters: subject.chapters.map((chapter, index) => ({ chapter, index }))
  }));

  const units: Unit[] = [];
  let cursor = 0;
  while (queues.some(q => q.chapters.length > 0)) {
    const queue = queues[cursor % queues.length];
    const next = queue.chapters.shift();
    if (next) {
      units.push({
        subject: queue.subject,
        chapterIndex: next.index,
        chapterTitleAr: next.chapter.titleAr,
        chapterTitleEn: next.chapter.titleEn,
        lessons: next.chapter.lessons
      });
    }
    cursor++;
  }

  const totalLessonsCount = units.reduce((sum, u) => sum + u.lessons, 0);

  /* ---------- 2) توزيع الأبواب على أيام القراءة الأولى ---------- */
  const sessions: StudySession[] = [];
  const slotsPerDay = Math.max(1, Math.min(4, Math.round(dailyMinutes / 60))); // جزء لكل ~ساعة
  const minutesPerSlot = Math.floor(dailyMinutes / slotsPerDay);

  let unitCursor = 0;
  let lessonCursor = 0; // تقدم داخل الباب الحالي

  firstPassOffsets.forEach((offset, dayIdx) => {
    const date = addDays(startDate, offset);
    for (let slot = 0; slot < slotsPerDay && unitCursor < units.length; slot++) {
      const unit = units[unitCursor];
      const remainingInUnit = unit.lessons - lessonCursor;
      const take = Math.min(remainingInUnit, 1); // جزء واحد = درس/فكرة

      sessions.push({
        id: `cs-${input.curriculum.stageId}-${offset}-${slot}`,
        dayIndex: offset,
        date,
        chapterTitle: unit.chapterTitleEn,
        chapterTitleAr: unit.chapterTitleAr,
        pageFrom: 0,
        pageTo: 0,
        durationMinutes: minutesPerSlot,
        kind: 'study',
        roundNumber: 0,
        title: `${unit.subject.name} — ${unit.chapterTitleEn}`,
        titleAr: `${unit.subject.nameAr} — ${unit.chapterTitleAr}`,
        isCompleted: false
      });

      lessonCursor += take;
      if (lessonCursor >= unit.lessons) {
        unitCursor++;
        lessonCursor = 0;
      }
    }
    void dayIdx;
  });

  /* ---------- 3) جولات المراجعة + امتحان تجريبي ---------- */
  const rounds: RevisionRound[] = [];
  const mockReserve = revisionOffsets.length >= 4 ? 1 : 0;
  const distributable = revisionOffsets.slice(0, revisionOffsets.length - mockReserve);

  if (revisionRounds > 0 && distributable.length > 0) {
    // بنوزّع الأيام على الجولات بالباقي: جولة ١ تاخد يوم زيادة لو فيه باقي
    const base = Math.floor(distributable.length / revisionRounds);
    const extra = distributable.length % revisionRounds;
    if (base === 0) {
      // أيام أقل من الجولات: جولة واحدة بس بكل الأيام
      // (الخطة مش هتعرض جولات فاضية)
      revisionRounds = distributable.length as 0 | 1 | 2 | 3 | 4;
    }

    // كل جولة بتغطي **كل** أبواب المنهج، موزّعة على أيام الجولة بالتساوي
    const allChapters = units.map(u => ({
      subjectName: u.subject.name,
      subjectNameAr: u.subject.nameAr,
      titleEn: u.chapterTitleEn,
      titleAr: u.chapterTitleAr
    }));

    for (let round = 1; round <= revisionRounds; round++) {
      const startIdx = (round - 1) * base + Math.min(round - 1, extra);
      const size = base + (round <= extra ? 1 : 0);
      const offsets = distributable.slice(startIdx, startIdx + size);
      const use = offsets.length > 0 ? offsets : [distributable[distributable.length - 1]];

      rounds.push({
        id: `cr-${input.curriculum.stageId}-${round}`,
        roundNumber: round,
        title: `Revision round ${round} — all subjects`,
        titleAr: `جولة مراجعة ${round} — كل المواد`,
        targetSubjects: subjects.map(s => s.name),
        progressPercent: 0,
        status: round === 1 ? 'In Progress' : 'Upcoming',
        startDate: addDays(startDate, use[0]),
        targetDate: addDays(startDate, use[use.length - 1])
      });

      const chunkSize = Math.max(1, Math.ceil(allChapters.length / use.length));

      use.forEach((offset, idx) => {
        const date = addDays(startDate, offset);
        const slice = allChapters.slice(idx * chunkSize, (idx + 1) * chunkSize);
        // لو الأيام أكتر من الأبواب، بنرجع للأبواب من الأول بدل ما اليوم يبقى فاضي
        const chapterList = slice.length > 0 ? slice : [allChapters[idx % allChapters.length]];

        chapterList.forEach((chapter, cIdx) => {
          sessions.push({
            id: `cs-rev-${round}-${offset}-${cIdx}`,
            dayIndex: offset,
            date,
            chapterTitle: chapter.titleEn,
            chapterTitleAr: chapter.titleAr,
            pageFrom: 0,
            pageTo: 0,
            durationMinutes: Math.max(20, Math.round(minutesPerSlot * (round === 1 ? 1 : 0.8))),
            kind: 'revision',
            roundNumber: round,
            title: `Revision ${round} — ${chapter.subjectName}: ${chapter.titleEn}`,
            titleAr: `مراجعة ${round} — ${chapter.subjectNameAr}: ${chapter.titleAr}`,
            isCompleted: false
          });
        });
      });
    }

    if (mockReserve === 1) {
      const mockOffset = revisionOffsets[revisionOffsets.length - 1];
      sessions.push({
        id: `cs-mock-${mockOffset}`,
        dayIndex: mockOffset,
        date: addDays(startDate, mockOffset),
        chapterTitle: 'Mock exam',
        chapterTitleAr: 'امتحان تجريبي',
        pageFrom: 0,
        pageTo: 0,
        durationMinutes: dailyMinutes,
        kind: 'mock',
        roundNumber: revisionRounds + 1,
        title: 'Full mock exam — all subjects',
        titleAr: 'امتحان تجريبي شامل — كل المواد',
        isCompleted: false
      });
    }
  }

  sessions.sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)
  );

  return {
    id: `plan-${input.curriculum.stageId}-${Date.now()}`,
    bookId: `curriculum-${input.curriculum.stageId}`,
    bookTitle: `${input.curriculum.labelAr} — المنهج الكامل`,
    subject: subjects.map(s => s.nameAr).join(' • '),
    totalPages: 0,
    chapters: units.map((unit, index) => ({
      id: `${input.curriculum.stageId}-${unit.subject.id}-${unit.chapterIndex}`,
      index: index + 1,
      title: unit.chapterTitleEn,
      titleAr: unit.chapterTitleAr,
      pageFrom: 0,
      pageTo: 0,
      pageCount: unit.lessons,
      weight: totalLessonsCount > 0 ? Number((unit.lessons / totalLessonsCount).toFixed(3)) : 0
    })),
    examDate: input.examDate,
    revisionRounds,
    dailyMinutes,
    startDate,
    firstPassEndDate: addDays(startDate, firstPassOffsets[firstPassOffsets.length - 1] || 0),
    createdAt: new Date().toISOString(),
    sessions,
    rounds
  };
};

const examDateSafe = (examDate: string): string =>
  examDate || toIsoDate(new Date(Date.now() + 30 * DAY_MS));

/** ملخص يومي: كم ساعة وكم جزء لكل مادة */
export const summarizeDayPlan = (
  plan: GeneratedPlan | null | undefined,
  date: string
): { totalMinutes: number; perSubject: Record<string, number> } => {
  const sessions = (plan?.sessions || []).filter(s => s.date === date);
  const perSubject: Record<string, number> = {};
  let totalMinutes = 0;
  for (const session of sessions) {
    totalMinutes += session.durationMinutes;
    perSubject[session.titleAr] = (perSubject[session.titleAr] || 0) + session.durationMinutes;
  }
  return { totalMinutes, perSubject };
};

export { totalLessons };
