import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, Collections, useEmulators, useLocalBackend } from "@/lib/firebase/admin";
import { phoneToAuthEmail, restSignUp } from "@/lib/auth/firebase-rest";
import { generateCodes } from "@/services/codes";
import { normalizePhone } from "@/lib/validation";
import type { PlanType } from "@/types";

let bootstrapped = false;

async function waitForEmulators(retries = 80) {
  if (!useEmulators()) return;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch("http://127.0.0.1:8080");
      if (res.ok || res.status === 404) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Firebase emulators are not reachable on 127.0.0.1:8080");
}

export async function bootstrapIfNeeded() {
  if (bootstrapped) return;
  try {
    await waitForEmulators();
  } catch (error) {
    if (!useLocalBackend()) {
      console.warn("[stufy] bootstrap skipped:", (error as Error).message);
      return;
    }
  }

  const phone = normalizePhone(process.env.ADMIN_BOOTSTRAP_PHONE || "+201000000000");
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || "Admin@123456";
  const name = process.env.ADMIN_BOOTSTRAP_NAME || "Super Admin";
  const email = phoneToAuthEmail(phone);

  const existing = await adminDb().collection(Collections.admins).limit(1).get();
  if (existing.empty) {
    let uid = "";
    try {
      const created = await restSignUp(email, password);
      uid = created.uid;
    } catch (error) {
      const message = (error as Error).message;
      if (message === "EMAIL_EXISTS") {
        const user = await adminAuth().getUserByEmail(email);
        uid = user.uid;
      } else {
        console.warn("[stufy] admin bootstrap failed:", message);
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
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`[stufy] Super Admin ready. Phone: ${phone}`);
  }

  const codes = await adminDb().collection(Collections.activationCodes).limit(1).get();
  if (codes.empty) {
    const adminDoc = await adminDb().collection(Collections.admins).limit(1).get();
    const adminId = adminDoc.docs[0]?.id || "bootstrap";
    const plans: PlanType[] = ["weekly", "monthly", "quarterly", "yearly"];
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
    console.log("[stufy] Demo activation codes:");
    for (const c of all) {
      console.log(`  ${c.planType.padEnd(10)} ${c.plaintext}`);
    }
    await adminDb().collection(Collections.systemSettings).doc("dev").set({
      demoCodes: all.map((c) => ({
        planType: c.planType,
        plaintext: c.plaintext,
        id: c.id,
      })),
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  bootstrapped = true;
}
