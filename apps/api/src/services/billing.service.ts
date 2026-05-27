import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { visits } from "@evv/db";

export async function getBillingWorklist(tenantId: string, status?: string) {
  const conditions = [eq(visits.tenantId, tenantId)];
  if (status) conditions.push(eq(visits.billingStatus, status));
  return db.select().from(visits).where(and(...conditions));
}

export async function updateBillingStatus(tenantId: string, visitId: string, status: string) {
  const [visit] = await db.update(visits)
    .set({ billingStatus: status, updatedAt: new Date() })
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return visit ?? null;
}

export async function getBillingSummary(tenantId: string) {
  const allVisits = await db.select().from(visits).where(eq(visits.tenantId, tenantId));
  const summary: Record<string, { count: number }> = {};
  for (const v of allVisits) {
    if (!summary[v.billingStatus]) summary[v.billingStatus] = { count: 0 };
    summary[v.billingStatus].count++;
  }
  return summary;
}
