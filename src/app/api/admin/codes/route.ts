import { handleError, jsonOk, parseJson, requireAdmin } from "@/lib/http";
import { generateCodesSchema } from "@/lib/validation";
import { exportCodesXlsx, generateCodes, listCodes } from "@/services/codes";
import type { CodeStatus, PlanType } from "@/types";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const items = await listCodes({
      status: (url.searchParams.get("status") as CodeStatus) || undefined,
      planType: (url.searchParams.get("planType") as PlanType) || undefined,
      search: url.searchParams.get("search") || undefined,
    });
    return jsonOk({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const url = new URL(request.url);
    const body = await parseJson<{
      planType: PlanType;
      quantity: number;
      notes?: string;
      codes?: { plaintext: string; planType: string }[];
    }>(request);
    if (url.searchParams.get("export") === "1" && body.codes) {
      const buffer = exportCodesXlsx(
        body.codes.map((c) => ({
          id: "",
          codeHash: "",
          codePrefix: c.plaintext.slice(0, 10),
          planType: c.planType as PlanType,
          status: "available",
          createdAt: new Date().toISOString(),
          activatedAt: null,
          expiresAt: null,
          activatedByStudentId: null,
          createdByAdminId: admin.uid,
          notes: "",
          batchId: "",
          plaintext: c.plaintext,
        })),
      );
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=stufy-codes.xlsx",
        },
      });
    }
    const data = generateCodesSchema.parse(body);
    const result = await generateCodes({
      ...data,
      adminId: admin.uid,
      adminName: admin.fullName,
    });
    return jsonOk(result, 201);
  } catch (error) {
    return handleError(error);
  }
}
