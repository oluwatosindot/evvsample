import { pgTable, uuid, varchar, timestamp, text, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { visits } from "./visits";

export const formTemplates = pgTable("form_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  schema: jsonb("schema").notNull(),
  uiSchema: jsonb("ui_schema"),
  requiredForServiceTypes: jsonb("required_for_service_types").$type<string[]>().default([]),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  visitId: uuid("visit_id").notNull().references(() => visits.id),
  formTemplateId: uuid("form_template_id").notNull().references(() => formTemplates.id),
  submittedBy: uuid("submitted_by").notNull().references(() => users.id),
  data: jsonb("data").notNull(),
  attachments: jsonb("attachments").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
