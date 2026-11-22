const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

async function main() {
  const uid = process.env.SUPER_ADMIN_UID;
  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!uid && !email) throw new Error("Set SUPER_ADMIN_UID or SUPER_ADMIN_EMAIL to promote an administrator.");
  if (uid && email) throw new Error("Provide only one of SUPER_ADMIN_UID or SUPER_ADMIN_EMAIL.");

  initializeApp({ projectId: process.env.GCLOUD_PROJECT || "study-managment-45332" });
  const auth = getAuth();
  let targetUid = uid;
  if (!targetUid) {
    if (email.trim().length === 0) throw new Error("SUPER_ADMIN_EMAIL must not be empty.");
    const record = await auth.getUserByEmail(email.trim());
    targetUid = record.uid;
  }
  const user = await auth.getUser(targetUid);
  await auth.setCustomUserClaims(targetUid, { ...user.customClaims, role: "super_admin" });
  await getFirestore().doc(`users/${targetUid}`).set({ uid: targetUid, role: "super_admin", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Super Admin claim set for UID ${targetUid}. The user must refresh their Firebase ID token.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
