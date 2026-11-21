import { handleError, jsonOk, parseJson, requireAdmin } from "@/lib/http";
import { listSubscriptions, renewSubscription, setSubscriptionStatus } from "@/services/subscriptions";
import type { PlanType, SubscriptionStatus } from "@/types";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const items = await listSubscriptions((url.searchParams.get("status") as SubscriptionStatus) || undefined);
    return jsonOk({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await parseJson<{
      subscriptionId: string;
      action: "renew" | "suspend" | "revoke" | "activate";
      planType?: PlanType;
    }>(request);
    if (body.action === "renew") {
      const result = await renewSubscription({
        subscriptionId: body.subscriptionId,
        planType: body.planType || "monthly",
        adminId: admin.uid,
        adminName: admin.fullName,
      });
      return jsonOk({ subscription: result });
    }
    const status =
      body.action === "suspend" ? "suspended" : body.action === "revoke" ? "revoked" : "active";
    await setSubscriptionStatus(body.subscriptionId, status, admin);
    return jsonOk({ updated: true });
  } catch (error) {
    return handleError(error);
  }
}
