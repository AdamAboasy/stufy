import type { PlanType } from "@/types";

export const APP_NAME = "Stufy";

export const PLAN_DURATIONS: Record<PlanType, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export const MAX_FILE_SIZE_BYTES =
  Number(process.env.MAX_FILE_SIZE_MB || 25) * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const SESSION_COOKIE = "stufy_session";
export const DEVICE_COOKIE = "stufy_device";
export const LANG_COOKIE = "stufy_lang";
export const REGISTRATION_COOKIE = "stufy_registration";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const REGISTRATION_TTL_SECONDS = 60 * 15;

export const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export const DEFAULT_TIMEZONE = "Africa/Cairo";
export const DEFAULT_DAILY_MINUTES = 120;
export const DEFAULT_SESSION_MINUTES = 45;
export const BREAK_MINUTES = 10;
export const STUDY_WINDOW_START = "06:00";
export const STUDY_WINDOW_END = "23:00";
