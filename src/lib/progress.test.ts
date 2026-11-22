import assert from "node:assert/strict";
import test from "node:test";
import type { Lesson } from "./types.ts";
import { summarizeLessons } from "./progress.ts";

const lesson = (id: string, status: Lesson["status"], scheduledDate?: string): Lesson => ({
  id, studentId: "student", title: id, subject: "Math", subjectId: "math", lessonOrder: 1,
  difficulty: "medium", estimatedDuration: 30, actualDuration: 0, status,
  scheduledDate, createdAt: 0, updatedAt: 0,
});

test("counts unique lessons once and computes overall completion from unique records", () => {
  const metrics = summarizeLessons([
    lesson("a", "completed", "2026-11-22"),
    lesson("a", "completed", "2026-11-22"),
    lesson("b", "not_started", "2026-11-22"),
  ], "2026-11-22");
  assert.equal(metrics.total, 2);
  assert.equal(metrics.completed.length, 1);
  assert.equal(metrics.remaining, 1);
  assert.equal(metrics.percent, 50);
  assert.equal(metrics.today.length, 2);
  assert.equal(metrics.todayPercent, 50);
  assert.equal(metrics.weekPercent, 50);
});

test("reports delayed lessons and excludes completed overdue lessons from the overdue list", () => {
  const metrics = summarizeLessons([
    lesson("late", "not_started", "2026-11-20"),
    lesson("done", "completed", "2026-11-20"),
    lesson("delayed", "delayed", "2026-11-22"),
  ], "2026-11-22");
  assert.equal(metrics.delayed.length, 2);
  assert.deepEqual(metrics.overdue.map((item) => item.id), ["late"]);
});
