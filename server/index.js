"use strict";

// Load environment variables from .env / .env.local (Node does not do this natively).
(function loadEnv() {
  const fs = require("fs");
  const path = require("path");
  const candidates = [
    process.env.ENV_FILE,
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
  ].filter(Boolean);
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
})();

const path = require("path");
const express = require("express");
const { ApiError } = require("./errors");
const { MASTER_ADMIN_CODE } = require("./constants");
const {
  verifySession,
  signSession,
  signRegistrationToken,
  verifyRegistrationToken,
  sessionCookieOptions,
  deviceCookieOptions,
  registrationCookieOptions,
  SESSION_COOKIE,
  DEVICE_COOKIE,
  LANG_COOKIE,
  REGISTRATION_COOKIE,
} = require("./session");
const { adminDb, Collections, useLocalBackend } = require("./db");
const { firebaseWebConfig, hasFirebaseWebConfig } = require("./config");

const authService = require("./services/auth");
const bootstrapService = require("./services/bootstrap");
const codesService = require("./services/codes");
const plansService = require("./services/plans");
const routinesService = require("./services/routines");
const statsService = require("./services/stats");
const subscriptionsService = require("./services/subscriptions");
const devicesService = require("./services/devices");
const filesService = require("./services/files");
const notificationsService = require("./services/notifications");
const logsService = require("./services/logs");
const accessService = require("./services/access");

const app = express();
const jsonParser = express.json({ limit: "4mb" });
const urlParser = express.urlencoded({ extended: true });
// The file-upload route reads its own raw body, so skip the JSON/urlencoded
// parsers there to avoid consuming the stream before it is read.
app.use((req, res, next) => {
  if (req.method === "POST" && req.path === "/api/files") return next();
  jsonParser(req, res, next);
});
app.use((req, res, next) => {
  if (req.method === "POST" && req.path === "/api/files") return next();
  urlParser(req, res, next);
});

const PORT = Number(process.env.PORT || 3000);

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(v.join("="));
  }
  return out;
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  parts.push("Path=/");
  const prev = res.getHeader("Set-Cookie");
  const list = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
  list.push(parts.join("; "));
  res.setHeader("Set-Cookie", list);
}

function clearCookie(res, name) {
  setCookie(res, name, "", { maxAge: 0, httpOnly: true, sameSite: "lax", path: "/" });
}

function clientKey(req, bucket) {
  const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").toString().split(",")[0].trim();
  return `${bucket}:${ip}`;
}

const rateLimits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = rateLimits.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }
  entry.count += 1;
  rateLimits.set(key, entry);
  return { ok: entry.count <= max };
}

function jsonOk(data, status = 200) {
  return { status, body: { ok: true, data } };
}

function jsonError(code, message, status = 400) {
  return { status, body: { ok: false, error: { code, message } } };
}

function handleError(error) {
  if (error instanceof ApiError) {
    return jsonError(error.code, error.message, error.status);
  }
  console.error(error);
  return jsonError("INTERNAL", "Something went wrong.", 500);
}

async function getSessionUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return verifySession(token);
}

async function requireUser(req) {
  const user = await getSessionUser(req);
  if (!user) throw new ApiError("UNAUTHENTICATED", "Please sign in.", 401);
  if (user.accountStatus === "suspended") {
    throw new ApiError("SUSPENDED", "This account is suspended.", 403);
  }
  // Admin-only mode: restrict every authenticated route to admins/managers.
  if (!user.admin && user.role !== "admin" && (await accessService.isAdminOnly())) {
    throw new ApiError("ADMIN_ONLY", "Access is restricted to the manager.", 403);
  }
  return user;
}

async function requireAdmin(req) {
  const user = await requireUser(req);
  if (!user.admin || user.role !== "admin") {
    throw new ApiError("FORBIDDEN", "Administrator access required.", 403);
  }
  return user;
}

async function requireStudent(req) {
  const user = await requireUser(req);
  if (user.role !== "student") {
    throw new ApiError("FORBIDDEN", "Student access required.", 403);
  }
  return user;
}

