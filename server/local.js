"use strict";

const { createHash, randomBytes, scryptSync, timingSafeEqual } = require("crypto");
const { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } = require("fs");
const { dirname, join } = require("path");
const {
  DB_PATH,
  AUTH_PATH,
  STORAGE_DIR,
} = require("./constants");

function ensureDirs() {
  mkdirSync(join(process.cwd(), ".data"), { recursive: true });
  mkdirSync(STORAGE_DIR, { recursive: true });
}

function readJson(path, fallback) {
  ensureDirs();
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  ensureDirs();
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function loadDB() {
  return readJson(DB_PATH, {});
}

function saveDB(db) {
  writeJson(DB_PATH, db);
}

function loadAuth() {
  return readJson(AUTH_PATH, { users: [] });
}

function saveAuth(db) {
  writeJson(AUTH_PATH, db);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function isServerTimestamp(value) {
  if (!value || typeof value !== "object") return false;
  const name = value.constructor?.name || "";
  const method = value._methodName;
  return name.includes("ServerTimestamp") || method === "serverTimestamp" || method === "SERVER_TIMESTAMP";
}

function incrementAmount(value) {
  if (!value || typeof value !== "object") return null;
  const name = value.constructor?.name || "";
  const method = value._methodName;
  if (name.includes("NumericIncrement") || method === "increment") {
    const operand = value.operand ?? value._operand;
    return typeof operand === "number" ? operand : 1;
  }
  return null;
}

function resolveValue(value, existing) {
  if (value == null) return value;
  const inc = incrementAmount(value);
  if (inc !== null) return (typeof existing === "number" ? existing : 0) + inc;
  if (isServerTimestamp(value)) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      // continue
    }
  }
  if (typeof value === "object" && !Array.isArray(value) && value.constructor && value.constructor !== Object) {
    return new Date().toISOString();
  }
  return value;
}

function resolveDoc(data, existing) {
  const out = { ...(existing || {}) };
  for (const [key, value] of Object.entries(data)) {
    out[key] = resolveValue(value, existing?.[key]);
  }
  return out;
}

function matchWhere(doc, field, op, value) {
  const current = doc[field];
  if (op === "==") return current === value;
  if (op === "in") return Array.isArray(value) && value.includes(current);
  if (op === "!=") return current !== value;
  if (op === ">=") return current >= value;
  if (op === "<=") return current <= value;
  if (op === ">") return current > value;
  if (op === "<") return current < value;
  return false;
}

class LocalSnapshot {
  constructor(id, data, ref) {
    this.id = id;
    this._data = data;
    this.ref = ref;
  }
  get exists() {
    return Boolean(this._data);
  }
  data() {
    return this._data ? { ...this._data } : undefined;
  }
}

class LocalDocRef {
  constructor(col, id) {
    this.col = col;
    this.id = id;
  }
  async get() {
    const db = loadDB();
    return new LocalSnapshot(this.id, db[this.col]?.[this.id], this);
  }
  async set(data) {
    const db = loadDB();
    db[this.col] ||= {};
    db[this.col][this.id] = resolveDoc(data);
    saveDB(db);
  }
  async update(data) {
    const db = loadDB();
    db[this.col] ||= {};
    const existing = db[this.col][this.id];
    if (!existing) throw new Error("NOT_FOUND");
    db[this.col][this.id] = resolveDoc(data, existing);
    saveDB(db);
  }
  async delete() {
    const db = loadDB();
    if (db[this.col]) delete db[this.col][this.id];
    saveDB(db);
  }
}

