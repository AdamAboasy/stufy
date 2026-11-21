import { handleError, jsonOk, parseJson, requireStudent } from "@/lib/http";
import { assertActiveSubscription } from "@/services/subscriptions";
import { listPlans, previewPlan, savePlan } from "@/services/plans";
import { generatePlanSchema } from "@/lib/validation";
import type { PlanPreview } from "@/types";

export async function GET() {
  try {
    const user = await requireStudent();
    const items = await listPlans(user.uid);
    return jsonOk({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStudent();
    await assertActiveSubscription(user.uid);
    const url = new URL(request.url);
    const body = await parseJson<Record<string, unknown>>(request);
    if (url.searchParams.get("preview") === "1") {
      const data = generatePlanSchema.parse(body);
      const preview = await previewPlan(user.uid, data);
      return jsonOk({ preview });
    }
    const preview = body.preview as PlanPreview;
    const fileId = String(body.fileId || "");
    const saved = await savePlan(user.uid, preview, fileId);
    return jsonOk(saved, 201);
  } catch (error) {
    return handleError(error);
  }
}
