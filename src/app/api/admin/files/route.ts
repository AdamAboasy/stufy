import { handleError, jsonOk, requireAdmin } from "@/lib/http";
import { listAllJobs } from "@/services/files";

export async function GET() {
  try {
    await requireAdmin();
    const items = await listAllJobs();
    return jsonOk({ items });
  } catch (error) {
    return handleError(error);
  }
}