class LocalQuery {
  constructor(col) {
    this.col = col;
    this.filters = [];
    this.order = undefined;
    this.limitCount = 1000;
    this.afterId = null;
  }
  where(field, op, value) {
    const next = new LocalQuery(this.col);
    next.filters = [...this.filters, { field, op, value }];
    next.order = this.order;
    next.limitCount = this.limitCount;
    next.afterId = this.afterId;
    return next;
  }
  orderBy(field, dir = "asc") {
    const next = new LocalQuery(this.col);
    next.filters = this.filters;
    next.order = { field, dir };
    next.limitCount = this.limitCount;
    next.afterId = this.afterId;
    return next;
  }
  limit(n) {
    const next = new LocalQuery(this.col);
    next.filters = this.filters;
    next.order = this.order;
    next.limitCount = n;
    next.afterId = this.afterId;
    return next;
  }
  startAfter(snap) {
    const next = new LocalQuery(this.col);
    next.filters = this.filters;
    next.order = this.order;
    next.limitCount = this.limitCount;
    next.afterId = snap.id;
    return next;
  }
  records() {
    const db = loadDB();
    let items = Object.entries(db[this.col] || {}).map(([id, data]) => ({ id, data }));
    for (const f of this.filters) {
      items = items.filter((item) => matchWhere(item.data, f.field, f.op, f.value));
    }
    if (this.order) {
      const { field, dir } = this.order;
      items.sort((a, b) => {
        const av = a.data[field];
        const bv = b.data[field];
        if (av === bv) return 0;
        const cmp = av > bv ? 1 : -1;
        return dir === "desc" ? -cmp : cmp;
      });
    }
    if (this.afterId) {
      const idx = items.findIndex((i) => i.id === this.afterId);
      items = idx >= 0 ? items.slice(idx + 1) : items;
    }
    return items;
  }
  async get() {
    const items = this.records().slice(0, this.limitCount);
    const docs = items.map((item) => new LocalSnapshot(item.id, item.data, new LocalDocRef(this.col, item.id)));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
  count() {
    const n = this.records().length;
    return { get: async () => ({ data: () => ({ count: n }) }) };
  }
}

class LocalCollection extends LocalQuery {
  constructor(name) {
    super(name);
    this.name = name;
  }
  doc(id) {
    return new LocalDocRef(this.name, id || randomBytes(12).toString("hex"));
  }
  async add(data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class LocalBatch {
  constructor() {
    this.ops = [];
  }
  set(ref, data) {
    this.ops.push(() => ref.set(data));
  }
  update(ref, data) {
    this.ops.push(() => ref.update(data));
  }
  delete(ref) {
    this.ops.push(() => ref.delete());
  }
  async commit() {
    for (const op of this.ops) await op();
  }
}

function localDb() {
  return {
    collection(name) {
      return new LocalCollection(name);
    },
    async runTransaction(fn) {
      const writes = [];
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, data) => writes.push(() => ref.set(data)),
        update: (ref, data) => writes.push(() => ref.update(data)),
      };
      const result = await fn(tx);
      for (const write of writes) await write();
      return result;
    },
    batch() {
      return new LocalBatch();
    },
  };
}

function hashPassword(password, salt) {
  const used = salt || randomBytes(16).toString("hex");
  const hash = scryptSync(password, used, 32).toString("hex");
  return `${used}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const check = scryptSync(password, salt, 32);
  const current = Buffer.from(hash, "hex");
  if (check.length !== current.length) return false;
  return timingSafeEqual(check, current);
}

function localAuth() {
  return {
    async setCustomUserClaims(uid, claims) {
      const db = loadAuth();
      const user = db.users.find((u) => u.uid === uid);
      if (user) user.claims = claims;
      saveAuth(db);
    },
    async updateUser(uid, data) {
      const db = loadAuth();
      const user = db.users.find((u) => u.uid === uid);
      if (user && data.displayName) user.displayName = data.displayName;
      saveAuth(db);
    },
    async deleteUser(uid) {
      const db = loadAuth();
      db.users = db.users.filter((u) => u.uid !== uid);
      saveAuth(db);
    },
    async getUserByEmail(email) {
      const user = loadAuth().users.find((u) => u.email === email);
      if (!user) throw new Error("USER_NOT_FOUND");
      return user;
    },
    async revokeRefreshTokens() {},
  };
}

function localSignUp(email, password) {
  const db = loadAuth();
  if (db.users.some((u) => u.email === email)) {
    const err = new Error("EMAIL_EXISTS");
    err.code = "EMAIL_EXISTS";
    throw err;
  }
  const uid = createHash("sha256").update(email + randomBytes(4)).digest("hex").slice(0, 28);
  db.users.push({ uid, email, passwordHash: hashPassword(password), displayName: "", claims: {} });
  saveAuth(db);
  return { uid, idToken: uid };
}

function localSignIn(email, password) {
  const user = loadAuth().users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    const err = new Error("INVALID_PASSWORD");
    err.code = "INVALID_PASSWORD";
    throw err;
  }
  return { uid: user.uid, idToken: user.uid };
}

function localBucket() {
  return {
    file(storagePath) {
      const full = join(STORAGE_DIR, storagePath);
      return {
        async save(buffer) {
          mkdirSync(dirname(full), { recursive: true });
          writeFileSync(full, buffer);
        },
        async download() {
          return [readFileSync(full)];
        },
        async delete() {
          try {
            unlinkSync(full);
          } catch {
            // ignore
          }
        },
      };
    },
  };
}

function localBackendEnabled() {
  if (process.env.USE_LOCAL_BACKEND === "true") return true;
  if (process.env.USE_LOCAL_BACKEND === "false") return false;
  if (process.env.USE_FIREBASE_EMULATORS === "true") return false;
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) return false;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(process.cwd(), "serviceAccount.json");
  if (existsSync(credPath)) return false;
  return true;
}

module.exports = {
  localDb,
  localAuth,
  localSignUp,
  localSignIn,
  localBucket,
  localBackendEnabled,
  ensureDirs,
  STORAGE_DIR,
};
