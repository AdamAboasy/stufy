import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const DATA_DIR = join(process.cwd(), ".data");
const DB_PATH = join(DATA_DIR, "firestore.json");
const AUTH_PATH = join(DATA_DIR, "auth.json");
const STORAGE_DIR = join(DATA_DIR, "storage");

type Doc = Record<string, unknown>;
type DB = Record<string, Record<string, Doc>>;
type AuthUser = {
  uid: string;
  email: string;
  passwordHash: string;
  displayName: string;
  claims: Record<string, unknown>;
};
type AuthDB = { users: AuthUser[] };

function ensureDirs() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(STORAGE_DIR, { recursive: true });
}

function readJson<T>(path: string, fallback: T): T {
  ensureDirs();
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, value: unknown) {
  ensureDirs();
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function loadDB(): DB {
  return readJson<DB>(DB_PATH, {});
}

function saveDB(db: DB) {
  writeJson(DB_PATH, db);
}

function loadAuth(): AuthDB {
  return readJson<AuthDB>(AUTH_PATH, { users: [] });
}

function saveAuth(db: AuthDB) {
  writeJson(AUTH_PATH, db);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function isServerTimestamp(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const name = (value as { constructor?: { name?: string } }).constructor?.name || "";
  const method = (value as { _methodName?: string })._methodName;
  return (
    name.includes("ServerTimestamp") ||
    method === "serverTimestamp" ||
    method === "SERVER_TIMESTAMP"
  );
}

function incrementAmount(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const name = (value as { constructor?: { name?: string } }).constructor?.name || "";
  const method = (value as { _methodName?: string })._methodName;
  if (name.includes("NumericIncrement") || method === "increment") {
    const operand =
      (value as { operand?: number }).operand ??
      (value as { _operand?: number })._operand;
    return typeof operand === "number" ? operand : 1;
  }
  return null;
}

function resolveValue(value: unknown, existing?: unknown): unknown {
  if (value == null) return value;
  const inc = incrementAmount(value);
  if (inc !== null) return (typeof existing === "number" ? existing : 0) + inc;
  if (isServerTimestamp(value)) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      // continue
    }
  }
  if (
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.constructor &&
    value.constructor !== Object
  ) {
    return new Date().toISOString();
  }
  return value;
}

function resolveDoc(data: Doc, existing?: Doc) {
  const out: Doc = { ...(existing || {}) };
  for (const [key, value] of Object.entries(data)) {
    out[key] = resolveValue(value, existing?.[key]);
  }
  return out;
}

function matchWhere(doc: Doc, field: string, op: string, value: unknown) {
  const current = doc[field];
  if (op === "==") return current === value;
  if (op === "in") return Array.isArray(value) && value.includes(current);
  if (op === "!=") return current !== value;
  if (op === ">=") return (current as number | string) >= (value as number | string);
  if (op === "<=") return (current as number | string) <= (value as number | string);
  if (op === ">") return (current as number | string) > (value as number | string);
  if (op === "<") return (current as number | string) < (value as number | string);
  return false;
}

class LocalSnapshot {
  constructor(
    public id: string,
    public _data: Doc | undefined,
    public ref: LocalDocRef,
  ) {}
  get exists() {
    return Boolean(this._data);
  }
  data() {
    return this._data ? { ...this._data } : undefined;
  }
}

