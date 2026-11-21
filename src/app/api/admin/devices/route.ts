import { handleError, jsonOk, parseJson, requireAdmin } from "@/lib/http";
import { listDeviceRequests, resolveDeviceRequest } from "@/services/devices";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const items = await listDeviceRequests(url.searchParams.get("status") || undefined);
    return jsonOk({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await parseJson<{ requestId: string; approve: boolean; note?: string }>(request);
    const result = await resolveDeviceRequest({
      requestId: body.requestId,
      approve: body.approve,
      adminId: admin.uid,
      adminName: admin.fullName,
      note: body.note,
    });
    return jsonOk(result);
  } catch (error) {
    return handleError(error);
  }
}
