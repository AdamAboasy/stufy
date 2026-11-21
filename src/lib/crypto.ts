import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashCode(plaintext: string) {
  const pepper = process.env.CODE_PEPPER || "stufy-dev-code-pepper-key";
  return createHmac("sha256", pepper).update(plaintext.trim().toUpperCase()).digest("hex");
}

export function generateActivationCode() {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `STUFY-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

export function generateToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  const pepper = process.env.CODE_PEPPER || "stufy-dev-code-pepper-key";
  return createHmac("sha256", pepper).update(token).digest("hex");
}

function encryptionKey() {
  const raw = process.env.CODE_ENCRYPTION_KEY || "stufy-dev-encryption-key-32b";
  return scryptSync(raw, "stufy-codes", 32);
}

export function encryptSecret(plaintext: string) {
  const { createCipheriv } = require("crypto") as typeof import("crypto");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string) {
  const { createDecipheriv } = require("crypto") as typeof import("crypto");
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function randomId(prefix = "") {
  return `${prefix}${randomBytes(12).toString("hex")}`;
}
