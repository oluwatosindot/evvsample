import { pgTable, uuid, varchar, timestamp, text, jsonb, date, integer, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const serviceRecipients = pgTable("service_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 30 }).notNull().default("individual"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  address: jsonb("address").$type<{
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    lat?: number;
    lng?: number;
  }>(),
  primaryContactId: uuid("primary_contact_id"),
  assignedManagerId: uuid("assigned_manager_id"),
  customFields: jsonb("custom_fields").default({}),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceTypes = pgTable("service_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  code: varchar("code", { length: 50 }),
  unitType: varchar("unit_type", { length: 30 }).notNull().default("hours"),
  rounding: varchar("rounding", { length: 30 }).notNull().default("none"),
  unitRate: integer("unit_rate").notNull().default(0),
  perDiem: integer("per_diem"),
  verificationMethods: jsonb("verification_methods").$type<string[]>().default(["gps"]),
  minDuration: integer("min_duration"),
  maxDuration: integer("max_duration"),
  requiresForm: uuid("requires_form"),
  isActive: boolean("is_active").notNull().default(true),
  color: varchar("color", { length: 7 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceAgreements = pgTable("service_agreements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  serviceRecipientId: uuid("service_recipient_id").notNull().references(() => serviceRecipients.id),
  serviceTypeId: uuid("service_type_id").notNull().references(() => serviceTypes.id),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  authorizedUnits: integer("authorized_units").notNull(),
  usedUnits: integer("used_units").notNull().default(0),
  unitType: varchar("unit_type", { length: 20 }).notNull().default("hours"),
  rate: integer("rate").notNull(),
  rateType: varchar("rate_type", { length: 20 }).notNull().default("per_hour"),
  payerId: uuid("payer_id"),
  authorizationNumber: varchar("authorization_number", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payers = pgTable("payers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  address: jsonb("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