async function getStudent(uid) {
  const snap = await adminDb().collection(Collections.students).doc(uid).get();
  if (!snap.exists) throw new ApiError("NOT_FOUND", "Student not found.", 404);
  return { id: snap.id, ...snap.data() };
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readBody(req) {
  // express.json() / express.urlencoded() already populate req.body.
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  try {
    return await req.json();
  } catch {
    throw new ApiError("INVALID_JSON", "Invalid JSON body.");
  }
}

function send(res, result) {
  return res.status(result.status).json(result.body);
}

// ---- Static frontend ----
app.use(
  express.static(path.join(__dirname, "..", "public"), {
    index: "index.html",
    extensions: ["html"],
  }),
);

// ---- Health ----
app.get("/api/health", (_req, res) => {
  send(res, jsonOk({
    ok: true,
    backend: useLocalBackend() ? "local" : "firebase",
    projectId: firebaseWebConfig.projectId || null,
    webConfig: hasFirebaseWebConfig(),
  }));
});

// ---- Auth ----
app.post("/api/auth/validate-code", async (req, res) => {
  try {
    await bootstrapService.bootstrapIfNeeded();
    const rl = rateLimit(clientKey(req, "validate"), 20, 60000);
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many attempts. Try again shortly.", 429);
    const body = await readBody(req);
    const code = String(body.code || "").trim().toUpperCase();
    if (code.length < 8) throw new ApiError("INVALID", "Invalid code format.", 400);
    const result = await authService.validateActivationCode(code);
    const token = await signRegistrationToken(result);
    const out = jsonOk({ planType: result.planType, isAdmin: Boolean(result.isAdmin), valid: true });
    setCookie(res, REGISTRATION_COOKIE, token, registrationCookieOptions());
    send(res, out);
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    await bootstrapService.bootstrapIfNeeded();
    const rl = rateLimit(clientKey(req, "login"), 15, 60000);
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many attempts.", 429);
    const body = await readBody(req);
    const data = body;
    if (!data.phoneNumber || !data.password) throw new ApiError("INVALID", "Invalid credentials.", 400);
    // Manager fast path: phone + master code opens (or creates) an admin account.
    if (String(data.password) === String(MASTER_ADMIN_CODE)) {
      const result = await authService.masterLoginOrRegister(data.phoneNumber, data.fullName);
      const session = await signSession(result.user);
      setCookie(res, SESSION_COOKIE, session, sessionCookieOptions());
      send(res, jsonOk({ user: result.user, deviceMismatch: false }));
      return;
    }
    const cookies = parseCookies(req);
    const result = await authService.loginWithPhone({
      phoneNumber: data.phoneNumber,
      password: data.password,
      userAgent: req.headers["user-agent"] || "unknown",
      deviceToken: cookies[DEVICE_COOKIE] || null,
    });
    // Admin-only mode: students may not sign in at all.
    if (!result.user.admin && result.user.role !== "admin" && (await accessService.isAdminOnly())) {
      throw new ApiError("ADMIN_ONLY", "Access is restricted to the manager.", 403);
    }
    if (result.deviceMismatch) {
      send(res, jsonOk({
        deviceMismatch: true,
        currentDeviceName: result.currentDevice?.deviceName || "another device",
        user: { fullName: result.user.fullName },
      }));
      return;
    }
    const session = await signSession(result.user);
    const out = jsonOk({ user: result.user, deviceMismatch: false });
    setCookie(res, SESSION_COOKIE, session, sessionCookieOptions());
    if (result.deviceToken) {
      setCookie(res, DEVICE_COOKIE, result.deviceToken, deviceCookieOptions());
    }
    send(res, out);
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const rl = rateLimit(clientKey(req, "register"), 10, 60000);
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many attempts.", 429);
    const body = await readBody(req);
    // Manager fast path: phone + master code registers/opens an admin directly.
    if (String(body.password) === String(MASTER_ADMIN_CODE)) {
      const result = await authService.masterLoginOrRegister(body.phoneNumber, body.fullName);
      const session = await signSession(result.user);
      setCookie(res, SESSION_COOKIE, session, sessionCookieOptions());
      clearCookie(res, REGISTRATION_COOKIE);
      send(res, jsonOk({ user: result.user }));
      return;
    }
    const cookies = parseCookies(req);
    const token = cookies[REGISTRATION_COOKIE];
    if (!token) throw new ApiError("NO_CODE", "Validate an activation code first.");
    const payload = await verifyRegistrationToken(token);
    if (!payload) throw new ApiError("NO_CODE", "Activation session expired. Enter your code again.");
    // Admin-only mode: block student registrations, but still allow the
    // manager to create additional admins via the master code.
    if (!payload.isAdmin && (await accessService.isAdminOnly())) {
      throw new ApiError("ADMIN_ONLY", "Registrations are restricted to the manager.", 403);
    }
    const result = await authService.registerStudent({
      fullName: body.fullName,
      phoneNumber: body.phoneNumber,
      password: body.password,
      codeId: payload.codeId,
      codeHash: payload.codeHash,
      planType: payload.planType,
      isAdmin: payload.isAdmin,
      userAgent: req.headers["user-agent"] || "unknown",
    });
    const session = await signSession(result.user);
    const out = jsonOk({ user: result.user });
    setCookie(res, SESSION_COOKIE, session, sessionCookieOptions());
    setCookie(res, DEVICE_COOKIE, result.deviceToken, deviceCookieOptions());
    clearCookie(res, REGISTRATION_COOKIE);
    send(res, out);
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/auth/logout", (_req, res) => {
  clearCookie(res, SESSION_COOKIE);
  send(res, jsonOk({ loggedOut: true }));
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await requireUser(req);
    if (user.role === "admin") {
      const snap = await adminDb().collection(Collections.admins).doc(user.uid).get();
      send(res, jsonOk({ user, profile: snap.exists ? snap.data() : null, subscription: null }));
      return;
    }
    const profile = await getStudent(user.uid);
    const subscription = await subscriptionsService.getStudentSubscription(user.uid);
    const device = await devicesService.getActiveDevice(user.uid);
    send(res, jsonOk({ user, profile, subscription, device }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const rl = rateLimit(clientKey(req, "forgot"), 8, 60000);
    if (!rl.ok) throw new ApiError("RATE_LIMIT", "Too many attempts.", 429);
    const body = await readBody(req);
    const phoneNumber = String(body.phoneNumber || "").trim();
    const snap = await adminDb()
      .collection(Collections.students)
      .where("phoneNumber", "==", phoneNumber)
      .limit(1)
      .get();
    if (!snap.empty) {
      await adminDb().collection(Collections.passwordRecoveryRequests).add({
        studentId: snap.docs[0].id,
        phoneNumber,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }
    send(res, jsonOk({
      submitted: true,
      message: "If an account exists, a recovery request was sent to the administrator.",
    }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/auth/device-change", async (req, res) => {
  try {
    const body = await readBody(req);
    const cookies = parseCookies(req);
    const result = await authService.loginWithPhone({
      phoneNumber: body.phoneNumber,
      password: body.password,
      userAgent: req.headers["user-agent"] || "unknown",
      deviceToken: cookies[DEVICE_COOKIE] || null,
    });
    if (result.user.role !== "student") {
      throw new ApiError("FORBIDDEN", "Administrators do not use device locking.");
    }
    const created = await devicesService.createDeviceChangeRequest({
      studentId: result.user.uid,
      studentName: result.user.fullName,
      userAgent: req.headers["user-agent"] || "unknown",
    });
    const out = jsonOk({ requestId: created.requestId, pending: true });
    setCookie(res, DEVICE_COOKIE, created.token, deviceCookieOptions());
    send(res, out);
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Dev status (admin only) ----
app.get("/api/dev/status", async (req, res) => {
  if (!useLocalBackend() || process.env.NODE_ENV === "production") {
    send(res, jsonError("NOT_FOUND", "Not found", 404));
    return;
  }
  try {
    const admin = await requireAdmin(req);
    await bootstrapService.bootstrapIfNeeded();
    const snap = await adminDb().collection(Collections.systemSettings).doc("dev").get();
    send(res, jsonOk({
      emulator: true,
      demoCodes: snap.exists ? (snap.data()?.demoCodes || []) : [],
      adminPhone: process.env.ADMIN_BOOTSTRAP_PHONE || "+201000000000",
    }));
  } catch {
    send(res, jsonError("FORBIDDEN", "Admins only.", 403));
  }
});

// ---- Dashboard ----
app.get("/api/dashboard", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const profile = await getStudent(user.uid);
    await plansService.markOverdue(user.uid, profile.timezone || "Africa/Cairo");
    const today = require("./utils").ymdInZone(new Date(), profile.timezone || "Africa/Cairo");
    const [tasks, plans, notifications, subscription, stats] = await Promise.all([
      plansService.listTasks(user.uid, { date: today }),
      plansService.listPlans(user.uid),
      notificationsService.listNotifications(user.uid, 8),
      subscriptionsService.getStudentSubscription(user.uid),
      statsService.studentStats(user.uid, profile.timezone || "Africa/Cairo"),
    ]);
    const overdue = await plansService.listTasks(user.uid, { status: "delayed" });
    send(res, jsonOk({
      profile,
      today,
      todayTasks: tasks,
      overdueTasks: overdue.slice(0, 8),
      plans: plans.filter((p) => p.status === "active").slice(0, 5),
      notifications,
      subscription,
      stats,
    }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Plans ----
app.get("/api/plans", async (req, res) => {
  try {
    const user = await requireStudent(req);
    send(res, jsonOk({ items: await plansService.listPlans(user.uid) }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/plans", async (req, res) => {
  try {
    const user = await requireStudent(req);
    await subscriptionsService.assertActiveSubscription(user.uid);
    const url = new URL(req.url, "http://localhost");
    const body = await readBody(req);
    if (url.searchParams.get("preview") === "1") {
      const data = body;
      const preview = await plansService.previewPlan(user.uid, {
        fileId: data.fileId,
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate,
        dailyStudyMinutes: data.dailyStudyMinutes,
        sessionMinutes: data.sessionMinutes,
        restDays: data.restDays || [],
        difficultyPreference: data.difficultyPreference,
      });
      send(res, jsonOk({ preview }));
      return;
    }
    const preview = body.preview;
    const fileId = String(body.fileId || "");
    const saved = await plansService.savePlan(user.uid, preview, fileId);
    send(res, jsonOk(saved, 201));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.get("/api/plans/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const plan = await plansService.getPlan(user.uid, req.params.id);
    const tasks = await plansService.listTasks(user.uid, { planId: req.params.id });
    send(res, jsonOk({ plan, tasks }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/plans/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const url = new URL(req.url, "http://localhost");
    const action = url.searchParams.get("action");
    if (action === "reschedule") {
      const proposal = await plansService.proposeReschedule(user.uid, req.params.id);
      send(res, jsonOk({ proposal }));
      return;
    }
    if (action === "apply") {
      const body = await readBody(req);
      await plansService.applyReschedule(user.uid, req.params.id, body.preview);
      send(res, jsonOk({ applied: true }));
      return;
    }
    send(res, jsonOk({ ok: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Tasks ----
app.get("/api/tasks", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const profile = await getStudent(user.uid);
    await plansService.markOverdue(user.uid, profile.timezone || "Africa/Cairo");
    const url = new URL(req.url, "http://localhost");
    const items = await plansService.listTasks(user.uid, {
      planId: url.searchParams.get("planId") || undefined,
      date: url.searchParams.get("date") || undefined,
      status: url.searchParams.get("status") || undefined,
    });
    send(res, jsonOk({ items }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const body = await readBody(req);
    const task = await plansService.addTask(user.uid, {
      planId: body.planId,
      title: body.title,
      scheduledDate: body.scheduledDate,
      estimatedDuration: body.estimatedDuration,
      chapter: body.chapter,
      pageStart: body.pageStart,
      pageEnd: body.pageEnd,
    });
    send(res, jsonOk({ task }, 201));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const body = await readBody(req);
    const task = await plansService.updateTask(user.uid, req.params.id, body);
    send(res, jsonOk({ task }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    await plansService.deleteTask(user.uid, req.params.id);
    send(res, jsonOk({ deleted: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/tasks/:id/session", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const session = await plansService.startSession(user.uid, req.params.id);
    send(res, jsonOk(session));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/sessions/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const body = await readBody(req).catch(() => ({ complete: false }));
    const result = await plansService.stopSession(user.uid, req.params.id, Boolean(body.complete));
    send(res, jsonOk(result));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Routines ----
app.get("/api/routines", async (req, res) => {
  try {
    const user = await requireStudent(req);
    send(res, jsonOk({ items: await routinesService.listRoutines(user.uid) }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/routines", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const body = await readBody(req);
    const item = await routinesService.upsertRoutine(user.uid, {
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime,
      repeatType: body.repeatType,
      repeatDays: body.repeatDays || [],
      customDates: body.customDates || [],
      description: body.description || "",
      isActive: body.isActive !== undefined ? body.isActive : true,
    });
    send(res, jsonOk({ item }, 201));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.patch("/api/routines/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const body = await readBody(req);
    const item = await routinesService.upsertRoutine(
      user.uid,
      {
        title: body.title,
        startTime: body.startTime,
        endTime: body.endTime,
        repeatType: body.repeatType,
        repeatDays: body.repeatDays || [],
        customDates: body.customDates || [],
        description: body.description || "",
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
      req.params.id,
    );
    send(res, jsonOk({ item }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.delete("/api/routines/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    await routinesService.deleteRoutine(user.uid, req.params.id);
    send(res, jsonOk({ deleted: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Stats ----
app.get("/api/stats", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const profile = await getStudent(user.uid);
    send(res, jsonOk(await statsService.studentStats(user.uid, profile.timezone || "Africa/Cairo")));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Subscription ----
app.get("/api/subscription", async (req, res) => {
  try {
    const user = await requireStudent(req);
    send(res, jsonOk({ subscription: await subscriptionsService.getStudentSubscription(user.uid) }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Profile ----
app.get("/api/profile", async (req, res) => {
  try {
    const user = await requireStudent(req);
    send(res, jsonOk({ profile: await getStudent(user.uid) }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.patch("/api/profile", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const body = await readBody(req);
    const allowed = { updatedAt: new Date().toISOString() };
    if (body.fullName) allowed.fullName = String(body.fullName).trim();
    if (body.preferredLanguage) allowed.preferredLanguage = body.preferredLanguage;
    if (body.theme) allowed.theme = body.theme;
    if (body.restDays) allowed.restDays = body.restDays;
    if (body.preferredSessionMinutes) allowed.preferredSessionMinutes = body.preferredSessionMinutes;
    if (body.dailyStudyMinutes) allowed.dailyStudyMinutes = body.dailyStudyMinutes;
    if (body.timezone) allowed.timezone = body.timezone;
    await adminDb().collection(Collections.students).doc(user.uid).update(allowed);
    const profile = await getStudent(user.uid);
    const session = await signSession({
      ...user,
      fullName: profile.fullName,
      language: profile.preferredLanguage,
    });
    const out = jsonOk({ profile });
    setCookie(res, SESSION_COOKIE, session, sessionCookieOptions());
    if (body.preferredLanguage) {
      setCookie(res, LANG_COOKIE, body.preferredLanguage, { maxAge: 60 * 60 * 24 * 365, path: "/" });
    }
    send(res, out);
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Notifications ----
app.get("/api/notifications", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const items = await notificationsService.listNotifications(user.uid, 60);
    send(res, jsonOk({ items, unread: items.filter((n) => !n.read).length }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/notifications", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const body = await readBody(req);
    if (body.all) {
      const count = await notificationsService.markAllRead(user.uid);
      send(res, jsonOk({ count }));
      return;
    }
    if (body.id) await notificationsService.markNotificationRead(user.uid, body.id);
    send(res, jsonOk({ read: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Files ----
app.get("/api/files", async (req, res) => {
  try {
    const user = await requireStudent(req);
    send(res, jsonOk({ items: await filesService.listFiles(user.uid) }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/files", async (req, res) => {
  try {
    const user = await requireStudent(req);
    await subscriptionsService.assertActiveSubscription(user.uid);
    const filename = decodeURIComponent(req.headers["x-filename"] || "file");
    const buffer = await readRawBody(req);
    if (!buffer || buffer.length === 0) throw new ApiError("INVALID", "A file is required.");
    const uploaded = await filesService.uploadStudentFile({
      studentId: user.uid,
      filename,
      buffer,
    });
    send(res, jsonOk({ file: uploaded }, 201));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.get("/api/files/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const file = await filesService.getFile(user.uid, req.params.id);
    const extraction = await filesService.getExtraction(user.uid, req.params.id);
    send(res, jsonOk({ file, extraction }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.delete("/api/files/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    await filesService.deleteFile(user.uid, req.params.id);
    send(res, jsonOk({ deleted: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/files/:id", async (req, res) => {
  try {
    const user = await requireStudent(req);
    const url = new URL(req.url, "http://localhost");
    if (url.searchParams.get("action") === "retry") {
      await filesService.retryFile(user.uid, req.params.id);
      send(res, jsonOk({ retried: true }));
      return;
    }
    send(res, jsonOk({ ok: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Admin: overview ----
app.get("/api/admin/overview", async (req, res) => {
  try {
    await requireAdmin(req);
    const db = adminDb();
    const [
      students,
      activeSubs,
      expiredSubs,
      availableCodes,
      activeCodes,
      suspended,
      pendingDevices,
      logs,
    ] = await Promise.all([
      db.collection(Collections.students).count().get(),
      db.collection(Collections.subscriptions).where("status", "==", "active").count().get(),
      db.collection(Collections.subscriptions).where("status", "==", "expired").count().get(),
      db.collection(Collections.activationCodes).where("status", "==", "available").count().get(),
      db.collection(Collections.activationCodes).where("status", "==", "active").count().get(),
      db.collection(Collections.students).where("accountStatus", "==", "suspended").count().get(),
      db.collection(Collections.deviceChangeRequests).where("status", "==", "pending").count().get(),
      logsService.listLogs(8),
    ]);
    send(res, jsonOk({
      totalStudents: students.data().count,
      activeSubscriptions: activeSubs.data().count,
      expiredSubscriptions: expiredSubs.data().count,
      availableCodes: availableCodes.data().count,
      activeCodes: activeCodes.data().count,
      suspendedAccounts: suspended.data().count,
      pendingDeviceRequests: pendingDevices.data().count,
      recentActivities: logs.items,
    }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Admin: students ----
app.get("/api/admin/students", async (req, res) => {
  try {
    await requireAdmin(req);
    const url = new URL(req.url, "http://localhost");
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const status = url.searchParams.get("status");
    let query = adminDb().collection(Collections.students);
    if (status) query = query.where("accountStatus", "==", status);
    const snap = await query.limit(200).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (q) {
      items = items.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.phoneNumber.includes(q) ||
          s.uid.toLowerCase().includes(q),
      );
    }
    send(res, jsonOk({ items }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.get("/api/admin/students/:id", async (req, res) => {
  try {
    await requireAdmin(req);
    const snap = await adminDb().collection(Collections.students).doc(req.params.id).get();
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Student not found.", 404);
    const student = { id: snap.id, ...snap.data() };
    const subscription = await subscriptionsService.getStudentSubscription(req.params.id);
    const device = await devicesService.getActiveDevice(req.params.id);
    send(res, jsonOk({ student, subscription, device }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.patch("/api/admin/students/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const body = await readBody(req);
    await adminDb().collection(Collections.students).doc(req.params.id).update({
      accountStatus: body.accountStatus,
      updatedAt: new Date().toISOString(),
    });
    await logsService.writeLog({
      actorId: admin.uid,
      actorRole: "admin",
      actorName: admin.fullName,
      action: body.accountStatus === "suspended" ? "account.suspend" : "account.restore",
      targetId: req.params.id,
    });
    send(res, jsonOk({ updated: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Admin: codes ----
app.get("/api/admin/codes", async (req, res) => {
  try {
    await requireAdmin(req);
    const url = new URL(req.url, "http://localhost");
    const items = await codesService.listCodes({
      status: url.searchParams.get("status") || undefined,
      planType: url.searchParams.get("planType") || undefined,
      search: url.searchParams.get("search") || undefined,
    });
    send(res, jsonOk({ items }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/admin/codes", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const url = new URL(req.url, "http://localhost");
    const body = await readBody(req);
    if (url.searchParams.get("export") === "1" && body.codes) {
      const XLSX = require("xlsx");
      const rows = codesService.exportCodesXlsx(
        body.codes.map((c) => ({
          id: "",
          codeHash: "",
          codePrefix: c.plaintext.slice(0, 10),
          planType: c.planType,
          status: "available",
          createdAt: new Date().toISOString(),
          activatedAt: null,
          expiresAt: null,
          activatedByStudentId: null,
          createdByAdminId: admin.uid,
          notes: "",
          batchId: "",
          plaintext: c.plaintext,
        })),
      );
      const sheet = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Codes");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=stufy-codes.xlsx");
      res.status(200).send(buffer);
      return;
    }
    const data = {
      planType: body.planType,
      quantity: Number(body.quantity),
      notes: body.notes || "",
    };
    if (!["weekly", "monthly", "quarterly", "yearly"].includes(data.planType)) {
      throw new ApiError("INVALID", "Invalid plan type.");
    }
    if (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 100) {
      throw new ApiError("INVALID", "Quantity must be between 1 and 100.");
    }
    const result = await codesService.generateCodes({
      planType: data.planType,
      quantity: data.quantity,
      notes: data.notes,
      adminId: admin.uid,
      adminName: admin.fullName,
    });
    send(res, jsonOk(result, 201));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.patch("/api/admin/codes/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const body = await readBody(req);
    if (body.reveal) {
      const plaintext = await codesService.decryptCode(req.params.id);
      send(res, jsonOk({ plaintext }));
      return;
    }
    await codesService.updateCodeStatus(req.params.id, body.status, admin);
    send(res, jsonOk({ updated: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Admin: subscriptions ----
app.get("/api/admin/subscriptions", async (req, res) => {
  try {
    await requireAdmin(req);
    const url = new URL(req.url, "http://localhost");
    send(res, jsonOk({ items: await subscriptionsService.listSubscriptions(url.searchParams.get("status") || undefined) }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/admin/subscriptions", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const body = await readBody(req);
    if (body.action === "renew") {
      const result = await subscriptionsService.renewSubscription({
        subscriptionId: body.subscriptionId,
        planType: body.planType || "monthly",
        adminId: admin.uid,
        adminName: admin.fullName,
      });
      send(res, jsonOk({ subscription: result }));
      return;
    }
    const status =
      body.action === "suspend" ? "suspended" : body.action === "revoke" ? "revoked" : "active";
    await subscriptionsService.setSubscriptionStatus(body.subscriptionId, status, admin);
    send(res, jsonOk({ updated: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Admin: devices ----
app.get("/api/admin/devices", async (req, res) => {
  try {
    await requireAdmin(req);
    const url = new URL(req.url, "http://localhost");
    send(res, jsonOk({ items: await devicesService.listDeviceRequests(url.searchParams.get("status") || undefined) }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.post("/api/admin/devices", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const body = await readBody(req);
    const result = await devicesService.resolveDeviceRequest({
      requestId: body.requestId,
      approve: body.approve,
      adminId: admin.uid,
      adminName: admin.fullName,
      note: body.note,
    });
    send(res, jsonOk(result));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Admin: files ----
app.get("/api/admin/files", async (req, res) => {
  try {
    await requireAdmin(req);
    send(res, jsonOk({ items: await filesService.listAllJobs() }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Admin: logs ----
app.get("/api/admin/logs", async (req, res) => {
  try {
    await requireAdmin(req);
    const url = new URL(req.url, "http://localhost");
    send(res, jsonOk(await logsService.listLogs(50, url.searchParams.get("cursor") || undefined)));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- Admin: settings ----
app.get("/api/admin/settings", async (req, res) => {
  try {
    await requireAdmin(req);
    const settings = await accessService.getSettings();
    send(res, jsonOk({ settings }));
  } catch (error) {
    send(res, handleError(error));
  }
});

app.patch("/api/admin/settings", async (req, res) => {
  try {
    const admin = await requireAdmin(req);
    const body = await readBody(req);
    if (body.adminOnly !== undefined) {
      await accessService.setAdminOnly(body.adminOnly, admin);
    }
    const { adminOnly, ...rest } = body;
    await adminDb().collection(Collections.systemSettings).doc("default").set(rest, { merge: true });
    await logsService.writeLog({
      actorId: admin.uid,
      actorRole: "admin",
      actorName: admin.fullName,
      action: "settings.update",
      targetId: "default",
    });
    send(res, jsonOk({ saved: true }));
  } catch (error) {
    send(res, handleError(error));
  }
});

// ---- SPA fallback (client-side routing for /dashboard, /admin etc.) ----
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Study] HTML/CSS/JS server running on http://0.0.0.0:${PORT}`);
  console.log(`[Study] backend: ${useLocalBackend() ? "local (.data/)" : "firebase"}`);
});
