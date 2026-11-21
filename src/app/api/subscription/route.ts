import { handleError, jsonOk, requireStudent } from "@/lib/http";
import { getStudentSubscription } from "@/services/subscriptions";

export async function GET() {
  try {
    const user = await requireStudent();
    const subscription = await getStudentSubscription(user.uid);
    return jsonOk({ subscription });
  } catch (error) {
    return handleError(error);
  }
}
