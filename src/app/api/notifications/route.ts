import { handleError, jsonOk, parseJson, requireStudent } from "@/lib/http";
import { listNotifications, markAllRead, markNotificationRead } from "@/services/notifications";

export async function GET() {
  try {
    const user = await requireStudent();
    const items = await listNotifications(user.uid, 60);
    return jsonOk({ items, unread: items.filter((n) => !n.read).length });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireStudent();
    const body = await parseJson<{ id?: string; all?: boolean }>(request);
    if (body.all) {
      const count = await markAllRead(user.uid);
      return jsonOk({ count });
    }
    if (body.id) await markNotificationRead(user.uid, body.id);
    return jsonOk({ read: true });
  } catch (error) {
    return handleError(error);
  }
}
