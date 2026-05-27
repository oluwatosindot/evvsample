import { pgTable, uuid, varchar, timestamp, text, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const reportTemplates = pgTable("report_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  queryDefinition: jsonb("query_definition").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  templateId: uuid("template_id").notNull().references(() => reportTemplates.id),
  parameters: jsonb("parameters"),
  status: varchar("status", { length: 20 }).notNull().default("queued"),
  initiatedBy: uuid("initiated_by").notNull().references(() => users.id),
  queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  outputFormat: varchar("output_format", { length: 10 }).notNull().default("pdf"),
  outputUrl: varchar("output_url", { length: 500 }),
  progress: integer("progress").notNull().default(0),
  outcome: text("outcome"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
