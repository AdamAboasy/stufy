import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb, Collections, serializeDoc } from "@/lib/firebase/admin";
import { PLAN_DURATIONS } from "@/lib/constants";
import { ApiError } from "@/lib/http";
import { writeLog } from "@/services/logs";
import { notifyStudent } from "@/services/notifications";
import type { PlanType, Subscription, SubscriptionStatus } from "@/types";

export function expirationFrom(start: Date, planType: PlanType) {
  return new Date(start.getTime() + PLAN_DURATIONS[planType] * 86_400_000);
}

export function computeRenewalExpiration(currentExpiresAt: Date, planType: PlanType, now = new Date()) {
  if (now.getTime() < currentExpiresAt.getTime()) {
    return new Date(currentExpiresAt.getTime() + PLAN_DURATIONS[planType] * 86_400_000);
  }
  return expirationFrom(now, planType);
}

export async function getStudentSubscription(studentId: string) {
  const snap = await adminDb()
    .collection(Collections.subscriptions)
    .where("studentId", "==", studentId)
    .limit(5)
    .get();
  if (snap.empty) return null;
  const items = snap.docs.map((d) => serializeDoc<Subscription>(d.id, d.data()));
  items.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return items[0];
}

export async function assertActiveSubscription(studentId: string) {
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

export async function listSubscriptions(status?: SubscriptionStatus) {
  let q: FirebaseFirestore.Query = adminDb().collection(Collections.subscriptions);
  if (status) q = q.where("status", "==", status);
  const snap = await q.limit(200).get();
  return snap.docs.map((d) => serializeDoc<Subscription>(d.id, d.data()));
}

export async function renewSubscription(input: {
  subscriptionId: string;
  planType: PlanType;
  adminId: string;
  adminName: string;
}) {
  const ref = adminDb().collection(Collections.subscriptions).doc(input.subscriptionId);
  const result = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Subscription not found.", 404);
    const data = snap.data()!;
    if (data.status === "revoked") {
      throw new ApiError("INVALID", "A revoked subscription cannot be renewed.");
    }
    const currentExp = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
    const next = computeRenewalExpiration(currentExp, input.planType);
    tx.update(ref, {
      planType: input.planType,
      expiresAt: Timestamp.fromDate(next),
      status: "active",
      renewedAt: FieldValue.serverTimestamp(),
    });
    return {
      id: snap.id,
      studentId: data.studentId as string,
      activationCodeId: data.activationCodeId as string,
      planType: input.planType,
      startedAt: data.startedAt?.toDate?.().toISOString?.() || data.startedAt,
      expiresAt: next.toISOString(),
      status: "active" as const,
      renewedAt: new Date().toISOString(),
    } satisfies Subscription;
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

export async function setSubscriptionStatus(
  subscriptionId: string,
  status: Extract<SubscriptionStatus, "suspended" | "revoked" | "active">,
  admin: { uid: string; fullName: string },
) {
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
