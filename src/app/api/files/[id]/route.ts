import { handleError, jsonOk, requireStudent } from "@/lib/http";
import { deleteFile, getExtraction, getFile, retryFile } from "@/services/files";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const file = await getFile(user.uid, id);
    const extraction = await getExtraction(user.uid, id);
    return jsonOk({ file, extraction });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    await deleteFile(user.uid, id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const url = new URL(request.url);
    if (url.searchParams.get("action") === "retry") {
      await retryFile(user.uid, id);
      return jsonOk({ retried: true });
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
