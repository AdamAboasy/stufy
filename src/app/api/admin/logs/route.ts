import { handleError, jsonOk, requireAdmin } from "@/lib/http";
import { listLogs } from "@/services/logs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const result = await listLogs(50, url.searchParams.get("cursor") || undefined);
    return jsonOk(result);
  } catch (error) {
    return handleError(error);
  }
}
