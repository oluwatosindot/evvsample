import { Hono } from "hono";
import { getAuth } from "../middleware/auth";
import * as notificationService from "../services/notification.service";

export const notificationRoutes = new Hono();

notificationRoutes.get("/", async (c) => {
  const { tenantId, userId } = getAuth(c);
  const notifications = await notificationService.listNotifications(tenantId, userId);
  return c.json({ data: notifications });
});

notificationRoutes.get("/unread-count", async (c) => {
  const { tenantId, userId } = getAuth(c);
  const count = await notificationService.getUnreadCount(tenantId, userId);
  return c.json({ data: { count } });
});

notificationRoutes.patch("/:id/read", async (c) => {
  const { tenantId } = getAuth(c);
  const notification = await notificationService.markRead(tenantId, c.req.param("id"));
  if (!notification) return c.json({ error: "Notification not found" }, 404);
  return c.json({ data: notification });
});
