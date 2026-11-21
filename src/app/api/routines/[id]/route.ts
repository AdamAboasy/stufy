import { handleError, jsonOk, parseJson, requireStudent } from "@/lib/http";
import { deleteRoutine, upsertRoutine } from "@/services/routines";
import { routineSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    const body = routineSchema.parse(await parseJson(request));
    const item = await upsertRoutine(
      user.uid,
      {
        title: body.title,
        startTime: body.startTime,
        endTime: body.endTime,
        repeatType: body.repeatType,
        repeatDays: body.repeatDays,
        customDates: body.customDates,
        description: body.description,
        isActive: body.isActive ?? true,
      },
      id,
    );
    return jsonOk({ item });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStudent();
    const { id } = await params;
    await deleteRoutine(user.uid, id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
