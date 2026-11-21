"use strict";

const { adminDb, adminAuth, Collections } = require("../db");
const { localSignUp } = require("../local");
const { generateCodes } = require("./codes");

let bootstrapped = false;

function normalizePhone(input) {
  let value = String(input).trim().replace(/[^\d+]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (/^01\d{9}$/.test(value)) value = `+2${value}`;
  if (/^2\d{11}$/.test(value)) value = `+${value}`;
  if (!value.startsWith("+") && /^\d{10,15}$/.test(value)) value = `+${value}`;
  return value;
}

async function bootstrapIfNeeded() {
  if (bootstrapped) return;

  const phone = normalizePhone(process.env.ADMIN_BOOTSTRAP_PHONE || "+201000000000");
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || "Admin@123456";
  const name = process.env.ADMIN_BOOTSTRAP_NAME || "Super Admin";
  const email = `${phone.replace(/[^0-9]/g, "")}@users.stufy.local`;

  const existing = await adminDb().collection(Collections.admins).limit(1).get();
  if (existing.empty) {
    let uid = "";
    try {
      const created = await localSignUp(email, password);
      uid = created.uid;
    } catch (error) {
      const message = error.message;
      if (message === "EMAIL_EXISTS") {
        const user = await adminAuth().getUserByEmail(email);
        uid = user.uid;
      } else {
        console.warn("[Study] admin bootstrap failed:", message);
        return;
      }
    }
    await adminAuth().setCustomUserClaims(uid, { role: "admin", admin: true });
    await adminAuth().updateUser(uid, { displayName: name });
    await adminDb().collection(Collections.admins).doc(uid).set({
      uid,
      fullName: name,
      phoneNumber: phone,
      role: "admin",
      preferredLanguage: "ar",
      createdAt: new Date().toISOString(),
    });
    console.log(`[Study] Super Admin ready. Phone: ${phone}`);
  }

  const codes = await adminDb().collection(Collections.activationCodes).limit(1).get();
  if (codes.empty) {
    const adminDoc = await adminDb().collection(Collections.admins).limit(1).get();
    const adminId = adminDoc.docs[0]?.id || "bootstrap";
    const plans = ["weekly", "monthly", "quarterly", "yearly"];
    const all = [];
    for (const planType of plans) {
      const result = await generateCodes({
        planType,
        quantity: 1,
        notes: "Development demo code",
        adminId,
        adminName: name,
      });
      all.push(...result.codes);
    }
    console.log("[Study] Demo activation codes:");
    for (const c of all) {
      console.log(`  ${c.planType.padEnd(10)} ${c.plaintext}`);
    }
    await adminDb().collection(Collections.systemSettings).doc("dev").set({
      demoCodes: all.map((c) => ({
        planType: c.planType,
        plaintext: c.plaintext,
        id: c.id,
      })),
      createdAt: new Date().toISOString(),
    });
  }

  bootstrapped = true;
}

module.exports = { bootstrapIfNeeded, normalizePhone };
