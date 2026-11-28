import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveStats, withDerivedStats } from '../src/lib/studentStats.ts';

const sess = (id: string, date: string, done: boolean, min = 60) => ({
  id, dayIndex: 0, date, chapterTitle: '', chapterTitleAr: '', pageFrom: 1, pageTo: 2,
  durationMinutes: min, kind: 'study' as const, roundNumber: 0, title: '', titleAr: '', isCompleted: done
});
const plan = (sessions: ReturnType<typeof sess>[]) => ({ sessions }) as never;

test('progress, remaining, delayed, hours', () => {
  const s = deriveStats(plan([
    sess('a', '2026-11-26', true, 90), sess('b', '2026-11-27', false), sess('c', '2026-11-28', true, 30), sess('d', '2026-11-30', false)
  ]), '2026-11-28');
  assert.equal(s.totalSessions, 4);
  assert.equal(s.completedSessions, 2);
  assert.equal(s.remainingSessions, 2);
  assert.equal(s.delayedSessions, 1);
  assert.equal(s.progressPercent, 50);
  assert.equal(s.totalHoursStudied, 2);
});

test('streak counts consecutive completed days ending today or yesterday', () => {
  const p = plan([sess('a', '2026-11-26', true), sess('b', '2026-11-27', true), sess('c', '2026-11-28', true)]);
  assert.equal(deriveStats(p, '2026-11-28').studyStreakDays, 3);
  assert.equal(deriveStats(p, '2026-11-29').studyStreakDays, 3);
  assert.equal(deriveStats(p, '2026-12-01').studyStreakDays, 0);
});

test('no plan keeps stored values (no zeroing)', () => {
  const st = { overallProgress: 42, generatedPlan: null } as never;
  assert.equal(withDerivedStats(st, '2026-11-28').overallProgress, 42);
});

test('plan present overrides stale zero', () => {
  const st = { overallProgress: 0, generatedPlan: plan([sess('a', '2026-11-28', true), sess('b', '2026-11-29', false)]) } as never;
  const out = withDerivedStats(st, '2026-11-28') as { overallProgress: number; performanceReport: { totalHoursStudied: number } };
  assert.equal(out.overallProgress, 50);
  assert.equal(out.performanceReport.totalHoursStudied, 1);
});
