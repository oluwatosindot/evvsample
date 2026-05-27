import { eq, and, ilike } from "drizzle-orm";
import { db } from "../lib/db";
import { serviceRecipients, serviceAgreements, serviceTypes } from "@evv/db";
import type { CreateRecipientInput, UpdateRecipientInput, CreateServiceAgreementInput, CreateServiceTypeInput } from "@evv/shared";

export async function listRecipients(tenantId: string, search?: string) {
  const conditions = [eq(serviceRecipients.tenantId, tenantId)];
  if (search) {
    conditions.push(ilike(serviceRecipients.name, `%${search}%`));
  }
  return db.select().from(serviceRecipients).where(and(...conditions));
}

export async function getRecipient(tenantId: string, id: string) {
  const [recipient] = await db.select().from(serviceRecipients)
    .where(and(eq(serviceRecipients.id, id), eq(serviceRecipients.tenantId, tenantId)))
    .limit(1);
  return recipient ?? null;
}

export async function createRecipient(tenantId: string, input: CreateRecipientInput) {
  const [recipient] = await db.insert(serviceRecipients).values({
    tenantId,
    ...input,
    tags: input.tags || [],
  }).returning();
  return recipient;
}

export async function updateRecipient(tenantId: string, id: string, input: UpdateRecipientInput) {
  const [recipient] = await db.update(serviceRecipients)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(serviceRecipients.id, id), eq(serviceRecipients.tenantId, tenantId)))
    .returning();
  return recipient ?? null;
}

export async function listAgreements(tenantId: string, recipientId: string) {
  return db.select().from(serviceAgreements)
    .where(and(eq(serviceAgreements.tenantId, tenantId), eq(serviceAgreements.serviceRecipientId, recipientId)));
}

export async function createAgreement(tenantId: string, recipientId: string, input: CreateServiceAgreementInput) {
  const [agreement] = await db.insert(serviceAgreements).values({
    tenantId,
    serviceRecipientId: recipientId,
    ...input,
  }).returning();
  return agreement;
}

export async function listServiceTypes(tenantId: string) {
  return db.select().from(serviceTypes).where(eq(serviceTypes.tenantId, tenantId));
}

export async function createServiceType(tenantId: string, input: CreateServiceTypeInput) {
  const [type] = await db.insert(serviceTypes).values({
    tenantId,
    ...input,
    verificationMethods: input.verificationMethods || ["gps"],
  }).returning();
  return type;
}
