import {
  BookStudyPlan,
  RevisionRound,
  Student,
  StudyPlan,
  StudyPlanTask
} from '../types';

/* ------------------------------------------------------------------ */
/* Local-date helpers (never use toISOString for calendar dates:       */
/* in UTC+2 it shifts local midnight to the previous day).             */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, '0');

export const toLocalISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const todayISO = (): string => toLocalISODate(new Date());

export const addDays = (iso: string, days: number): string => {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
};

export const daysBetween = (fromISO: string, toISO: string): number =>
  Math.round((parseLocalDate(toISO).getTime() - parseLocalDate(fromISO).getTime()) / 86400000);

/* ------------------------------------------------------------------ */
/* Plan generation                                                      */
/* ------------------------------------------------------------------ */

// Time estimates are only a rough guide shown to the student ("~"),
// they are not derived from the book content.
export const MINUTES_PER_PAGE_STUDY = 4;
export const MINUTES_PER_PAGE_REVISION = 1.5;
// A revision pass is assumed to go ~3x faster than the first study pass,
// so the available days are split 3 : 1 : 1 : ... (study : revision 1 : revision 2 ...).
const STUDY_WEIGHT = 3;

export interface BuildPlanInput {
  bookTitle: string;
  subject: string;
  originalFilename: string;
  pageCount: number;
  examDate: string; // YYYY-MM-DD
  revisionRounds: number; // 0..10
  startDate?: string; // defaults to today
}

/** Splits `pages` pages over `days` days (days <= pages) → [from, to] per day, each >= 1 page. */
const distributePages = (pages: number, days: number): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < days; i++) {
    const from = Math.floor((i * pages) / days) + 1;
    const to = Math.floor(((i + 1) * pages) / days);
    out.push([from, to]);
  }
  return out;
};

export const buildBookPlan = (input: BuildPlanInput): BookStudyPlan => {
  const startDate = input.startDate || todayISO();
  const totalDays = daysBetween(startDate, input.examDate); // study days: start .. day before exam
  if (totalDays < 1) {
    throw new Error('EXAM_TOO_SOON');
  }

  const pages = Math.max(1, Math.floor(input.pageCount));
  const requestedRounds = Math.max(0, Math.min(10, Math.floor(input.revisionRounds)));
  // Need at least 1 day for the first study pass and 1 day per revision round.
  const rounds = Math.min(requestedRounds, totalDays - 1);

  let studyDays = Math.round((totalDays * STUDY_WEIGHT) / (STUDY_WEIGHT + rounds));
  studyDays = Math.max(1, Math.min(studyDays, totalDays - rounds));
  const remaining = totalDays - studyDays;

  const blocks: Array<{ round: number; days: number }> = [{ round: 0, days: studyDays }];
  if (rounds > 0) {
    const base = Math.floor(remaining / rounds);
    const extra = remaining % rounds;
    for (let r = 1; r <= rounds; r++) {
      blocks.push({ round: r, days: base + (r <= extra ? 1 : 0) });
    }
  }

  const planId = `bp-${Date.now()}`;
  const tasks: StudyPlanTask[] = [];
  let offset = 0;
  let counter = 0;

  for (const block of blocks) {
    const usedDays = Math.min(block.days, pages);
    const slices = distributePages(pages, usedDays);
    slices.forEach(([from, to], i) => {
      const pageCount = to - from + 1;
      const perPage = block.round === 0 ? MINUTES_PER_PAGE_STUDY : MINUTES_PER_PAGE_REVISION;
      tasks.push({
        id: `${planId}-t${counter++}`,
        date: addDays(startDate, offset + i),
        kind: block.round === 0 ? 'study' : 'revision',
        round: block.round,
        pagesFrom: from,
        pagesTo: to,
        estimatedMinutes: Math.max(5, Math.round(pageCount * perPage)),
        isCompleted: false
      });
    });
    // Days that were not needed (more days than pages) stay as rest days.
    offset += block.days;
  }

  return {
    id: planId,
    bookTitle: input.bookTitle.trim(),
    subject: input.subject.trim(),
    originalFilename: input.originalFilename,
    pageCount: pages,
    examDate: input.examDate,
    revisionRounds: rounds,
    createdAt: new Date().toISOString(),
    startDate,
    tasks
  };
};

/* ------------------------------------------------------------------ */
/* Queries                                                              */
/* ------------------------------------------------------------------ */

export interface PlannedTask {
  plan: BookStudyPlan;
  task: StudyPlanTask;
}

export const flattenTasks = (plans: BookStudyPlan[] = []): PlannedTask[] =>
  plans.flatMap(plan => plan.tasks.map(task => ({ plan, task })));

