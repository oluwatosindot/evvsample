import { pgTable, uuid, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 100 }).notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  permissions: jsonb("permissions").$type<{ resource: string; action: string; scope: string }[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const externalContacts = pgTable("external_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  roleLabel: varchar("role_label", { length: 100 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  fax: varchar("fax", { length: 30 }),
  linkedRecipients: jsonb("linked_recipients").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const industryPlugins = pgTable("industry_plugins", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  terminology: jsonb("terminology").notNull(),
  defaultServiceTypes: jsonb("default_service_types").default([]),
  defaultTaskTypes: jsonb("default_task_types").default([]),
  defaultFormTemplates: jsonb("default_form_templates").default([]),
  defaultVerificationConfig: jsonb("default_verification_config").default({}),
  complianceRules: jsonb("compliance_rules").default({}),
  reportTemplates: jsonb("report_templates_config").default([]),
  integrations: jsonb("integrations").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
