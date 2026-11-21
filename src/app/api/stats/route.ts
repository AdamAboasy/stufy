import { handleError, jsonOk, requireStudent, getStudent } from "@/lib/http";
import { studentStats } from "@/services/stats";

export async function GET() {
  try {
    const user = await requireStudent();
    const profile = await getStudent(user.uid);
    const stats = await studentStats(user.uid, profile.timezone);
    return jsonOk(stats);
  } catch (error) {
    return handleError(error);
  }
}
