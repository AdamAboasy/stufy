"use strict";

const { SignJWT, jwtVerify } = require("jose");
const {
  SESSION_COOKIE,
  DEVICE_COOKIE,
  LANG_COOKIE,
  REGISTRATION_COOKIE,
  REGISTRATION_TTL_SECONDS,
  SESSION_TTL_SECONDS,
} = require("./constants");

function secret() {
  const value = process.env.SESSION_SECRET || "stufy-dev-session-secret-key-min-32-chars";
  return new TextEncoder().encode(value);
}

async function signSession(user) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.uid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || !payload.role) return null;
    return {
      uid: payload.sub,
      role: payload.role,
      admin: Boolean(payload.admin),
      phoneNumber: String(payload.phoneNumber || ""),
      fullName: String(payload.fullName || ""),
      language: payload.language || "ar",
      accountStatus: payload.accountStatus || "active",
    };
  } catch {
    return null;
  }
}

async function signRegistrationToken(data) {
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REGISTRATION_TTL_SECONDS}s`)
    .sign(secret());
}

async function verifyRegistrationToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.codeId || !payload.codeHash || !payload.planType) return null;
    return {
      codeId: String(payload.codeId),
      codeHash: String(payload.codeHash),
      planType: String(payload.planType),
    };
  } catch {
    return null;
  }
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

function deviceCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

function registrationCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REGISTRATION_TTL_SECONDS,
  };
}

module.exports = {
  signSession,
  verifySession,
  signRegistrationToken,
  verifyRegistrationToken,
  sessionCookieOptions,
  deviceCookieOptions,
  registrationCookieOptions,
  SESSION_COOKIE,
  DEVICE_COOKIE,
  LANG_COOKIE,
  REGISTRATION_COOKIE,
};