class LocalDocRef {
  constructor(
    private col: string,
    public id: string,
  ) {}
  async get() {
    const db = loadDB();
    return new LocalSnapshot(this.id, db[this.col]?.[this.id], this);
  }
  async set(data: Doc) {
    const db = loadDB();
    db[this.col] ||= {};
    db[this.col][this.id] = resolveDoc(data);
    saveDB(db);
  }
  async update(data: Doc) {
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
  private filters: Array<{ field: string; op: string; value: unknown }> = [];
  private order?: { field: string; dir: "asc" | "desc" };
  private limitCount = 1000;
  private afterId: string | null = null;

  constructor(private col: string) {}

  where(field: string, op: string, value: unknown) {
    const next = new LocalQuery(this.col);
    next.filters = [...this.filters, { field, op, value }];
    next.order = this.order;
    next.limitCount = this.limitCount;
    next.afterId = this.afterId;
    return next;
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc") {
    const next = new LocalQuery(this.col);
    next.filters = this.filters;
    next.order = { field, dir };
    next.limitCount = this.limitCount;
    next.afterId = this.afterId;
    return next;
  }

  limit(n: number) {
    const next = new LocalQuery(this.col);
    next.filters = this.filters;
    next.order = this.order;
    next.limitCount = n;
    next.afterId = this.afterId;
    return next;
  }

  startAfter(snap: LocalSnapshot) {
    const next = new LocalQuery(this.col);
    next.filters = this.filters;
    next.order = this.order;
    next.limitCount = this.limitCount;
    next.afterId = snap.id;
    return next;
  }

  private records() {
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
        const cmp = (av as string) > (bv as string) ? 1 : -1;
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
    const docs = items.map(
      (item) => new LocalSnapshot(item.id, item.data, new LocalDocRef(this.col, item.id)),
    );
    return { docs, empty: docs.length === 0, size: docs.length };
  }

  count() {
    const n = this.records().length;
    return {
      get: async () => ({ data: () => ({ count: n }) }),
    };
  }
}

class LocalCollection extends LocalQuery {
  constructor(private name: string) {
    super(name);
  }
  doc(id?: string) {
    return new LocalDocRef(this.name, id || randomBytes(12).toString("hex"));
  }
  async add(data: Doc) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class LocalBatch {
  private ops: Array<() => Promise<void>> = [];
  set(ref: LocalDocRef, data: Doc) {
    this.ops.push(() => ref.set(data));
  }
  update(ref: LocalDocRef, data: Doc) {
    this.ops.push(() => ref.update(data));
  }
  delete(ref: LocalDocRef) {
    this.ops.push(() => ref.delete());
  }
  async commit() {
    for (const op of this.ops) await op();
  }
}

export function localDb() {
  return {
    collection(name: string) {
      return new LocalCollection(name);
    },
    async runTransaction<T>(fn: (tx: {
      get: (ref: LocalDocRef) => Promise<LocalSnapshot>;
      set: (ref: LocalDocRef, data: Doc) => void;
      update: (ref: LocalDocRef, data: Doc) => void;
    }) => Promise<T>) {
      const writes: Array<() => Promise<void>> = [];
      const tx = {
        get: (ref: LocalDocRef) => ref.get(),
        set: (ref: LocalDocRef, data: Doc) => writes.push(() => ref.set(data)),
        update: (ref: LocalDocRef, data: Doc) => writes.push(() => ref.update(data)),
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

function hashPassword(password: string, salt?: string) {
  const used = salt || randomBytes(16).toString("hex");
  const hash = scryptSync(password, used, 32).toString("hex");
  return `${used}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const check = scryptSync(password, salt, 32);
  const current = Buffer.from(hash, "hex");
  if (check.length !== current.length) return false;
  return timingSafeEqual(check, current);
}

export function localAuth() {
  return {
    async setCustomUserClaims(uid: string, claims: Record<string, unknown>) {
      const db = loadAuth();
      const user = db.users.find((u) => u.uid === uid);
      if (user) user.claims = claims;
      saveAuth(db);
    },
    async updateUser(uid: string, data: { displayName?: string }) {
      const db = loadAuth();
      const user = db.users.find((u) => u.uid === uid);
      if (user && data.displayName) user.displayName = data.displayName;
      saveAuth(db);
    },
    async deleteUser(uid: string) {
      const db = loadAuth();
      db.users = db.users.filter((u) => u.uid !== uid);
      saveAuth(db);
    },
    async getUserByEmail(email: string) {
      const user = loadAuth().users.find((u) => u.email === email);
      if (!user) throw new Error("USER_NOT_FOUND");
      return user;
    },
    async revokeRefreshTokens() {
      return;
    },
  };
}

export function localSignUp(email: string, password: string) {
  const db = loadAuth();
  if (db.users.some((u) => u.email === email)) {
    throw Object.assign(new Error("EMAIL_EXISTS"), { code: "EMAIL_EXISTS" });
  }
  const uid = createHash("sha256").update(email + randomBytes(4)).digest("hex").slice(0, 28);
  db.users.push({
    uid,
    email,
    passwordHash: hashPassword(password),
    displayName: "",
    claims: {},
  });
  saveAuth(db);
  return { uid, idToken: uid };
}

export function localSignIn(email: string, password: string) {
  const user = loadAuth().users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw Object.assign(new Error("INVALID_PASSWORD"), { code: "INVALID_PASSWORD" });
  }
  return { uid: user.uid, idToken: user.uid };
}

export function localBucket() {
  return {
    file(storagePath: string) {
      const full = join(STORAGE_DIR, storagePath);
      return {
        async save(buffer: Buffer) {
          mkdirSync(dirname(full), { recursive: true });
          writeFileSync(full, buffer);
        },
        async download() {
          return [readFileSync(full)] as [Buffer];
        },
        async delete() {
          try {
            const { unlinkSync } = await import("fs");
            unlinkSync(full);
          } catch {
            // ignore
          }
        },
      };
    },
  };
}

export function localBackendEnabled() {
  if (process.env.USE_LOCAL_BACKEND === "true") return true;
  if (process.env.USE_LOCAL_BACKEND === "false") return false;
  if (process.env.USE_FIREBASE_EMULATORS === "true") return false;
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) return false;
  const credPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || join(process.cwd(), "serviceAccount.json");
  if (existsSync(credPath)) return false;
  return true;
}