export const tasksOnDate = (plans: BookStudyPlan[] = [], date: string): PlannedTask[] =>
  flattenTasks(plans).filter(pt => pt.task.date === date);

export const overdueTasks = (plans: BookStudyPlan[] = [], today: string): PlannedTask[] =>
  flattenTasks(plans)
    .filter(pt => pt.task.date < today && !pt.task.isCompleted)
    .sort((a, b) => a.task.date.localeCompare(b.task.date));

export const upcomingTasks = (plans: BookStudyPlan[] = [], today: string, horizonDays = 7): PlannedTask[] => {
  const limit = addDays(today, horizonDays);
  return flattenTasks(plans)
    .filter(pt => pt.task.date > today && pt.task.date <= limit)
    .sort((a, b) => a.task.date.localeCompare(b.task.date));
};

export const planProgress = (plan: BookStudyPlan): number => {
  if (plan.tasks.length === 0) return 0;
  return Math.round((plan.tasks.filter(t => t.isCompleted).length / plan.tasks.length) * 100);
};

export const nearestExam = (plans: BookStudyPlan[] = [], today: string): { examDate: string; daysLeft: number; plan: BookStudyPlan } | null => {
  const future = plans
    .filter(p => p.examDate >= today)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));
  if (future.length === 0) return null;
  return { examDate: future[0].examDate, daysLeft: daysBetween(today, future[0].examDate), plan: future[0] };
};

/** Consecutive days (ending today or yesterday) on which every scheduled task was completed. Rest days are neutral. */
export const computeStreak = (plans: BookStudyPlan[] = [], today: string): number => {
  const all = flattenTasks(plans);
  if (all.length === 0) return 0;
  const earliest = all.reduce((min, pt) => (pt.task.date < min ? pt.task.date : min), all[0].task.date);

  const todays = all.filter(pt => pt.task.date === today);
  // Today only counts once it is fully done; otherwise the streak is measured up to yesterday.
  let cursor = todays.length > 0 && todays.every(pt => pt.task.isCompleted) ? today : addDays(today, -1);
  let streak = 0;
  let guard = 0;

  while (cursor >= earliest && guard < 400) {
    const dayTasks = all.filter(pt => pt.task.date === cursor);
    if (dayTasks.length > 0) {
      if (dayTasks.every(pt => pt.task.isCompleted)) {
        streak++;
      } else {
        break;
      }
    }
    cursor = addDays(cursor, -1);
    guard++;
  }
  return streak;
};

/* ------------------------------------------------------------------ */
/* Keep the admin-facing student fields in sync with the real plans     */
/* ------------------------------------------------------------------ */

const round1 = (n: number) => Math.round(n * 10) / 10;

export const syncStudentDerived = (student: Student, today: string = todayISO()): Student => {
  const plans = student.bookPlans || [];
  if (plans.length === 0) {
    // Remove any generated plan summaries left from deleted books, keep legacy ones.
    return {
      ...student,
      studyPlans: (student.studyPlans || []).filter(sp => !sp.id.startsWith('bp-'))
    };
  }

  const all = flattenTasks(plans);
  const doneCount = all.filter(pt => pt.task.isCompleted).length;
  const completedMinutes = all
    .filter(pt => pt.task.isCompleted)
    .reduce((sum, pt) => sum + pt.task.estimatedMinutes, 0);

  const generatedPlans: StudyPlan[] = plans.map(plan => {
    const totalMinutes = plan.tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
    const doneMinutes = plan.tasks.filter(t => t.isCompleted).reduce((s, t) => s + t.estimatedMinutes, 0);
    const weeks = Math.max(1, daysBetween(plan.startDate, plan.examDate)) / 7;
    const overdue = plan.tasks.filter(t => t.date < today && !t.isCompleted).length;
    return {
      id: plan.id,
      title: `${plan.subject} — ${plan.bookTitle}`,
      startDate: plan.startDate,
      endDate: plan.examDate,
      weeklyTargetHours: round1(totalMinutes / 60 / weeks),
      hoursCompleted: round1(doneMinutes / 60),
      pacing: overdue === 0 ? 'Optimal' : 'Behind Schedule',
      status: plan.examDate >= today ? 'Active' : 'Completed',
      completionRate: planProgress(plan),
      tasksCount: plan.tasks.length
    };
  });

  const legacyPlans = (student.studyPlans || []).filter(sp => !sp.id.startsWith('bp-'));

  let revisionPlanner = student.revisionPlanner;
  const exam = nearestExam(plans, today);
  if (exam) {
    const rounds: RevisionRound[] = [];
    for (let r = 1; r <= exam.plan.revisionRounds; r++) {
      const roundTasks = exam.plan.tasks.filter(t => t.kind === 'revision' && t.round === r);
      if (roundTasks.length === 0) continue;
      const done = roundTasks.filter(t => t.isCompleted).length;
      const dates = roundTasks.map(t => t.date).sort();
      rounds.push({
        id: `${exam.plan.id}-r${r}`,
        roundNumber: r,
        title: `Revision Round ${r}`,
        titleAr: `جولة المراجعة ${r}`,
        targetSubjects: [exam.plan.subject],
        progressPercent: Math.round((done / roundTasks.length) * 100),
        status: done === roundTasks.length ? 'Completed' : dates[0] <= today ? 'In Progress' : 'Upcoming',
        startDate: dates[0],
        targetDate: dates[dates.length - 1]
      });
    }
    revisionPlanner = {
      targetExamDate: exam.examDate,
      daysRemaining: exam.daysLeft,
      rounds,
      weakPoints: student.revisionPlanner?.weakPoints || [],
      nextMockExam: student.revisionPlanner?.nextMockExam || '—'
    };
  }

  return {
    ...student,
    overallProgress: Math.round((doneCount / all.length) * 100),
    studyPlans: [...generatedPlans, ...legacyPlans],
    revisionPlanner,
    performanceReport: {
      ...student.performanceReport,
      studyStreakDays: computeStreak(plans, today),
      totalHoursStudied: round1(completedMinutes / 60)
    }
  };
};

