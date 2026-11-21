import {
  BREAK_MINUTES,
  STUDY_WINDOW_END,
  STUDY_WINDOW_START,
} from "@/lib/constants";
import { eachYmd, timeToMinutes, weekdayOfYmd } from "@/lib/utils";
import type {
  ExtractedTopic,
  ExtractionResult,
  PlanPreview,
  RepeatType,
  RescheduleProposal,
  Routine,
  StudyTask,
} from "@/types";

type Slot = { start: number; end: number };

function routineApplies(routine: Routine, ymd: string) {
  if (!routine.isActive) return false;
  const weekday = weekdayOfYmd(ymd);
  if (routine.repeatType === "once") return routine.customDates.includes(ymd);
  if (routine.repeatType === "daily") return true;
  if (routine.repeatType === "weekdays") return weekday >= 0 && weekday <= 6 && routine.repeatDays.includes(weekday);
  return routine.repeatDays.includes(weekday) || routine.customDates.includes(ymd);
}

function blockedSlots(routines: Routine[], ymd: string): Slot[] {
  const slots: Slot[] = [];
  for (const r of routines) {
    if (!routineApplies(r, ymd)) continue;
    const start = timeToMinutes(r.startTime);
    const end = timeToMinutes(r.endTime);
    if (end > start) slots.push({ start, end });
  }
  return slots.sort((a, b) => a.start - b.start);
}

function freeMinutes(routines: Routine[], ymd: string, cap: number) {
  const windowStart = timeToMinutes(STUDY_WINDOW_START);
  const windowEnd = timeToMinutes(STUDY_WINDOW_END);
  const blocked = blockedSlots(routines, ymd);
  let free = 0;
  let cursor = windowStart;
  for (const b of blocked) {
    if (b.start > cursor) free += Math.min(windowEnd, b.start) - cursor;
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < windowEnd) free += windowEnd - cursor;
  return Math.max(0, Math.min(cap, free));
}

function flattenTopics(extraction: ExtractionResult): Array<ExtractedTopic & { chapter: string }> {
  const out: Array<ExtractedTopic & { chapter: string }> = [];
  for (const ch of extraction.chapters) {
    for (const topic of ch.topics) {
      out.push({ ...topic, chapter: ch.title });
    }
  }
  return out;
}

function sortTopics(
  topics: Array<ExtractedTopic & { chapter: string }>,
  preference?: "balanced" | "easy_first" | "hard_first",
) {
  if (preference === "easy_first") return [...topics].sort((a, b) => a.difficulty - b.difficulty);
  if (preference === "hard_first") return [...topics].sort((a, b) => b.difficulty - a.difficulty);
  const copy = [...topics];
  const hard = copy.filter((t) => t.difficulty >= 4);
  const rest = copy.filter((t) => t.difficulty < 4);
  const mixed: typeof copy = [];
  while (hard.length || rest.length) {
    if (rest.length) mixed.push(rest.shift()!);
    if (hard.length) mixed.push(hard.shift()!);
  }
  return mixed;
}

function splitTopic(
  topic: ExtractedTopic & { chapter: string },
  minutes: number,
): [(ExtractedTopic & { chapter: string }) | null, ExtractedTopic & { chapter: string }] {
  if (minutes >= topic.estimatedMinutes || topic.endPage === topic.startPage) {
    return [topic, { ...topic, estimatedMinutes: 0, startPage: topic.endPage, endPage: topic.endPage }];
  }
  const ratio = minutes / topic.estimatedMinutes;
  const pages = topic.endPage - topic.startPage + 1;
  const takePages = Math.max(1, Math.floor(pages * ratio));
  const mid = topic.startPage + takePages - 1;
  const first = {
    ...topic,
    endPage: mid,
    estimatedMinutes: minutes,
  };
  const rest = {
    ...topic,
    startPage: mid + 1,
    estimatedMinutes: Math.max(10, topic.estimatedMinutes - minutes),
  };
  return [first, rest];
}

