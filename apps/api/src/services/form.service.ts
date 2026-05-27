import { eq, and, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { formTemplates, formSubmissions } from "@evv/db";

export async function listFormTemplates(tenantId: string) {
  return db.select().from(formTemplates)
    .where(eq(formTemplates.tenantId, tenantId))
    .orderBy(desc(formTemplates.createdAt));
}

export async function getFormTemplate(tenantId: string, templateId: string) {
  const [template] = await db.select().from(formTemplates)
    .where(and(eq(formTemplates.id, templateId), eq(formTemplates.tenantId, tenantId)))
    .limit(1);
  return template ?? null;
}

export async function createFormTemplate(tenantId: string, data: {
  name: string;
  description?: string;
  category?: string;
  schema: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  requiredForServiceTypes?: string[];
}) {
  const [template] = await db.insert(formTemplates).values({
    tenantId,
    name: data.name,
    description: data.description,
    category: data.category,
    schema: data.schema,
    uiSchema: data.uiSchema,
    requiredForServiceTypes: data.requiredForServiceTypes || [],
  }).returning();
  return template;
}

export async function updateFormTemplate(tenantId: string, templateId: string, data: Partial<{
  name: string;
  description: string;
  category: string;
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
  isActive: boolean;
}>) {
  const [template] = await db.update(formTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(formTemplates.id, templateId), eq(formTemplates.tenantId, tenantId)))
    .returning();
  return template ?? null;
}

export async function listFormSubmissions(tenantId: string, visitId: string) {
  return db.select().from(formSubmissions)
    .where(and(eq(formSubmissions.tenantId, tenantId), eq(formSubmissions.visitId, visitId)));
}

export async function createFormSubmission(tenantId: string, data: {
  visitId: string;
  formTemplateId: string;
  submittedBy: string;
  formData: Record<string, unknown>;
  attachments?: string[];
}) {
  const [submission] = await db.insert(formSubmissions).values({
    tenantId,
    visitId: data.visitId,
    formTemplateId: data.formTemplateId,
    submittedBy: data.submittedBy,
    data: data.formData,
    attachments: data.attachments || [],
    status: "submitted",
    submittedAt: new Date(),
  }).returning();
  return submission;
}
