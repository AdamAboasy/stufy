import { parseISODate, toISODate } from "./dates.ts";

export type PlanInput = {
  /** Last page of the material. */
  totalPages: number;
  /** First page that still needs to be studied. */
  fromPage: number;
  /** ISO date, inclusive. */
  startDate: string;
  /** ISO date, inclusive. */
  endDate: string;
  /** JS weekday indexes (0 = Sunday) that are rest days. */
  restWeekdays: number[];
  minutesPerPage: number;
};

export type PlanDay = {
  date: string;
  fromPage: number;
  toPage: number;
  minutes: number;
};

export type PlanError = "invalid-pages" | "invalid-range" | "no-study-days" | "too-many-days";

export type PlanResult =
  | { ok: true; days: PlanDay[]; studyDays: number; pagesPerDay: number; totalToStudy: number }
  | { ok: false; error: PlanError };

export const MAX_PLAN_DAYS = 400;

/**
 * Spreads the pages `fromPage..totalPages` over the available study days.
 * Page ranges are contiguous and cover every page exactly once: no page is
 * invented, skipped or duplicated, and days never get an empty range.
 */
export function generatePlan(input: PlanInput): PlanResult {
  const { totalPages, fromPage, startDate, endDate, restWeekdays, minutesPerPage } = input;

  if (
    !Number.isInteger(totalPages) ||
    !Number.isInteger(fromPage) ||
    fromPage < 1 ||
    totalPages < fromPage
  ) {
    return { ok: false, error: "invalid-pages" };
  }

  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  if (!start || !end || end.getTime() < start.getTime()) {
    return { ok: false, error: "invalid-range" };
  }

  const dates: string[] = [];
  const cursor = new Date(start.getTime());
  let scanned = 0;
  while (cursor.getTime() <= end.getTime()) {
    scanned += 1;
    if (scanned > MAX_PLAN_DAYS) return { ok: false, error: "too-many-days" };
    if (!restWeekdays.includes(cursor.getDay())) dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  if (dates.length === 0) return { ok: false, error: "no-study-days" };

  const pages = totalPages - fromPage + 1;
  const used = Math.min(dates.length, pages);
  const base = Math.floor(pages / used);
  const extra = pages % used;
  const perPage = Number.isFinite(minutesPerPage) && minutesPerPage > 0 ? minutesPerPage : 0;

  const days: PlanDay[] = [];
  let page = fromPage;
  for (let i = 0; i < used; i += 1) {
    const count = base + (i < extra ? 1 : 0);
    days.push({
      date: dates[i],
      fromPage: page,
      toPage: page + count - 1,
      minutes: Math.round(count * perPage),
    });
    page += count;
  }

  return {
    ok: true,
    days,
    studyDays: dates.length,
    pagesPerDay: Math.ceil(pages / used),
    totalToStudy: pages,
  };
}