export function generatePlanPreview(input: {
  extraction: ExtractionResult;
  fileName: string;
  title?: string;
  startDate: string;
  endDate: string;
  restDays: number[];
  dailyStudyMinutes: number;
  sessionMinutes: number;
  routines: Routine[];
  difficultyPreference?: "balanced" | "easy_first" | "hard_first";
}): PlanPreview {
  const warnings: string[] = [];
  const dates = eachYmd(input.startDate, input.endDate);
  if (!dates.length) throw new Error("Invalid date range.");

  const topics = sortTopics(flattenTopics(input.extraction), input.difficultyPreference);
  if (!topics.length) {
    warnings.push("No topics were extracted from the document. A plan cannot be created until extraction succeeds.");
  }

  const remaining = [...topics];
  const days: PlanPreview["days"] = dates.map((date) => {
    const isRestDay = input.restDays.includes(weekdayOfYmd(date));
    const available = isRestDay ? 0 : freeMinutes(input.routines, date, input.dailyStudyMinutes);
    return {
      date,
      isRestDay,
      availableMinutes: available,
      estimatedMinutes: 0,
      tasks: [] as PlanPreview["days"][number]["tasks"],
    };
  });

  let dayIndex = 0;
  while (remaining.length && dayIndex < days.length) {
    const day = days[dayIndex];
    if (day.isRestDay || day.availableMinutes <= 0) {
      dayIndex += 1;
      continue;
    }
    let leftover = day.availableMinutes - day.estimatedMinutes;
    if (leftover < 10) {
      dayIndex += 1;
      continue;
    }
    const topic = remaining[0];
    const sessionCap = Math.min(leftover, input.sessionMinutes);
    if (topic.estimatedMinutes <= sessionCap + 5) {
      remaining.shift();
      day.tasks.push({
        title: topic.title,
        chapter: topic.chapter,
        pageStart: topic.startPage,
        pageEnd: topic.endPage,
        pageSource: topic.pageSource,
        estimatedDuration: topic.estimatedMinutes,
        topicId: topic.id,
        subject: topic.chapter,
      });
      day.estimatedMinutes += topic.estimatedMinutes;
      leftover -= topic.estimatedMinutes;
      if (leftover >= BREAK_MINUTES) leftover -= BREAK_MINUTES;
    } else if (sessionCap >= 15 && topic.endPage > topic.startPage) {
      const [part, rest] = splitTopic(topic, sessionCap);
      if (part) {
        remaining[0] = rest;
        if (rest.estimatedMinutes <= 0 || rest.startPage > rest.endPage) remaining.shift();
        day.tasks.push({
          title: `${part.title} (pp. ${part.startPage}–${part.endPage})`,
          chapter: part.chapter,
          pageStart: part.startPage,
          pageEnd: part.endPage,
          pageSource: part.pageSource,
          estimatedDuration: part.estimatedMinutes,
          topicId: part.id,
          subject: part.chapter,
        });
        day.estimatedMinutes += part.estimatedMinutes;
      } else {
        dayIndex += 1;
      }
    } else {
      dayIndex += 1;
    }
  }

  if (remaining.length) {
    warnings.push(
      `${remaining.length} topic(s) could not fit before the deadline. Extend the end date or increase daily study time.`,
    );
  }

  const overloaded = days.filter((d) => !d.isRestDay && d.estimatedMinutes > d.availableMinutes + 5);
  if (overloaded.length) {
    warnings.push(`${overloaded.length} day(s) exceed the available study window.`);
  }

  const totalPages = input.extraction.totalPages;
  const explanation = [
    `Distributed ${topics.length - remaining.length} of ${topics.length} extracted topics across ${dates.length} days.`,
    `Rest days are respected (${input.restDays.length} weekday type(s)).`,
    `Routine blocks are treated as unavailable.`,
    input.extraction.usedLlm
      ? "Topic titles were refined with the configured language model; page numbers stay within extracted ranges."
      : "Topic structure comes from deterministic document analysis. No pages were invented.",
  ].join(" ");

  if (input.extraction.uncertainty.length) {
    warnings.push(...input.extraction.uncertainty.slice(0, 5));
  }

  return {
    title: input.title || input.fileName.replace(/\.[^.]+$/, ""),
    startDate: input.startDate,
    endDate: input.endDate,
    totalChapters: input.extraction.chapters.length,
    totalPages,
    restDays: input.restDays,
    dailyStudyMinutes: input.dailyStudyMinutes,
    sessionMinutes: input.sessionMinutes,
    explanation,
    warnings,
    days,
  };
}

export function reschedulePlan(input: {
  tasks: StudyTask[];
  startDate: string;
  endDate: string;
  restDays: number[];
  dailyStudyMinutes: number;
  sessionMinutes: number;
  routines: Routine[];
  title: string;
  totalChapters: number;
  totalPages: number;
}): RescheduleProposal {
  const completed = input.tasks.filter((t) => t.status === "completed");
  const unfinished = input.tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.sortOrder - b.sortOrder);

  const extractionLike: ExtractionResult = {
    id: "reschedule",
    fileId: unfinished[0]?.sourceFileId || "",
    studentId: unfinished[0]?.studentId || "",
    language: "unknown",
    totalPages: input.totalPages,
    pageSource: unfinished[0]?.pageSource || "estimated",
    chapters: [],
    uncertainty: [],
    warnings: [],
    rawTextPreview: "",
    extractedAt: new Date().toISOString(),
    usedLlm: false,
  };

  const fakeTopics = unfinished.map((t) => ({
    id: t.topicId || t.id,
    title: t.title,
    startPage: t.pageStart,
    endPage: t.pageEnd,
    pageSource: t.pageSource,
    difficulty: 3 as const,
    estimatedMinutes: Math.max(10, t.estimatedDuration - t.actualDuration),
    summary: "",
    isEstimate: t.pageSource === "estimated",
    chapter: t.chapter,
  }));

  const preview = generatePlanPreview({
    extraction: {
      ...extractionLike,
      chapters: [
        {
          id: "remaining",
          title: "Remaining work",
          startPage: 1,
          endPage: input.totalPages || 1,
          pageSource: extractionLike.pageSource,
          topics: fakeTopics,
        },
      ],
    },
    fileName: input.title,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    restDays: input.restDays,
    dailyStudyMinutes: input.dailyStudyMinutes,
    sessionMinutes: input.sessionMinutes,
    routines: input.routines,
  });

  const completedDates = new Set(completed.map((t) => t.scheduledDate));
  preview.days = preview.days.map((d) => {
    if (completedDates.has(d.date)) {
      return d;
    }
    return d;
  });

  const moved = unfinished.filter((t) => {
    const found = preview.days.some((d) =>
      d.tasks.some((x) => x.topicId === (t.topicId || t.id) && d.date !== t.scheduledDate),
    );
    return found;
  }).length;

  return {
    reason: "Unfinished tasks were redistributed across remaining available days.",
    explanation:
      "Completed tasks were kept in place. Delayed and incomplete tasks were packed into free slots that respect rest days and routine blocks.",
    plan: preview,
    unchangedCompleted: completed.length,
    movedTasks: moved,
  };
}

export function routineRepeatLabel(type: RepeatType) {
  return type;
}
