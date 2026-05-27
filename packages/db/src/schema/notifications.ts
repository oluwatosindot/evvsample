import { pgTable, uuid, varchar, timestamp, text, jsonb, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  actionUrl: varchar("action_url", { length: 500 }),
  channels: jsonb("channels").$type<string[]>().default(["in_app"]),
  read: boolean("read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),
  resource: varchar("resource", { length: 50 }).notNull(),
  resourceId: uuid("resource_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
