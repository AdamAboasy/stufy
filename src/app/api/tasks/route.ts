import { handleError, jsonOk, parseJson, requireStudent } from "@/lib/http";
import { addTask, listTasks, markOverdue } from "@/services/plans";
import { getStudent } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireStudent();
    const profile = await getStudent(user.uid);
    await markOverdue(user.uid, profile.timezone || "Africa/Cairo");
    const url = new URL(request.url);
    const items = await listTasks(user.uid, {
      planId: url.searchParams.get("planId") || undefined,
      date: url.searchParams.get("date") || undefined,
      status: url.searchParams.get("status") || undefined,
    });
    return jsonOk({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStudent();
    const body = await parseJson<{
      planId: string;
      title: string;
      scheduledDate: string;
      estimatedDuration: number;
      chapter?: string;
      pageStart?: number;
      pageEnd?: number;
    }>(request);
    const task = await addTask(user.uid, body);
    return jsonOk({ task }, 201);
  } catch (error) {
    return handleError(error);
  }
}
