import { z } from "zod";

export function normalizePhone(input: string) {
  let value = input.trim().replace(/[^\d+]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (/^01\d{9}$/.test(value)) value = `+2${value}`;
  if (/^2\d{11}$/.test(value)) value = `+${value}`;
  if (!value.startsWith("+") && /^\d{10,15}$/.test(value)) value = `+${value}`;
  return value;
}

export const phoneSchema = z
  .string()
  .min(8)
  .transform(normalizePhone)
  .refine((v) => /^\+\d{10,15}$/.test(v), "Invalid phone number");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/\d/, "Password must include a number");

export const activationCodeSchema = z
  .string()
  .trim()
  .min(8)
  .transform((v) => v.toUpperCase());

export const loginSchema = z.object({
  phoneNumber: phoneSchema,
  password: z.string().min(1),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  phoneNumber: phoneSchema,
  password: passwordSchema,
});

export const generateCodesSchema = z.object({
  planType: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  quantity: z.number().int().min(1).max(100),
  notes: z.string().max(500).optional().default(""),
});

export const routineSchema = z.object({
  title: z.string().trim().min(2).max(80),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  repeatType: z.enum(["daily", "weekdays", "custom", "once"]),
  repeatDays: z.array(z.number().int().min(0).max(6)).default([]),
  customDates: z.array(z.string()).default([]),
  description: z.string().max(300).optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export const generatePlanSchema = z.object({
  fileId: z.string().min(1),
  title: z.string().trim().min(2).max(120).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyStudyMinutes: z.number().int().min(30).max(12 * 60),
  sessionMinutes: z.number().int().min(15).max(180),
  restDays: z.array(z.number().int().min(0).max(6)).default([]),
  difficultyPreference: z.enum(["balanced", "easy_first", "hard_first"]).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimatedDuration: z.number().int().min(5).max(600).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(["not_started", "in_progress", "completed", "delayed"]).optional(),
  pageStart: z.number().int().min(1).optional(),
  pageEnd: z.number().int().min(1).optional(),
});
