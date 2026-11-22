import test from "node:test";
import assert from "node:assert/strict";
import { generatePlan } from "./planner.ts";

const base = {
  totalPages: 100,
  fromPage: 1,
  startDate: "2026-01-04", // Sunday
  endDate: "2026-01-17", // Saturday, 14 days
  restWeekdays: [5], // Friday
  minutesPerPage: 3,
};

test("covers every page exactly once, contiguously", () => {
  const r = generatePlan(base);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.days[0].fromPage, 1);
  assert.equal(r.days[r.days.length - 1].toPage, 100);
  for (let i = 1; i < r.days.length; i += 1) {
    assert.equal(r.days[i].fromPage, r.days[i - 1].toPage + 1);
  }
  const sum = r.days.reduce((s, d) => s + (d.toPage - d.fromPage + 1), 0);
  assert.equal(sum, 100);
});

test("skips rest days", () => {
  const r = generatePlan(base);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.studyDays, 12); // 14 days minus two Fridays
  for (const d of r.days) {
    const wd = new Date(`${d.date}T00:00:00`).getDay();
    assert.notEqual(wd, 5);
  }
});

test("never creates empty days when pages < days", () => {
  const r = generatePlan({ ...base, totalPages: 3 });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.days.length, 3);
  for (const d of r.days) assert.equal(d.fromPage, d.toPage);
});

test("starts from a later page", () => {
  const r = generatePlan({ ...base, fromPage: 41 });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.days[0].fromPage, 41);
  assert.equal(r.totalToStudy, 60);
});

test("minutes follow pages", () => {
  const r = generatePlan({ ...base, totalPages: 12, startDate: "2026-01-04", endDate: "2026-01-04" });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.days.length, 1);
  assert.equal(r.days[0].minutes, 36);
});

test("reports errors", () => {
  assert.deepEqual(generatePlan({ ...base, fromPage: 0 }), { ok: false, error: "invalid-pages" });
  assert.deepEqual(generatePlan({ ...base, fromPage: 101 }), { ok: false, error: "invalid-pages" });
  assert.deepEqual(generatePlan({ ...base, endDate: "2026-01-01" }), { ok: false, error: "invalid-range" });
  assert.deepEqual(generatePlan({ ...base, startDate: "nope" }), { ok: false, error: "invalid-range" });
  assert.deepEqual(
    generatePlan({ ...base, startDate: "2026-01-09", endDate: "2026-01-09" }),
    { ok: false, error: "no-study-days" },
  );
  assert.deepEqual(
    generatePlan({ ...base, startDate: "2026-01-01", endDate: "2028-01-01" }),
    { ok: false, error: "too-many-days" },
  );
});
