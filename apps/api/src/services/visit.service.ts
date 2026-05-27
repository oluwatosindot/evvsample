import { eq, and, between, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { visits } from "@evv/db";
import type { CreateVisitInput, UpdateVisitInput, CheckInInput, CheckOutInput } from "@evv/shared";

export async function listVisits(tenantId: string, filters?: {
  status?: string;
  workerId?: string;
  recipientId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const conditions = [eq(visits.tenantId, tenantId)];
  if (filters?.status) conditions.push(eq(visits.verificationStatus, filters.status));
  if (filters?.workerId) conditions.push(eq(visits.workerId, filters.workerId));
  if (filters?.recipientId) conditions.push(eq(visits.serviceRecipientId, filters.recipientId));
  if (filters?.dateFrom && filters?.dateTo) {
    conditions.push(between(visits.scheduledStart, new Date(filters.dateFrom), new Date(filters.dateTo)));
  }
  return db.select().from(visits).where(and(...conditions)).orderBy(desc(visits.scheduledStart));
}

export async function getVisit(tenantId: string, visitId: string) {
  const [visit] = await db.select().from(visits)
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .limit(1);
  return visit ?? null;
}

export async function createVisit(tenantId: string, input: CreateVisitInput) {
  const [visit] = await db.insert(visits).values({
    tenantId,
    serviceRecipientId: input.serviceRecipientId,
    workerId: input.workerId,
    serviceTypeId: input.serviceTypeId,
    label: input.label,
    scheduledStart: new Date(input.scheduledStart),
    scheduledEnd: new Date(input.scheduledEnd),
    scheduledUnits: input.scheduledUnits,
    notes: input.notes,
  }).returning();
  return visit;
}

export async function updateVisit(tenantId: string, visitId: string, input: UpdateVisitInput) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.scheduledStart) updateData.scheduledStart = new Date(input.scheduledStart);
  if (input.scheduledEnd) updateData.scheduledEnd = new Date(input.scheduledEnd);
  if (input.workerId) updateData.workerId = input.workerId;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.label !== undefined) updateData.label = input.label;

  const [visit] = await db.update(visits)
    .set(updateData)
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return visit ?? null;
}

export async function checkIn(tenantId: string, visitId: string, input: CheckInInput) {
  const [visit] = await db.update(visits)
    .set({
      actualStart: new Date(),
      checkInMethod: input.method,
      checkInLat: String(input.lat),
      checkInLng: String(input.lng),
      checkInAccuracy: input.accuracy ? String(input.accuracy) : null,
      verificationStatus: "verified",
      updatedAt: new Date(),
    })
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return visit ?? null;
}

export async function checkOut(tenantId: string, visitId: string, input: CheckOutInput) {
  const visit = await getVisit(tenantId, visitId);
  if (!visit || !visit.actualStart) return null;

  const actualEnd = new Date();
  const durationHours = (actualEnd.getTime() - new Date(visit.actualStart).getTime()) / (1000 * 60 * 60);

  const [updated] = await db.update(visits)
    .set({
      actualEnd,
      checkOutMethod: input.method,
      checkOutLat: String(input.lat),
      checkOutLng: String(input.lng),
      checkOutAccuracy: input.accuracy ? String(input.accuracy) : null,
      actualUnits: String(Math.round(durationHours * 100) / 100),
      verificationStatus: "verified",
      updatedAt: new Date(),
    })
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return updated ?? null;
}

export async function deleteVisit(tenantId: string, visitId: string) {
  const [visit] = await db.delete(visits)
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return visit ?? null;
}
