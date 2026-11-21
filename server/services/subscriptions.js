"use strict";

const { adminDb, Collections } = require("../db");
const { PLAN_DURATIONS } = require("../constants");
const { ApiError } = require("../errors");
const { writeLog } = require("./logs");
const { notifyStudent } = require("./notifications");

function expirationFrom(start, planType) {
  return new Date(start.getTime() + PLAN_DURATIONS[planType] * 86400000);
}

function computeRenewalExpiration(currentExpiresAt, planType, now = new Date()) {
  if (now.getTime() < currentExpiresAt.getTime()) {
    return new Date(currentExpiresAt.getTime() + PLAN_DURATIONS[planType] * 86400000);
  }
  return expirationFrom(now, planType);
}

async function getStudentSubscription(studentId) {
  const snap = await adminDb()
    .collection(Collections.subscriptions)
    .where("studentId", "==", studentId)
    .limit(5)
    .get();
  if (snap.empty) return null;
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  items.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return items[0];
}

async function assertActiveSubscription(studentId) {
  const sub = await getStudentSubscription(studentId);
  if (!sub) throw new ApiError("NO_SUBSCRIPTION", "No subscription found.", 403);
  const expired = new Date(sub.expiresAt).getTime() <= Date.now();
  if (expired && sub.status === "active") {
    await adminDb().collection(Collections.subscriptions).doc(sub.id).update({
      status: "expired",
    });
    await notifyStudent({
      studentId,
      type: "subscription_expired",
      title: "Subscription expired",
      body: "Your subscription has expired. Uploaded files and history are kept, but planning features are locked.",
      link: "/subscription",
    });
    throw new ApiError("SUBSCRIPTION_EXPIRED", "Your subscription has expired.", 403);
  }
  if (sub.status !== "active") {
    throw new ApiError("SUBSCRIPTION_INACTIVE", `Subscription is ${sub.status}.`, 403);
  }
  return sub;
}

async function listSubscriptions(status) {
  let q = adminDb().collection(Collections.subscriptions);
  if (status) q = q.where("status", "==", status);
  const snap = await q.limit(200).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function renewSubscription(input) {
  const ref = adminDb().collection(Collections.subscriptions).doc(input.subscriptionId);
  const result = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Subscription not found.", 404);
    const data = snap.data();
    if (data.status === "revoked") {
      throw new ApiError("INVALID", "A revoked subscription cannot be renewed.");
    }
    const currentExp = data.expiresAt ? new Date(data.expiresAt) : new Date();
    const next = computeRenewalExpiration(currentExp, input.planType);
    tx.update(ref, {
      planType: input.planType,
      expiresAt: next.toISOString(),
      status: "active",
      renewedAt: new Date().toISOString(),
    });
    return {
      id: snap.id,
      studentId: data.studentId,
      activationCodeId: data.activationCodeId,
      planType: input.planType,
      startedAt: data.startedAt,
      expiresAt: next.toISOString(),
      status: "active",
      renewedAt: new Date().toISOString(),
    };
  });
  await writeLog({
    actorId: input.adminId,
    actorRole: "admin",
    actorName: input.adminName,
    action: "subscription.renew",
    targetId: input.subscriptionId,
    metadata: { planType: input.planType },
  });
  await notifyStudent({
    studentId: result.studentId,
    type: "generic",
    title: "Subscription renewed",
    body: `Your ${input.planType} plan was renewed.`,
    link: "/subscription",
  });
  return result;
}

async function setSubscriptionStatus(subscriptionId, status, admin) {
  const ref = adminDb().collection(Collections.subscriptions).doc(subscriptionId);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError("NOT_FOUND", "Subscription not found.", 404);
  await ref.update({ status });
  await writeLog({
    actorId: admin.uid,
    actorRole: "admin",
    actorName: admin.fullName,
    action: `subscription.${status}`,
    targetId: subscriptionId,
  });
}

module.exports = {
  expirationFrom,
  computeRenewalExpiration,
  getStudentSubscription,
  assertActiveSubscription,
  listSubscriptions,
  renewSubscription,
  setSubscriptionStatus,
};
