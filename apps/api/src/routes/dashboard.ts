import { Hono } from "hono";
import { eq, and, gte, lte } from "drizzle-orm";
import { getAuth } from "../middleware/auth";
import { db } from "../lib/db";
import { visits, workers, workforceTasks } from "@evv/db";

export const dashboardRoutes = new Hono();

dashboardRoutes.get("/metrics", async (c) => {
  const { tenantId } = getAuth(c);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000);

  const allVisits = await db.select().from(visits).where(eq(visits.tenantId, tenantId));
  const allWorkers = await db.select().from(workers).where(and(eq(workers.tenantId, tenantId), eq(workers.status, "active")));

  const visitsToday = allVisits.filter(v => {
    const s = new Date(v.scheduledStart);
    return s >= todayStart && s < todayEnd;
  }).length;

  const visitsThisWeek = allVisits.filter(v => {
    const s = new Date(v.scheduledStart);
    return s >= weekStart && s < todayEnd;
  }).length;

  const verified = allVisits.filter(v => v.verificationStatus === "verified").length;
  const complianceRate = allVisits.length > 0 ? Math.round((verified / allVisits.length) * 100) : 0;

  const alertCount = allVisits.filter(v =>
    v.verificationStatus === "missed_visit" ||
    v.verificationStatus === "check_in_missed" ||
    v.verificationStatus === "check_out_missed"
  ).length;

  return c.json({
    data: {
      visitsToday,
      visitsThisWeek,
      complianceRate,
      activeWorkers: allWorkers.length,
      alertCount,
    },
  });
});

dashboardRoutes.get("/tasks", async (c) => {
  const { tenantId } = getAuth(c);
  const tasks = await db.select().from(workforceTasks).where(eq(workforceTasks.tenantId, tenantId));
  return c.json({ data: tasks });
});
