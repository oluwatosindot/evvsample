import { pgTable, uuid, varchar, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  industryPlugin: varchar("industry_plugin", { length: 50 }).notNull().default("healthcare"),
  isActive: boolean("is_active").notNull().default(true),
  settings: jsonb("settings").$type<TenantSettingsJson>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export interface TenantSettingsJson {
  logoUrl?: string;
  primaryColor?: string;
  customDomain?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  dateFormat?: string;
  terminology?: {
    visit?: string;
    client?: string;
    worker?: string;
    trip?: string;
  };
  verification?: {
    allowedMethods?: string[];
    gpsRadiusMeters?: number;
    requirePhotoOnCheckin?: boolean;
    requirePhotoOnCheckout?: boolean;
    requireSignature?: boolean;
    allowManualOverride?: boolean;
    autoCheckoutAfterMinutes?: number | null;
  };
  compliance?: {
    maxShiftHours?: number;
    breakRequiredAfterHours?: number | null;
    credentialExpiryWarningDays?: number;
  };
  enabledModules?: string[];
}
