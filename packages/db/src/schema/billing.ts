import { pgTable, uuid, varchar, timestamp, text, jsonb, integer, date } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { payers } from "./recipients";
import { visits } from "./visits";

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  payerId: uuid("payer_id").notNull().references(() => payers.id),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  subtotal: integer("subtotal").notNull().default(0),
  tax: integer("tax").notNull().default(0),
  total: integer("total").notNull().default(0),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  visitId: uuid("visit_id").references(() => visits.id),
  serviceType: varchar("service_type", { length: 255 }).notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  unitRate: integer("unit_rate").notNull(),
  amount: integer("amount").notNull(),
});
