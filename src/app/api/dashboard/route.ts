import { handleError, jsonOk, requireStudent, getStudent } from "@/lib/http";
import { listTasks, listPlans, markOverdue } from "@/services/plans";
import { listNotifications } from "@/services/notifications";
import { getStudentSubscription } from "@/services/subscriptions";
import { studentStats } from "@/services/stats";
import { ymdInZone } from "@/lib/utils";

export async function GET() {
  try {
    const user = await requireStudent();
    const profile = await getStudent(user.uid);
    await markOverdue(user.uid, profile.timezone);
    const today = ymdInZone(new Date(), profile.timezone);
    const [tasks, plans, notifications, subscription, stats] = await Promise.all([
      listTasks(user.uid, { date: today }),
      listPlans(user.uid),
      listNotifications(user.uid, 8),
      getStudentSubscription(user.uid),
      studentStats(user.uid, profile.timezone),
    ]);
    const overdue = await listTasks(user.uid, { status: "delayed" });
    return jsonOk({
      profile,
      today,
      todayTasks: tasks,
      overdueTasks: overdue.slice(0, 8),
      plans: plans.filter((p) => p.status === "active").slice(0, 5),
      notifications,
      subscription,
      stats,
    });
  } catch (error) {
    return handleError(error);
  }
}
