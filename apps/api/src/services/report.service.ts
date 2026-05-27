import { eq, and, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { reports, reportTemplates } from "@evv/db";

export async function listReports(tenantId: string) {
  return db.select().from(reports)
    .where(eq(reports.tenantId, tenantId))
    .orderBy(desc(reports.createdAt));
}

export async function getReport(tenantId: string, reportId: string) {
  const [report] = await db.select().from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.tenantId, tenantId)))
    .limit(1);
  return report ?? null;
}

export async function createReport(tenantId: string, data: {
  name: string;
  templateId: string;
  parameters?: Record<string, unknown>;
  initiatedBy: string;
  outputFormat?: string;
}) {
  const [report] = await db.insert(reports).values({
    tenantId,
    name: data.name,
    templateId: data.templateId,
    parameters: data.parameters || {},
    initiatedBy: data.initiatedBy,
    outputFormat: data.outputFormat || "pdf",
    status: "queued",
  }).returning();

  // Simulate async processing - mark as completed immediately for v1
  const [updated] = await db.update(reports)
    .set({ status: "completed", progress: 100, completedAt: new Date(), startedAt: new Date() })
    .where(eq(reports.id, report.id))
    .returning();

  return updated;
}

export async function listReportTemplates(tenantId: string) {
  return db.select().from(reportTemplates)
    .where(eq(reportTemplates.tenantId, tenantId));
}

export async function createReportTemplate(tenantId: string, data: {
  name: string;
  description?: string;
  category?: string;
  queryDefinition: Record<string, unknown>;
}) {
  const [template] = await db.insert(reportTemplates).values({
    tenantId,
    ...data,
  }).returning();
  return template;
}
