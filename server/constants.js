"use strict";

const path = require("path");

const APP_NAME = "Stufy";

const PLAN_DURATIONS = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

const MAX_FILE_SIZE_BYTES =
  Number(process.env.MAX_FILE_SIZE_MB || 25) * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const SESSION_COOKIE = "stufy_session";
const DEVICE_COOKIE = "stufy_device";
const LANG_COOKIE = "stufy_lang";
const REGISTRATION_COOKIE = "stufy_registration";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const REGISTRATION_TTL_SECONDS = 60 * 15;

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DEFAULT_TIMEZONE = "Africa/Cairo";
const DEFAULT_DAILY_MINUTES = 120;
const DEFAULT_SESSION_MINUTES = 45;
const BREAK_MINUTES = 10;
const STUDY_WINDOW_START = "06:00";
const STUDY_WINDOW_END = "23:00";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "firestore.json");
const AUTH_PATH = path.join(DATA_DIR, "auth.json");
const STORAGE_DIR = path.join(DATA_DIR, "storage");

module.exports = {
  APP_NAME,
  PLAN_DURATIONS,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  SESSION_COOKIE,
  DEVICE_COOKIE,
  LANG_COOKIE,
  REGISTRATION_COOKIE,
  SESSION_TTL_SECONDS,
  REGISTRATION_TTL_SECONDS,
  WEEKDAY_KEYS,
  DEFAULT_TIMEZONE,
  DEFAULT_DAILY_MINUTES,
  DEFAULT_SESSION_MINUTES,
  BREAK_MINUTES,
  STUDY_WINDOW_START,
  STUDY_WINDOW_END,
  DATA_DIR,
  DB_PATH,
  AUTH_PATH,
  STORAGE_DIR,
};
