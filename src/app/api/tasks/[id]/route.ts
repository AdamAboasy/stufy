import { handleError, jsonOk, parseJson, requireStudent } from "@/lib/http";
import { deleteTask, startSession, updateTask } from "@/services/plans";
import { updateTaskSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const body = updateTaskSchema.parse(await parseJson(request));
    const task = await updateTask(user.uid, id, body);
    return jsonOk({ task });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    await deleteTask(user.uid, id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const session = await startSession(user.uid, id);
    return jsonOk(session);
  } catch (error) {
    return handleError(error);
  }
}
