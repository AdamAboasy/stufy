import assert from "node:assert/strict";
import { test } from "node:test";
import { generateLessonPlan, validateLessonAssignments } from "./lesson-planner.ts";
import type { Lesson } from "./types.ts";

function lesson(id: string, order: number, extra: Partial<Lesson> = {}): Lesson {
  return { id, studentId: "s1", subjectId: "math", title: id, subject: "Math", lessonOrder: order, difficulty: "easy", estimatedDuration: 30, actualDuration: 0, status: "not_started", createdAt: 0, updatedAt: 0, ...extra };
}

test("schedules lessons in source order and respects rest weekdays", () => {
  const result = generateLessonPlan({ lessons: [lesson("b", 2), lesson("a", 1)], startDate: "2026-11-23", endDate: "2026-11-25", restWeekdays: [2], dailyAvailableMinutes: 40, preferredSessionMinutes: 30 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.assignments.map((item) => item.lessonId), ["a", "b"]);
  assert.equal(result.assignments.some((item) => item.scheduledDate === "2026-11-24"), false);
});

test("places a dependent lesson after its prerequisite", () => {
  const result = generateLessonPlan({ lessons: [lesson("b", 1, { dependsOn: ["a"] }), lesson("a", 2)], startDate: "2026-11-23", endDate: "2026-11-25", restWeekdays: [], dailyAvailableMinutes: 30, preferredSessionMinutes: 30 });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const a = result.assignments.find((item) => item.lessonId === "a")!;
  const b = result.assignments.find((item) => item.lessonId === "b")!;
  assert.ok(b.scheduledDate > a.scheduledDate);
});

test("rejects an empty lesson set and invalid study duration", () => {
  const base = { startDate: "2026-11-23", endDate: "2026-11-25", restWeekdays: [], dailyAvailableMinutes: 30, preferredSessionMinutes: 30 };
  assert.deepEqual(generateLessonPlan({ ...base, lessons: [] }), { ok: false, error: "no-lessons" });
  assert.deepEqual(generateLessonPlan({ ...base, lessons: [lesson("a", 1)], dailyAvailableMinutes: 0 }), { ok: false, error: "invalid-time" });
});

test("does not silently satisfy a prerequisite omitted from the selected lessons", () => {
  const input = { lessons: [lesson("b", 1, { dependsOn: ["a"] })], startDate: "2026-11-23", endDate: "2026-11-25", restWeekdays: [], dailyAvailableMinutes: 60, preferredSessionMinutes: 30 };
  assert.deepEqual(generateLessonPlan(input), { ok: false, error: "dependencies-exceed-window" });
  const completed = generateLessonPlan({ ...input, completedLessonIds: ["a"] });
  assert.equal(completed.ok, true);
});

test("validates edited dates, daily capacity, and dependency order before saving", () => {
  const input = { lessons: [lesson("a", 1), lesson("b", 2, { dependsOn: ["a"] })], startDate: "2026-11-23", endDate: "2026-11-25", restWeekdays: [2], dailyAvailableMinutes: 40, preferredSessionMinutes: 20 };
  const valid = [
    { lessonId: "a", scheduledDate: "2026-11-23", estimatedDuration: 30 },
    { lessonId: "b", scheduledDate: "2026-11-25", estimatedDuration: 30 },
  ];
  assert.equal(validateLessonAssignments(input, valid), null);
  assert.equal(validateLessonAssignments(input, [{ ...valid[0], scheduledDate: "2026-11-26" }, valid[1]]), "edited-date-invalid");
  assert.equal(validateLessonAssignments(input, [{ ...valid[0], estimatedDuration: 20 }, { ...valid[1], scheduledDate: valid[0].scheduledDate, estimatedDuration: 20 }]), "dependencies-exceed-window");
  assert.equal(validateLessonAssignments(input, [{ ...valid[0], estimatedDuration: 25 }, { ...valid[1], lessonId: "a", estimatedDuration: 25 }]), "invalid-preview");
});

test("rejects edited schedules that exceed daily available study time", () => {
  const input = { lessons: [lesson("a", 1), lesson("b", 2)], startDate: "2026-11-23", endDate: "2026-11-25", restWeekdays: [], dailyAvailableMinutes: 40, preferredSessionMinutes: 20 };
  const assignments = [
    { lessonId: "a", scheduledDate: "2026-11-23", estimatedDuration: 25 },
    { lessonId: "b", scheduledDate: "2026-11-23", estimatedDuration: 20 },
  ];
  assert.equal(validateLessonAssignments(input, assignments), "daily-capacity-exceeded");
});
