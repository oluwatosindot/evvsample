import { eq, and, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { notifications } from "@evv/db";

export async function listNotifications(tenantId: string, userId: string) {
  return db.select().from(notifications)
    .where(and(eq(notifications.tenantId, tenantId), eq(notifications.userId, userId)))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadCount(tenantId: string, userId: string) {
  const unread = await db.select().from(notifications)
    .where(and(
      eq(notifications.tenantId, tenantId),
      eq(notifications.userId, userId),
      eq(notifications.read, false)
    ));
  return unread.length;
}

export async function markRead(tenantId: string, notificationId: string) {
  const [notification] = await db.update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.tenantId, tenantId)))
    .returning();
  return notification ?? null;
}

export async function createNotification(tenantId: string, data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  channels?: string[];
}) {
  const [notification] = await db.insert(notifications).values({
    tenantId,
    ...data,
    channels: data.channels || ["in_app"],
  }).returning();
  return notification;
}
