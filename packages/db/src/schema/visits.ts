import { pgTable, uuid, varchar, timestamp, text, jsonb, integer, decimal } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { workers } from "./workers";
import { serviceRecipients, serviceTypes } from "./recipients";

export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  serviceRecipientId: uuid("service_recipient_id").notNull().references(() => serviceRecipients.id),
  workerId: uuid("worker_id").notNull().references(() => workers.id),
  serviceTypeId: uuid("service_type_id").notNull().references(() => serviceTypes.id),
  label: varchar("label", { length: 255 }),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
  scheduledUnits: decimal("scheduled_units", { precision: 10, scale: 2 }),
  actualStart: timestamp("actual_start", { withTimezone: true }),
  actualEnd: timestamp("actual_end", { withTimezone: true }),
  actualUnits: decimal("actual_units", { precision: 10, scale: 2 }),
  checkInMethod: varchar("check_in_method", { length: 20 }),
  checkInLat: decimal("check_in_lat", { precision: 10, scale: 7 }),
  checkInLng: decimal("check_in_lng", { precision: 10, scale: 7 }),
  checkInAccuracy: decimal("check_in_accuracy", { precision: 10, scale: 2 }),
  checkOutMethod: varchar("check_out_method", { length: 20 }),
  checkOutLat: decimal("check_out_lat", { precision: 10, scale: 7 }),
  checkOutLng: decimal("check_out_lng", { precision: 10, scale: 7 }),
  checkOutAccuracy: decimal("check_out_accuracy", { precision: 10, scale: 2 }),
  verificationStatus: varchar("verification_status", { length: 30 }).notNull().default("needs_review"),
  billingStatus: varchar("billing_status", { length: 30 }).notNull().default("unbilled"),
  notes: text("notes"),
  formSubmissions: jsonb("form_submissions"),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  workerId: uuid("worker_id").notNull().references(() => workers.id),
  name: varchar("name", { length: 255 }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("planned"),
  visitIds: jsonb("visit_ids").$type<string[]>().default([]),
  estimatedDistance: decimal("estimated_distance", { precision: 10, scale: 2 }),
  estimatedDuration: integer("estimated_duration"),
  actualDistance: decimal("actual_distance", { precision: 10, scale: 2 }),
  actualDuration: integer("actual_duration"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
