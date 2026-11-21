import { handleError, jsonOk, parseJson, requireStudent } from "@/lib/http";
import { listRoutines, upsertRoutine } from "@/services/routines";
import { routineSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireStudent();
    const items = await listRoutines(user.uid);
    return jsonOk({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStudent();
    const body = routineSchema.parse(await parseJson(request));
    const item = await upsertRoutine(user.uid, {
      title: body.title,
      startTime: body.startTime,
      endTime: body.endTime,
      repeatType: body.repeatType,
      repeatDays: body.repeatDays,
      customDates: body.customDates,
      description: body.description,
      isActive: body.isActive ?? true,
    });
    return jsonOk({ item }, 201);
  } catch (error) {
    return handleError(error);
  }
}
