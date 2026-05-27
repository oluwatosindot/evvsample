import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { industryPlugins, tenants } from "@evv/db";

export async function listPlugins() {
  return db.select().from(industryPlugins);
}

export async function getPlugin(pluginId: string) {
  const [plugin] = await db.select().from(industryPlugins)
    .where(eq(industryPlugins.id, pluginId))
    .limit(1);
  return plugin ?? null;
}

export async function getTenantSettings(tenantId: string) {
  const [tenant] = await db.select().from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return tenant ?? null;
}

export async function updateTenantSettings(tenantId: string, settings: Record<string, unknown>) {
  const [tenant] = await db.update(tenants)
    .set({ settings, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId))
    .returning();
  return tenant ?? null;
}
