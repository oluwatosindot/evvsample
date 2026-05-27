import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../lib/db";
import { workers, users } from "@evv/db";
import type { CreateWorkerInput, UpdateWorkerInput } from "@evv/shared";
import bcrypt from "bcryptjs";

export async function listWorkers(tenantId: string, search?: string) {
  const conditions = [eq(workers.tenantId, tenantId)];
  if (search) {
    conditions.push(
      or(
        ilike(workers.firstName, `%${search}%`),
        ilike(workers.lastName, `%${search}%`),
        ilike(workers.email, `%${search}%`)
      )!
    );
  }
  return db.select().from(workers).where(and(...conditions));
}

export async function getWorker(tenantId: string, workerId: string) {
  const [worker] = await db
    .select()
    .from(workers)
    .where(and(eq(workers.id, workerId), eq(workers.tenantId, tenantId)))
    .limit(1);
  return worker ?? null;
}

export async function createWorker(tenantId: string, input: CreateWorkerInput) {
  const passwordHash = await bcrypt.hash("changeme123!", 10);
  const [user] = await db.insert(users).values({
    tenantId,
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    role: "field_worker",
  }).returning();

  const [worker] = await db.insert(workers).values({
    tenantId,
    userId: user.id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    position: input.position,
    employmentType: input.employmentType,
    hireDate: input.hireDate,
    skills: input.skills || [],
    languages: input.languages || [],
    address: input.address,
  }).returning();

  return worker;
}

export async function updateWorker(tenantId: string, workerId: string, input: UpdateWorkerInput) {
  const [worker] = await db
    .update(workers)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(workers.id, workerId), eq(workers.tenantId, tenantId)))
    .returning();
  return worker ?? null;
}
