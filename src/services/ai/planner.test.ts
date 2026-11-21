import { generatePlanPreview, reschedulePlan } from "./planner";
import type { ExtractionResult, Routine, StudyTask } from "../../types";

function sampleExtraction(): ExtractionResult {
  return {
    id: "ex1",
    fileId: "f1",
    studentId: "s1",
    language: "en",
    totalPages: 40,
    pageSource: "printed",
    chapters: [
      {
        id: "c1",
        title: "Chapter 1",
        startPage: 1,
        endPage: 20,
        pageSource: "printed",
        topics: [
          {
            id: "t1",
            title: "Intro",
            startPage: 1,
            endPage: 10,
            pageSource: "printed",
            difficulty: 2,
            estimatedMinutes: 40,
            summary: "",
            isEstimate: false,
          },
          {
            id: "t2",
            title: "Core",
            startPage: 11,
            endPage: 20,
            pageSource: "printed",
            difficulty: 4,
            estimatedMinutes: 80,
            summary: "",
            isEstimate: false,
          },
        ],
      },
      {
        id: "c2",
        title: "Chapter 2",
        startPage: 21,
        endPage: 40,
        pageSource: "printed",
        topics: [
          {
            id: "t3",
            title: "Practice",
            startPage: 21,
            endPage: 40,
            pageSource: "printed",
            difficulty: 3,
            estimatedMinutes: 90,
            summary: "",
            isEstimate: false,
          },
        ],
      },
    ],
    uncertainty: [],
    warnings: [],
    rawTextPreview: "",
    extractedAt: new Date().toISOString(),
    usedLlm: false,
  };
}

const restRoutine: Routine = {
  id: "r1",
  studentId: "s1",
  title: "School",
  startTime: "08:00",
  endTime: "14:00",
  repeatDays: [0, 1, 2, 3, 4],
  repeatType: "weekdays",
  customDates: [],
  description: "",
  isActive: true,
  createdAt: new Date().toISOString(),
};

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const preview = generatePlanPreview({
  extraction: sampleExtraction(),
  fileName: "biology.pdf",
  startDate: "2026-11-22",
  endDate: "2026-12-05",
  restDays: [5],
  dailyStudyMinutes: 120,
  sessionMinutes: 45,
  routines: [restRoutine],
});

assert(preview.days.length > 0, "plan has days");
assert(
  preview.days.filter((d) => d.isRestDay).every((d) => d.tasks.length === 0),
  "rest days have no tasks",
);
assert(
  preview.days.every((d) => d.tasks.every((t) => t.pageStart >= 1 && t.pageEnd <= 40)),
  "pages stay within extracted range",
);
assert(
  !preview.days.some((d) => d.tasks.some((t) => t.pageStart > t.pageEnd)),
  "page ranges are ordered",
);

const completed: StudyTask = {
  id: "done",
  planId: "p1",
  studentId: "s1",
  title: "Intro",
  subject: "Chapter 1",
  sourceFileId: "f1",
  sourceFileName: "biology.pdf",
  chapter: "Chapter 1",
  topicId: "t1",
  pageStart: 1,
  pageEnd: 10,
  pageSource: "printed",
  scheduledDate: "2026-11-22",
  estimatedDuration: 40,
  actualDuration: 40,
  status: "completed",
  notes: "",
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
};

const leftover: StudyTask = {
  ...completed,
  id: "open",
  title: "Core",
  topicId: "t2",
  pageStart: 11,
  pageEnd: 20,
  status: "delayed",
  scheduledDate: "2026-11-23",
  completedAt: null,
  actualDuration: 0,
};

const proposal = reschedulePlan({
  tasks: [completed, leftover],
  startDate: "2026-11-24",
  endDate: "2026-12-05",
  restDays: [5],
  dailyStudyMinutes: 120,
  sessionMinutes: 45,
  routines: [restRoutine],
  title: "biology",
  totalChapters: 2,
  totalPages: 40,
});

assert(proposal.unchangedCompleted === 1, "completed tasks preserved");
assert(proposal.plan.days.filter((d) => d.isRestDay).every((d) => d.tasks.length === 0), "reschedule respects rest");

console.log("planner tests passed");
