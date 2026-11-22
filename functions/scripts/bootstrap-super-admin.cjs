const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

async function main() {
  const uid = process.env.SUPER_ADMIN_UID;
  if (!uid) throw new Error("Set SUPER_ADMIN_UID to the existing Firebase Auth UID to promote.");
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || "study-managment-45332" });
  const auth = getAuth();
  const user = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, { ...user.customClaims, role: "super_admin" });
  await getFirestore().doc(`users/${uid}`).set({ uid, role: "super_admin", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Super Admin claim set for UID ${uid}. The user must refresh their Firebase ID token.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
