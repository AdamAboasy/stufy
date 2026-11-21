import { handleError, jsonOk, parseJson, requireStudent } from "@/lib/http";
import { applyReschedule, getPlan, listTasks, proposeReschedule } from "@/services/plans";
import type { PlanPreview } from "@/types";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const plan = await getPlan(user.uid, id);
    const tasks = await listTasks(user.uid, { planId: id });
    return jsonOk({ plan, tasks });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    if (action === "reschedule") {
      const proposal = await proposeReschedule(user.uid, id);
      return jsonOk({ proposal });
    }
    if (action === "apply") {
      const body = await parseJson<{ preview: PlanPreview }>(request);
      await applyReschedule(user.uid, id, body.preview);
      return jsonOk({ applied: true });
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