/* ------------------------------------------------------------------ */
/* PDF helpers (client-side, no dependencies)                           */
/* ------------------------------------------------------------------ */

const MAX_DETECT_BYTES = 150 * 1024 * 1024;
const MAX_OBJECT_STREAMS = 600;

const inflate = async (bytes: Uint8Array): Promise<string> => {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  const out = await new Response(stream).arrayBuffer();
  return new TextDecoder('latin1').decode(new Uint8Array(out));
};

/** Counts page objects and finds the page-tree /Count inside a chunk of PDF text. */
const scanChunk = (text: string): { pageObjects: number; treeCount: number } => {
  // Page objects: /Type /Page (but not /Pages).
  const pageObjects = (text.match(/\/Type\s*\/Page(?![A-Za-z])/g) || []).length;

  // Page-tree nodes: /Type /Pages ... /Count N (the root node has the largest N).
  let treeCount = 0;
  const treeRegex = /\/Type\s*\/Pages(?![A-Za-z])/g;
  let m: RegExpExecArray | null;
  while ((m = treeRegex.exec(text)) !== null) {
    const windowText = text.slice(Math.max(0, m.index - 300), m.index + 300);
    const counts = [...windowText.matchAll(/\/Count\s+(\d+)/g)].map(x => parseInt(x[1], 10));
    if (counts.length > 0) treeCount = Math.max(treeCount, ...counts);
  }
  return { pageObjects, treeCount };
};

/**
 * Best-effort page count by scanning the raw PDF bytes (also looks inside compressed
 * object streams, which most modern PDFs use). Returns 0 when it can't tell
 * (encrypted/odd files), in which case the student just enters the page count manually.
 */
export const detectPdfPageCount = async (file: File): Promise<number> => {
  try {
    if (file.size > MAX_DETECT_BYTES) return 0;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = new TextDecoder('latin1').decode(bytes); // 1 char = 1 byte, so indexes match

    let { pageObjects, treeCount } = scanChunk(text);

    if (typeof DecompressionStream !== 'undefined') {
      const objStmRegex = /\/Type\s*\/ObjStm/g;
      let m: RegExpExecArray | null;
      let processed = 0;
      while ((m = objStmRegex.exec(text)) !== null && processed < MAX_OBJECT_STREAMS) {
        processed++;
        const streamKeyword = text.indexOf('stream', m.index);
        if (streamKeyword === -1) continue;
        let start = streamKeyword + 6;
        if (text[start] === '\r') start++;
        if (text[start] === '\n') start++;
        const end = text.indexOf('endstream', start);
        if (end === -1) continue;
        // The EOL before "endstream" is not part of the compressed data.
        let trimmedEnd = end;
        if (text[trimmedEnd - 1] === '\n') trimmedEnd--;
        if (text[trimmedEnd - 1] === '\r') trimmedEnd--;
        for (const candidateEnd of [trimmedEnd, end]) {
          try {
            const inner = scanChunk(await inflate(bytes.subarray(start, candidateEnd)));
            pageObjects += inner.pageObjects;
            treeCount = Math.max(treeCount, inner.treeCount);
            break;
          } catch {
            // Not a Flate stream or damaged: try the next candidate, then skip it.
          }
        }
      }
    }

    return Math.max(pageObjects, treeCount);
  } catch {
    return 0;
  }
};

export const titleFromFilename = (filename: string): string =>
  filename
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
