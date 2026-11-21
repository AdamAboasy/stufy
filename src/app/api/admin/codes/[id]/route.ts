import { handleError, jsonOk, parseJson, requireAdmin } from "@/lib/http";
import { decryptCode, updateCodeStatus } from "@/services/codes";
import type { CodeStatus } from "@/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await parseJson<{ status: CodeStatus; reveal?: boolean }>(request);
    if (body.reveal) {
      const plaintext = await decryptCode(id);
      return jsonOk({ plaintext });
    }
    await updateCodeStatus(id, body.status as "revoked" | "suspended" | "available", admin);
    return jsonOk({ updated: true });
  } catch (error) {
    return handleError(error);
  }
}
