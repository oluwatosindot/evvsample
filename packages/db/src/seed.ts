import "dotenv/config";
import { createDb } from "./index";
import { tenants, users, industryPlugins, roles } from "./schema";
import crypto from "crypto";

async function hashPasswordSimple(password: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(password).digest("hex");
}

async function seed() {
  const db = createDb(process.env.DATABASE_URL!);

  console.log("Seeding database...");

  // 1. Insert healthcare plugin
  await db.insert(industryPlugins).values({
    id: "healthcare",
    name: "Healthcare / Home Care",
    terminology: {
      visit: "Visit",
      client: "Patient",
      worker: "Caregiver",
      trip: "Trip",
    },
    defaultVerificationConfig: {
      allowedMethods: ["gps", "signature"],
      gpsRadiusMeters: 150,
      requireSignature: true,
    },
    complianceRules: {
      maxShiftHours: 12,
      breakRequiredAfterHours: 8,
      credentialExpiryWarningDays: 30,
    },
  }).onConflictDoNothing();

  // 1b. Insert security plugin
  await db.insert(industryPlugins).values({
    id: "security",
    name: "Security / Guarding",
    terminology: {
      visit: "Shift",
      client: "Property",
      worker: "Guard",
      trip: "Patrol",
    },
    defaultVerificationConfig: {
      allowedMethods: ["gps", "nfc", "qr"],
      gpsRadiusMeters: 100,
      requireSignature: false,
    },
    complianceRules: {
      maxShiftHours: 16,
      breakRequiredAfterHours: 6,
      credentialExpiryWarningDays: 30,
    },
  }).onConflictDoNothing();

  // 1c. Insert cleaning plugin
  await db.insert(industryPlugins).values({
    id: "cleaning",
    name: "Commercial Cleaning",
    terminology: {
      visit: "Job",
      client: "Property",
      worker: "Technician",
      trip: "Route",
    },
    defaultVerificationConfig: {
      allowedMethods: ["gps", "photo"],
      gpsRadiusMeters: 200,
      requireSignature: false,
    },
    complianceRules: {
      maxShiftHours: 10,
      breakRequiredAfterHours: 6,
      credentialExpiryWarningDays: 60,
    },
  }).onConflictDoNothing();

  // 1d. Insert construction plugin
  await db.insert(industryPlugins).values({
    id: "construction",
    name: "Construction",
    terminology: {
      visit: "Shift",
      client: "Job Site",
      worker: "Worker",
      trip: "Route",
    },
    defaultVerificationConfig: {
      allowedMethods: ["gps", "photo"],
      gpsRadiusMeters: 300,
      requireSignature: false,
    },
    complianceRules: {
      maxShiftHours: 12,
      breakRequiredAfterHours: 6,
      credentialExpiryWarningDays: 30,
    },
  }).onConflictDoNothing();

  // 1e. Insert delivery/logistics plugin
  await db.insert(industryPlugins).values({
    id: "delivery",
    name: "Delivery / Logistics",
    terminology: {
      visit: "Delivery",
      client: "Customer",
      worker: "Driver",
      trip: "Route",
    },
    defaultVerificationConfig: {
      allowedMethods: ["gps", "signature", "photo"],
      gpsRadiusMeters: 100,
      requireSignature: true,
    },
    complianceRules: {
      maxShiftHours: 14,
      breakRequiredAfterHours: 8,
      credentialExpiryWarningDays: 30,
    },
  }).onConflictDoNothing();

  // 2. Insert demo tenant
  const [tenant] = await db.insert(tenants).values({
    name: "Demo Healthcare Agency",
    slug: "demo-healthcare",
    industryPlugin: "healthcare",
    settings: {
      timezone: "America/New_York",
      locale: "en-US",
      currency: "USD",
      terminology: {
        visit: "Visit",
        client: "Patient",
        worker: "Caregiver",
        trip: "Trip",
      },
      verification: {
        allowedMethods: ["gps", "signature"],
        gpsRadiusMeters: 150,
        requireSignature: true,
      },
      enabledModules: ["scheduling", "billing", "reporting", "forms", "trips"],
    },
  }).returning();

  // 3. Insert system roles
  const systemRoles = [
    { name: "Super Admin", isSystem: true, permissions: [{ resource: "*", action: "*", scope: "all" }] },
    { name: "Admin", isSystem: true, permissions: [{ resource: "*", action: "*", scope: "all" }] },
    { name: "Manager", isSystem: true, permissions: [
      { resource: "visits", action: "read", scope: "team" },
      { resource: "workers", action: "read", scope: "team" },
      { resource: "recipients", action: "read", scope: "all" },
      { resource: "reports", action: "read", scope: "team" },
    ]},
    { name: "Scheduler", isSystem: true, permissions: [
      { resource: "visits", action: "*", scope: "all" },
      { resource: "workers", action: "read", scope: "all" },
      { resource: "recipients", action: "read", scope: "all" },
    ]},
    { name: "Billing Specialist", isSystem: true, permissions: [
      { resource: "billing", action: "*", scope: "all" },
      { resource: "visits", action: "read", scope: "all" },
      { resource: "reports", action: "read", scope: "all" },
    ]},
    { name: "Field Worker", isSystem: true, permissions: [
      { resource: "visits", action: "read", scope: "own" },
      { resource: "visits", action: "update", scope: "own" },
    ]},
  ];

  for (const role of systemRoles) {
    await db.insert(roles).values({ tenantId: tenant.id, ...role }).onConflictDoNothing();
  }

  // 4. Insert demo admin user
  const passwordHash = await hashPasswordSimple("admin123!");
  await db.insert(users).values({
    tenantId: tenant.id,
    email: "admin@demo.evv",
    passwordHash,
    firstName: "Admin",
    lastName: "User",
    role: "super_admin",
  });

  console.log("Seed complete!");
  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);
  console.log("  Login: admin@demo.evv / admin123!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
