"use strict";

const { DEFAULT_TIMEZONE } = require("./constants");

function formatDate(iso, locale, options) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    ...options,
  }).format(date);
}

function formatDateTime(iso, locale) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMinutes(total, locale) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (locale === "ar") {
    if (hours && minutes) return `${hours} س ${minutes} د`;
    if (hours) return `${hours} ساعة`;
    return `${minutes} دقيقة`;
  }
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function ymdInZone(date, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function weekdayOfYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function daysBetweenYmd(start, end) {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function eachYmd(start, end) {
  const out = [];
  let cursor = start;
  while (cursor <= end) {
    out.push(cursor);
    cursor = addDaysYmd(cursor, 1);
  }
  return out;
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatBytes(bytes, locale = "en") {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} ${locale === "ar" ? "ك.ب" : "KB"}`;
  return `${(kb / 1024).toFixed(1)} ${locale === "ar" ? "م.ب" : "MB"}`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

module.exports = {
  formatDate,
  formatDateTime,
  formatMinutes,
  ymdInZone,
  addDaysYmd,
  weekdayOfYmd,
  daysBetweenYmd,
  eachYmd,
  timeToMinutes,
  minutesToTime,
  formatBytes,
  initials,
};
