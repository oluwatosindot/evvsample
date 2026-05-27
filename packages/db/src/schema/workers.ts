import { pgTable, uuid, varchar, timestamp, date, jsonb, text, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const workers = pgTable("workers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  employmentType: varchar("employment_type", { length: 20 }).notNull().default("employee"),
  hireDate: date("hire_date"),
  terminationDate: date("termination_date"),
  managerId: uuid("manager_id"),
  skills: jsonb("skills").$type<string[]>().default([]),
  languages: jsonb("languages").$type<string[]>().default([]),
  customFields: jsonb("custom_fields").default({}),
  address: jsonb("address").$type<{
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskTypes = pgTable("task_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  recurrence: varchar("recurrence", { length: 20 }).notNull().default("once"),
  recurrenceDays: varchar("recurrence_days", { length: 10 }),
  requiresDocument: boolean("requires_document").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workforceTasks = pgTable("workforce_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  workerId: uuid("worker_id").notNull().references(() => workers.id),
  taskTypeId: uuid("task_type_id").notNull().references(() => taskTypes.id),
  status: varchar("status", { length: 30 }).notNull().default("upcoming"),
  reason: text("reason"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedDate: date("completed_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const credentials = pgTable("credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  workerId: uuid("worker_id").notNull().references(() => workers.id),
  credentialTypeId: uuid("credential_type_id").notNull().references(() => taskTypes.id),
  status: varchar("status", { length: 30 }).notNull().default("pending_verification"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  documentUrl: varchar("document_url", { length: 500 }),
  verifiedBy: uuid("verified_by"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
