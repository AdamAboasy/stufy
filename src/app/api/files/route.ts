import { handleError, jsonOk, requireStudent, ApiError } from "@/lib/http";
import { assertActiveSubscription } from "@/services/subscriptions";
import { listFiles, uploadStudentFile } from "@/services/files";

export async function GET() {
  try {
    const user = await requireStudent();
    const items = await listFiles(user.uid);
    return jsonOk({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStudent();
    await assertActiveSubscription(user.uid);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("INVALID", "A file is required.");
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadStudentFile({
      studentId: user.uid,
      filename: file.name,
      buffer,
    });
    return jsonOk({ file: uploaded }, 201);
  } catch (error) {
    return handleError(error);
  }
}
