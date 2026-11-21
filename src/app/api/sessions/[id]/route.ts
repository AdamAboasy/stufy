import { handleError, jsonOk, parseJson, requireStudent } from "@/lib/http";
import { stopSession } from "@/services/plans";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const body = await parseJson<{ complete?: boolean }>(request).catch(() => ({ complete: false }));
    const result = await stopSession(user.uid, id, Boolean(body.complete));
    return jsonOk(result);
  } catch (error) {
    return handleError(error);
  }
}
