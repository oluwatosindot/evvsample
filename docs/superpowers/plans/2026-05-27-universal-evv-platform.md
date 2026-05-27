# Universal EVV Platform — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant EVV SaaS platform starting with healthcare (GEOH parity), expandable to security, cleaning, construction, delivery, and more.

**Architecture:** Turborepo monorepo with a Next.js 15 admin portal, Hono API server, PostgreSQL via Drizzle ORM, and Redis for caching/sessions. Multi-tenancy via row-level security with `tenant_id` on every table. Industry-specific behavior driven by plugin configuration, not code branches.

**Tech Stack:** Next.js 15 (App Router) + React 19, Hono (API), Drizzle ORM + PostgreSQL 17, Redis, shadcn/ui + Tailwind CSS 4, TanStack Query, Zustand, BullMQ, Socket.io

**Spec document:** `docs/design-spec.md`

---

## Monorepo File Structure

```
evvsample/
├── apps/
│   ├── web/                          # Next.js 15 admin portal
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/           # Login, forgot password
│   │   │   │   ├── (dashboard)/      # Authenticated layout
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── operations/
│   │   │   │   │   ├── scheduling/
│   │   │   │   │   ├── recipients/
│   │   │   │   │   ├── workforce/
│   │   │   │   │   ├── billing/
│   │   │   │   │   ├── reporting/
│   │   │   │   │   ├── forms/
│   │   │   │   │   └── settings/
│   │   │   │   ├── api/              # Next.js API routes (auth only)
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui primitives
│   │   │   │   ├── layout/           # Shell, sidebar, header
│   │   │   │   ├── data-table/       # Reusable table with filters
│   │   │   │   └── forms/            # Form components
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── lib/                  # Client utilities
│   │   │   │   ├── api-client.ts     # Fetch wrapper for Hono API
│   │   │   │   ├── auth.ts           # Auth helpers
│   │   │   │   └── utils.ts
│   │   │   └── stores/               # Zustand stores
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # Hono API server
│       ├── src/
│       │   ├── index.ts              # Server entry point
│       │   ├── app.ts                # Hono app setup
│       │   ├── middleware/
│       │   │   ├── auth.ts           # JWT verification + tenant extraction
│       │   │   ├── tenant.ts         # Tenant context middleware
│       │   │   └── error-handler.ts
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── dashboard.ts
│       │   │   ├── visits.ts
│       │   │   ├── workers.ts
│       │   │   ├── recipients.ts
│       │   │   ├── billing.ts
│       │   │   ├── reports.ts
│       │   │   ├── forms.ts
│       │   │   ├── settings.ts
│       │   │   └── schedule.ts
│       │   ├── services/             # Business logic
│       │   │   ├── auth.service.ts
│       │   │   ├── visit.service.ts
│       │   │   ├── worker.service.ts
│       │   │   ├── recipient.service.ts
│       │   │   ├── billing.service.ts
│       │   │   ├── report.service.ts
│       │   │   └── notification.service.ts
│       │   └── lib/
│       │       ├── db.ts             # Drizzle client
│       │       ├── redis.ts          # Redis client
│       │       └── s3.ts             # S3 client
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── db/                           # Database schema + migrations
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── tenants.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── workers.ts
│   │   │   │   ├── visits.ts
│   │   │   │   ├── recipients.ts
│   │   │   │   ├── billing.ts
│   │   │   │   ├── reports.ts
│   │   │   │   ├── forms.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── settings.ts
│   │   │   │   └── index.ts          # Re-exports all schemas
│   │   │   ├── seed.ts               # Seed data for dev
│   │   │   └── index.ts              # Drizzle client factory
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── shared/                       # Shared types, constants, validators
│       ├── src/
│       │   ├── types/
│       │   │   ├── auth.ts
│       │   │   ├── visit.ts
│       │   │   ├── worker.ts
│       │   │   ├── recipient.ts
│       │   │   ├── billing.ts
│       │   │   └── index.ts
│       │   ├── constants/
│       │   │   ├── roles.ts
│       │   │   ├── statuses.ts
│       │   │   └── index.ts
│       │   ├── validators/           # Zod schemas (shared frontend+backend)
│       │   │   ├── auth.ts
│       │   │   ├── visit.ts
│       │   │   ├── worker.ts
│       │   │   ├── recipient.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docs/
│   ├── design-spec.md
│   └── superpowers/plans/
├── .env.example
├── docker-compose.yml                # PostgreSQL + Redis for dev
├── package.json                      # Workspace root
├── turbo.json
├── tsconfig.base.json
└── .gitignore
```

---

## Chunk 1: Foundation (Project Scaffolding, Database, Auth)

This chunk sets up the monorepo, database schema, authentication, and multi-tenancy. After this chunk, you can log in and see an empty dashboard shell.

---

### Task 1: Initialize Turborepo Monorepo

**Files:**
- Create: `package.json` (overwrite existing)
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Modify: `.gitignore`

- [ ] **Step 1: Install Turborepo and initialize workspace**

```bash
npm install -g turbo
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "evvsample",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate",
    "db:seed": "turbo db:seed"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {},
    "test": {},
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false },
    "db:seed": { "cache": false }
  }
}
```

- [ ] **Step 4: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: evv
      POSTGRES_PASSWORD: evv_dev_password
      POSTGRES_DB: evvsample
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 6: Create `.env.example`**

```env
DATABASE_URL=postgresql://evv:evv_dev_password@localhost:5432/evvsample
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-refresh-in-production
NEXT_PUBLIC_API_URL=http://localhost:3001
PORT=3001
```

- [ ] **Step 7: Update `.gitignore`**

```
node_modules/
.env
.env.local
*.log
.next/
dist/
.turbo/
.DS_Store
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize turborepo monorepo with docker-compose"
```

---

### Task 2: Create `packages/shared` (Types, Constants, Validators)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/types/auth.ts`
- Create: `packages/shared/src/constants/index.ts`
- Create: `packages/shared/src/constants/roles.ts`
- Create: `packages/shared/src/constants/statuses.ts`
- Create: `packages/shared/src/validators/index.ts`
- Create: `packages/shared/src/validators/auth.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@evv/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/shared/src/constants/roles.ts`**

```typescript
export const SYSTEM_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  SCHEDULER: "scheduler",
  BILLING_SPECIALIST: "billing_specialist",
  FIELD_WORKER: "field_worker",
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
```

- [ ] **Step 4: Create `packages/shared/src/constants/statuses.ts`**

```typescript
export const VISIT_VERIFICATION_STATUS = {
  VERIFIED: "verified",
  CHECK_IN_MISSED: "check_in_missed",
  CHECK_OUT_MISSED: "check_out_missed",
  MISSED_VISIT: "missed_visit",
  NEEDS_REVIEW: "needs_review",
  INVALID_DATA: "invalid_data",
} as const;

export type VisitVerificationStatus =
  (typeof VISIT_VERIFICATION_STATUS)[keyof typeof VISIT_VERIFICATION_STATUS];

export const BILLING_STATUS = {
  UNBILLED: "unbilled",
  ON_HOLD: "on_hold",
  READY_TO_BILL: "ready_to_bill",
  BILLED: "billed",
  DENIED: "denied",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  UNCOLLECTABLE: "uncollectable",
} as const;

export type BillingStatus =
  (typeof BILLING_STATUS)[keyof typeof BILLING_STATUS];

export const WORKER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  TERMINATED: "terminated",
  ON_LEAVE: "on_leave",
} as const;

export type WorkerStatus =
  (typeof WORKER_STATUS)[keyof typeof WORKER_STATUS];

export const RECIPIENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DISCHARGED: "discharged",
  SUSPENDED: "suspended",
} as const;

export type RecipientStatus =
  (typeof RECIPIENT_STATUS)[keyof typeof RECIPIENT_STATUS];

export const CHECK_IN_METHOD = {
  GPS: "gps",
  NFC: "nfc",
  QR: "qr",
  BIOMETRIC: "biometric",
  SIGNATURE: "signature",
  PHOTO: "photo",
  MANUAL: "manual",
} as const;

export type CheckInMethod =
  (typeof CHECK_IN_METHOD)[keyof typeof CHECK_IN_METHOD];
```

- [ ] **Step 5: Create `packages/shared/src/constants/index.ts`**

```typescript
export * from "./roles";
export * from "./statuses";
```

- [ ] **Step 6: Create `packages/shared/src/types/auth.ts`**

```typescript
export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}
```

- [ ] **Step 7: Create `packages/shared/src/types/index.ts`**

```typescript
export * from "./auth";
```

- [ ] **Step 8: Create `packages/shared/src/validators/auth.ts`**

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
```

- [ ] **Step 9: Create `packages/shared/src/validators/index.ts`**

```typescript
export * from "./auth";
```

- [ ] **Step 10: Create `packages/shared/src/index.ts`**

```typescript
export * from "./types";
export * from "./constants";
export * from "./validators";
```

- [ ] **Step 11: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared package with types, constants, validators"
```

---

### Task 3: Create `packages/db` (Drizzle Schema — Core Tables)

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/schema/index.ts`
- Create: `packages/db/src/schema/tenants.ts`
- Create: `packages/db/src/schema/users.ts`
- Create: `packages/db/src/schema/workers.ts`
- Create: `packages/db/src/schema/visits.ts`
- Create: `packages/db/src/schema/recipients.ts`
- Create: `packages/db/src/schema/billing.ts`
- Create: `packages/db/src/schema/settings.ts`
- Create: `packages/db/src/seed.ts`

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@evv/db",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/seed.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "dotenv": "^16.4.0"
  }
}
```

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/db/drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Create `packages/db/src/schema/tenants.ts`**

```typescript
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
```

- [ ] **Step 5: Create `packages/db/src/schema/users.ts`**

```typescript
import { pgTable, uuid, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("field_worker"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 6: Create `packages/db/src/schema/workers.ts`**

```typescript
import { pgTable, uuid, varchar, timestamp, date, jsonb, text } from "drizzle-orm/pg-core";
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
  requiresDocument: varchar("requires_document", { length: 5 }).notNull().default("false"),
  isActive: varchar("is_active", { length: 5 }).notNull().default("true"),
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
```

- [ ] **Step 7: Create `packages/db/src/schema/recipients.ts`**

```typescript
import { pgTable, uuid, varchar, timestamp, text, jsonb, date, integer } from "drizzle-orm/pg-core";
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
  unitRate: integer("unit_rate").notNull().default(0), // stored in cents
  perDiem: integer("per_diem"),
  verificationMethods: jsonb("verification_methods").$type<string[]>().default(["gps"]),
  minDuration: integer("min_duration"),
  maxDuration: integer("max_duration"),
  requiresForm: uuid("requires_form"),
  isActive: varchar("is_active", { length: 5 }).notNull().default("true"),
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
  rate: integer("rate").notNull(), // cents
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
  type: varchar("type", { length: 50 }).notNull(), // "medicaid", "insurance", "private", "contract"
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  address: jsonb("address"),
  isActive: varchar("is_active", { length: 5 }).notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 8: Create `packages/db/src/schema/visits.ts`**

```typescript
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

  // Scheduling
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
  scheduledUnits: decimal("scheduled_units", { precision: 10, scale: 2 }),

  // Actuals (EVV data)
  actualStart: timestamp("actual_start", { withTimezone: true }),
  actualEnd: timestamp("actual_end", { withTimezone: true }),
  actualUnits: decimal("actual_units", { precision: 10, scale: 2 }),

  // Check-in verification
  checkInMethod: varchar("check_in_method", { length: 20 }),
  checkInLat: decimal("check_in_lat", { precision: 10, scale: 7 }),
  checkInLng: decimal("check_in_lng", { precision: 10, scale: 7 }),
  checkInAccuracy: decimal("check_in_accuracy", { precision: 10, scale: 2 }),

  // Check-out verification
  checkOutMethod: varchar("check_out_method", { length: 20 }),
  checkOutLat: decimal("check_out_lat", { precision: 10, scale: 7 }),
  checkOutLng: decimal("check_out_lng", { precision: 10, scale: 7 }),
  checkOutAccuracy: decimal("check_out_accuracy", { precision: 10, scale: 2 }),

  // Status
  verificationStatus: varchar("verification_status", { length: 30 }).notNull().default("needs_review"),
  billingStatus: varchar("billing_status", { length: 30 }).notNull().default("unbilled"),

  // Notes & forms
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
```

- [ ] **Step 9: Create `packages/db/src/schema/billing.ts`**

```typescript
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
  subtotal: integer("subtotal").notNull().default(0), // cents
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
  unitRate: integer("unit_rate").notNull(), // cents
  amount: integer("amount").notNull(), // cents
});
```

- [ ] **Step 10: Create `packages/db/src/schema/notifications.ts`**

```typescript
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
```

- [ ] **Step 11: Create `packages/db/src/schema/forms.ts`**

```typescript
import { pgTable, uuid, varchar, timestamp, text, jsonb, integer } from "drizzle-orm/pg-core";
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
  isActive: varchar("is_active", { length: 5 }).notNull().default("true"),
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
```

- [ ] **Step 12: Create `packages/db/src/schema/reports.ts`**

```typescript
import { pgTable, uuid, varchar, timestamp, text, jsonb, integer } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const reportTemplates = pgTable("report_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  queryDefinition: jsonb("query_definition").notNull(),
  isSystem: varchar("is_system", { length: 5 }).notNull().default("false"),
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
```

- [ ] **Step 13: Create `packages/db/src/schema/settings.ts`**

```typescript
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
  reportTemplates: jsonb("report_templates").default([]),
  integrations: jsonb("integrations").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 14: Create `packages/db/src/schema/index.ts`**

```typescript
export * from "./tenants";
export * from "./users";
export * from "./workers";
export * from "./recipients";
export * from "./visits";
export * from "./billing";
export * from "./notifications";
export * from "./forms";
export * from "./reports";
export * from "./settings";
```

- [ ] **Step 15: Create `packages/db/src/index.ts`**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
export * from "./schema";
```

- [ ] **Step 16: Create `packages/db/src/seed.ts`**

```typescript
import "dotenv/config";
import { createDb } from "./index";
import { tenants, users, industryPlugins, roles } from "./schema";
import { hashPassword } from "./hash";
import crypto from "crypto";

// Simple password hash for seed data (the API will use bcrypt)
async function hashPasswordSimple(password: string): Promise<string> {
  // Use Node.js built-in for seed; real app uses bcrypt via API package
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
```

- [ ] **Step 17: Commit**

```bash
git add packages/db/
git commit -m "feat: add database package with full Drizzle schema"
```

---

### Task 4: Create Hono API Server (Auth + Tenant Middleware)

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/lib/db.ts`
- Create: `apps/api/src/lib/redis.ts`
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/middleware/tenant.ts`
- Create: `apps/api/src/middleware/error-handler.ts`
- Create: `apps/api/src/routes/auth.ts`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@evv/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@evv/db": "workspace:*",
    "@evv/shared": "workspace:*",
    "hono": "^4.7.0",
    "@hono/node-server": "^1.14.0",
    "bcryptjs": "^3.0.0",
    "jsonwebtoken": "^9.0.0",
    "ioredis": "^5.6.0",
    "zod": "^3.24.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^3.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/api/src/lib/db.ts`**

```typescript
import { createDb } from "@evv/db";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

export const db = createDb(DATABASE_URL);
```

- [ ] **Step 4: Create `apps/api/src/lib/redis.ts`**

```typescript
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL);
```

- [ ] **Step 5: Create `apps/api/src/middleware/error-handler.ts`**

```typescript
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export function errorHandler(err: Error, c: Context) {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
}
```

- [ ] **Step 6: Create `apps/api/src/middleware/auth.ts`**

```typescript
import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "@evv/shared";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    c.set("auth", {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    } satisfies AuthContext);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}

export function getAuth(c: Context): AuthContext {
  return c.get("auth") as AuthContext;
}
```

- [ ] **Step 7: Create `apps/api/src/middleware/tenant.ts`**

```typescript
import { Context, Next } from "hono";
import { getAuth } from "./auth";

// Tenant context is extracted from JWT — no extra lookup needed.
// This middleware is a hook point for future tenant-level checks
// (e.g., subscription status, feature flags).
export async function tenantMiddleware(c: Context, next: Next) {
  const auth = getAuth(c);
  if (!auth.tenantId) {
    return c.json({ error: "Tenant context missing" }, 403);
  }
  await next();
}
```

- [ ] **Step 8: Create `apps/api/src/routes/auth.ts`**

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "@evv/db";
import { loginSchema, refreshSchema } from "@evv/shared";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "change-me-refresh";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export const authRoutes = new Hono();

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isActive, true)))
    .limit(1);

  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  // Update last login
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const tokenPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

  return c.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      tenantId: user.tenantId,
    },
  });
});

authRoutes.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid("json");

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, payload.userId), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    const tokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const newRefreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    return c.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    return c.json({ error: "Invalid refresh token" }, 401);
  }
});

authRoutes.post("/logout", async (c) => {
  // Stateless JWT — client discards tokens.
  // For revocation, add token to Redis blacklist (future enhancement).
  return c.json({ message: "Logged out" });
});
```

- [ ] **Step 9: Create `apps/api/src/app.ts`**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { authMiddleware } from "./middleware/auth";
import { tenantMiddleware } from "./middleware/tenant";
import { errorHandler } from "./middleware/error-handler";

export const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Public routes
app.route("/api/auth", authRoutes);

// Protected routes — all require auth + tenant context
const api = new Hono();
api.use("*", authMiddleware);
api.use("*", tenantMiddleware);

// Placeholder routes (will be filled in subsequent tasks)
api.get("/dashboard/metrics", (c) => c.json({ message: "TODO" }));
api.get("/visits", (c) => c.json({ message: "TODO" }));
api.get("/workers", (c) => c.json({ message: "TODO" }));
api.get("/recipients", (c) => c.json({ message: "TODO" }));

app.route("/api", api);

// Error handler
app.onError(errorHandler);
```

- [ ] **Step 10: Create `apps/api/src/index.ts`**

```typescript
import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app";

const PORT = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`EVV API running on http://localhost:${info.port}`);
});
```

- [ ] **Step 11: Install dependencies and verify build**

```bash
npm install
```

- [ ] **Step 12: Commit**

```bash
git add apps/api/
git commit -m "feat: add Hono API server with auth routes and tenant middleware"
```

---

### Task 5: Create Next.js Admin Portal Shell

**Files:**
- Create: `apps/web/` (via `create-next-app`)
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- Create: `apps/web/src/components/layout/sidebar.tsx`
- Create: `apps/web/src/components/layout/header.tsx`
- Create: `apps/web/src/components/layout/shell.tsx`
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/stores/auth-store.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd apps && npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
cd ..
```

- [ ] **Step 2: Install UI dependencies**

```bash
cd apps/web
npm install @tanstack/react-query zustand
npm install -D @evv/shared@workspace:*
npx shadcn@latest init -d
npx shadcn@latest add button card input label sidebar sheet avatar dropdown-menu separator badge table dialog
cd ../..
```

- [ ] **Step 3: Create `apps/web/src/lib/api-client.ts`**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiClient<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers, ...rest });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}
```

- [ ] **Step 4: Create `apps/web/src/stores/auth-store.ts`**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (data: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (data) => set(data),
      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "evv-auth" }
  )
);
```

- [ ] **Step 5: Create `apps/web/src/app/(auth)/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { LoginResponse } from "@evv/shared";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiClient<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuth(data);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">EVV Platform</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@demo.evv"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Create `apps/web/src/components/layout/sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Calendar,
  Users,
  UserCircle,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
  HelpCircle,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Operations", href: "/operations", icon: ClipboardCheck },
  { label: "Scheduling", href: "/scheduling", icon: Calendar },
  { label: "Service Recipients", href: "/recipients", icon: Users },
  { label: "Workforce", href: "/workforce", icon: UserCircle },
  { label: "Billing", href: "/billing", icon: DollarSign },
  { label: "Reporting", href: "/reporting", icon: BarChart3 },
  { label: "Forms", href: "/forms", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-semibold">EVV Platform</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">v0.1.0</div>
    </aside>
  );
}
```

- [ ] **Step 7: Create `apps/web/src/components/layout/header.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { LogOut, Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AppHeader() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search everything... (Ctrl+F)"
            className="w-80 pl-10"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{user?.name}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 8: Create `apps/web/src/components/layout/shell.tsx`**

```tsx
import { AppSidebar } from "./sidebar";
import { AppHeader } from "./header";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto bg-gray-50 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create `apps/web/src/app/(dashboard)/layout.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/shell";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      router.push("/login");
    }
  }, [accessToken, router]);

  if (!accessToken) return null;

  return <Shell>{children}</Shell>;
}
```

- [ ] **Step 10: Create `apps/web/src/app/(dashboard)/dashboard/page.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Visits Today", value: "0", description: "No visits scheduled" },
  { label: "Compliance Rate", value: "--", description: "No data yet" },
  { label: "Active Workers", value: "0", description: "No workers added" },
  { label: "Revenue This Month", value: "$0", description: "No billing data" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Create placeholder pages for other modules**

Create these files with a simple placeholder structure:

`apps/web/src/app/(dashboard)/operations/page.tsx`
`apps/web/src/app/(dashboard)/scheduling/page.tsx`
`apps/web/src/app/(dashboard)/recipients/page.tsx`
`apps/web/src/app/(dashboard)/workforce/page.tsx`
`apps/web/src/app/(dashboard)/billing/page.tsx`
`apps/web/src/app/(dashboard)/reporting/page.tsx`
`apps/web/src/app/(dashboard)/forms/page.tsx`
`apps/web/src/app/(dashboard)/settings/page.tsx`

Each follows this pattern:

```tsx
export default function [Module]Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">[Module Name]</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 12: Update root `apps/web/src/app/page.tsx` to redirect to login**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 13: Commit**

```bash
git add apps/web/
git commit -m "feat: add Next.js admin portal with login, dashboard shell, sidebar navigation"
```

---

## Chunk 2: CRUD Modules (Workers, Recipients, Service Types)

After this chunk, you can create/read/update workers, service recipients, service agreements, and service types through both the API and the admin UI.

---

### Task 6: Workers API Routes + Service

**Files:**
- Create: `apps/api/src/services/worker.service.ts`
- Create: `apps/api/src/routes/workers.ts`
- Modify: `apps/api/src/app.ts` — wire workers routes
- Create: `packages/shared/src/validators/worker.ts`

- [ ] **Step 1: Create `packages/shared/src/validators/worker.ts`**

```typescript
import { z } from "zod";

export const createWorkerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  position: z.string().optional(),
  employmentType: z.enum(["employee", "contractor", "temp", "volunteer"]).default("employee"),
  hireDate: z.string().optional(),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

export const updateWorkerSchema = createWorkerSchema.partial();

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
```

Update `packages/shared/src/validators/index.ts` to add `export * from "./worker";`

- [ ] **Step 2: Create `apps/api/src/services/worker.service.ts`**

```typescript
import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../lib/db";
import { workers, users } from "@evv/db";
import type { CreateWorkerInput, UpdateWorkerInput } from "@evv/shared";
import bcrypt from "bcryptjs";

export async function listWorkers(tenantId: string, search?: string) {
  const conditions = [eq(workers.tenantId, tenantId)];
  if (search) {
    conditions.push(
      or(
        ilike(workers.firstName, `%${search}%`),
        ilike(workers.lastName, `%${search}%`),
        ilike(workers.email, `%${search}%`)
      )!
    );
  }
  return db.select().from(workers).where(and(...conditions));
}

export async function getWorker(tenantId: string, workerId: string) {
  const [worker] = await db
    .select()
    .from(workers)
    .where(and(eq(workers.id, workerId), eq(workers.tenantId, tenantId)))
    .limit(1);
  return worker ?? null;
}

export async function createWorker(tenantId: string, input: CreateWorkerInput) {
  // Create user account for the worker
  const passwordHash = await bcrypt.hash("changeme123!", 10);
  const [user] = await db.insert(users).values({
    tenantId,
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    role: "field_worker",
  }).returning();

  const [worker] = await db.insert(workers).values({
    tenantId,
    userId: user.id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    position: input.position,
    employmentType: input.employmentType,
    hireDate: input.hireDate,
    skills: input.skills || [],
    languages: input.languages || [],
    address: input.address,
  }).returning();

  return worker;
}

export async function updateWorker(tenantId: string, workerId: string, input: UpdateWorkerInput) {
  const [worker] = await db
    .update(workers)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(workers.id, workerId), eq(workers.tenantId, tenantId)))
    .returning();
  return worker ?? null;
}
```

- [ ] **Step 3: Create `apps/api/src/routes/workers.ts`**

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "../middleware/auth";
import { createWorkerSchema, updateWorkerSchema } from "@evv/shared";
import * as workerService from "../services/worker.service";

export const workerRoutes = new Hono();

workerRoutes.get("/", async (c) => {
  const { tenantId } = getAuth(c);
  const search = c.req.query("search");
  const workers = await workerService.listWorkers(tenantId, search);
  return c.json({ data: workers });
});

workerRoutes.get("/:id", async (c) => {
  const { tenantId } = getAuth(c);
  const worker = await workerService.getWorker(tenantId, c.req.param("id"));
  if (!worker) return c.json({ error: "Worker not found" }, 404);
  return c.json({ data: worker });
});

workerRoutes.post("/", zValidator("json", createWorkerSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const input = c.req.valid("json");
  const worker = await workerService.createWorker(tenantId, input);
  return c.json({ data: worker }, 201);
});

workerRoutes.patch("/:id", zValidator("json", updateWorkerSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const worker = await workerService.updateWorker(tenantId, c.req.param("id"), c.req.valid("json"));
  if (!worker) return c.json({ error: "Worker not found" }, 404);
  return c.json({ data: worker });
});
```

- [ ] **Step 4: Wire into `apps/api/src/app.ts`**

Add to imports: `import { workerRoutes } from "./routes/workers";`
Add after placeholder routes: `api.route("/workers", workerRoutes);`
Remove the placeholder `api.get("/workers", ...)` line.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/ apps/api/
git commit -m "feat: add workers CRUD API with service layer"
```

---

### Task 7: Recipients + Service Types + Agreements API Routes

**Files:**
- Create: `packages/shared/src/validators/recipient.ts`
- Create: `apps/api/src/services/recipient.service.ts`
- Create: `apps/api/src/routes/recipients.ts`
- Create: `apps/api/src/routes/settings.ts` (for service types)
- Modify: `apps/api/src/app.ts` — wire routes

- [ ] **Step 1: Create `packages/shared/src/validators/recipient.ts`**

```typescript
import { z } from "zod";

export const createRecipientSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["individual", "organization", "property", "site"]).default("individual"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateRecipientSchema = createRecipientSchema.partial();

export const createServiceAgreementSchema = z.object({
  serviceTypeId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  authorizedUnits: z.number().int().positive(),
  unitType: z.enum(["hours", "visits", "days", "units"]).default("hours"),
  rate: z.number().int().positive(),
  rateType: z.enum(["per_hour", "per_visit", "per_day", "per_unit", "flat_fee"]).default("per_hour"),
  payerId: z.string().uuid().optional(),
  authorizationNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const createServiceTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  code: z.string().optional(),
  unitType: z.enum(["hours", "partial_units", "per_day", "per_visit", "flat"]).default("hours"),
  rounding: z.enum(["none", "nearest_15min", "nearest_30min", "nearest_hour", "round_up", "round_down"]).default("none"),
  unitRate: z.number().int().nonnegative(),
  verificationMethods: z.array(z.string()).optional(),
  minDuration: z.number().int().optional(),
  maxDuration: z.number().int().optional(),
  color: z.string().optional(),
});

export type CreateRecipientInput = z.infer<typeof createRecipientSchema>;
export type UpdateRecipientInput = z.infer<typeof updateRecipientSchema>;
export type CreateServiceAgreementInput = z.infer<typeof createServiceAgreementSchema>;
export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>;
```

Update `packages/shared/src/validators/index.ts` to add `export * from "./recipient";`

- [ ] **Step 2: Create `apps/api/src/services/recipient.service.ts`**

```typescript
import { eq, and, ilike } from "drizzle-orm";
import { db } from "../lib/db";
import { serviceRecipients, serviceAgreements, serviceTypes } from "@evv/db";
import type { CreateRecipientInput, UpdateRecipientInput, CreateServiceAgreementInput, CreateServiceTypeInput } from "@evv/shared";

export async function listRecipients(tenantId: string, search?: string) {
  const conditions = [eq(serviceRecipients.tenantId, tenantId)];
  if (search) {
    conditions.push(ilike(serviceRecipients.name, `%${search}%`));
  }
  return db.select().from(serviceRecipients).where(and(...conditions));
}

export async function getRecipient(tenantId: string, id: string) {
  const [recipient] = await db.select().from(serviceRecipients)
    .where(and(eq(serviceRecipients.id, id), eq(serviceRecipients.tenantId, tenantId)))
    .limit(1);
  return recipient ?? null;
}

export async function createRecipient(tenantId: string, input: CreateRecipientInput) {
  const [recipient] = await db.insert(serviceRecipients).values({
    tenantId,
    ...input,
    tags: input.tags || [],
  }).returning();
  return recipient;
}

export async function updateRecipient(tenantId: string, id: string, input: UpdateRecipientInput) {
  const [recipient] = await db.update(serviceRecipients)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(serviceRecipients.id, id), eq(serviceRecipients.tenantId, tenantId)))
    .returning();
  return recipient ?? null;
}

// Service Agreements
export async function listAgreements(tenantId: string, recipientId: string) {
  return db.select().from(serviceAgreements)
    .where(and(eq(serviceAgreements.tenantId, tenantId), eq(serviceAgreements.serviceRecipientId, recipientId)));
}

export async function createAgreement(tenantId: string, recipientId: string, input: CreateServiceAgreementInput) {
  const [agreement] = await db.insert(serviceAgreements).values({
    tenantId,
    serviceRecipientId: recipientId,
    ...input,
  }).returning();
  return agreement;
}

// Service Types
export async function listServiceTypes(tenantId: string) {
  return db.select().from(serviceTypes).where(eq(serviceTypes.tenantId, tenantId));
}

export async function createServiceType(tenantId: string, input: CreateServiceTypeInput) {
  const [type] = await db.insert(serviceTypes).values({
    tenantId,
    ...input,
    verificationMethods: input.verificationMethods || ["gps"],
  }).returning();
  return type;
}
```

- [ ] **Step 3: Create `apps/api/src/routes/recipients.ts`**

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "../middleware/auth";
import { createRecipientSchema, updateRecipientSchema, createServiceAgreementSchema } from "@evv/shared";
import * as recipientService from "../services/recipient.service";

export const recipientRoutes = new Hono();

recipientRoutes.get("/", async (c) => {
  const { tenantId } = getAuth(c);
  const search = c.req.query("search");
  const recipients = await recipientService.listRecipients(tenantId, search);
  return c.json({ data: recipients });
});

recipientRoutes.get("/:id", async (c) => {
  const { tenantId } = getAuth(c);
  const recipient = await recipientService.getRecipient(tenantId, c.req.param("id"));
  if (!recipient) return c.json({ error: "Recipient not found" }, 404);
  return c.json({ data: recipient });
});

recipientRoutes.post("/", zValidator("json", createRecipientSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const recipient = await recipientService.createRecipient(tenantId, c.req.valid("json"));
  return c.json({ data: recipient }, 201);
});

recipientRoutes.patch("/:id", zValidator("json", updateRecipientSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const recipient = await recipientService.updateRecipient(tenantId, c.req.param("id"), c.req.valid("json"));
  if (!recipient) return c.json({ error: "Recipient not found" }, 404);
  return c.json({ data: recipient });
});

recipientRoutes.get("/:id/agreements", async (c) => {
  const { tenantId } = getAuth(c);
  const agreements = await recipientService.listAgreements(tenantId, c.req.param("id"));
  return c.json({ data: agreements });
});

recipientRoutes.post("/:id/agreements", zValidator("json", createServiceAgreementSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const agreement = await recipientService.createAgreement(tenantId, c.req.param("id"), c.req.valid("json"));
  return c.json({ data: agreement }, 201);
});
```

- [ ] **Step 4: Create `apps/api/src/routes/settings.ts`**

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "../middleware/auth";
import { createServiceTypeSchema } from "@evv/shared";
import * as recipientService from "../services/recipient.service";

export const settingsRoutes = new Hono();

settingsRoutes.get("/service-types", async (c) => {
  const { tenantId } = getAuth(c);
  const types = await recipientService.listServiceTypes(tenantId);
  return c.json({ data: types });
});

settingsRoutes.post("/service-types", zValidator("json", createServiceTypeSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const type = await recipientService.createServiceType(tenantId, c.req.valid("json"));
  return c.json({ data: type }, 201);
});
```

- [ ] **Step 5: Wire routes into `apps/api/src/app.ts`**

Add imports for `recipientRoutes` and `settingsRoutes`, wire them:
```typescript
api.route("/recipients", recipientRoutes);
api.route("/settings", settingsRoutes);
```
Remove placeholder routes for `/recipients`.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/ apps/api/
git commit -m "feat: add recipients, service agreements, and service types CRUD API"
```

---

### Task 8: Workforce Management UI

**Files:**
- Create: `apps/web/src/app/(dashboard)/workforce/page.tsx` (overwrite placeholder)
- Create: `apps/web/src/app/(dashboard)/workforce/new/page.tsx`
- Create: `apps/web/src/components/data-table/data-table.tsx`
- Create: `apps/web/src/hooks/use-api.ts`

- [ ] **Step 1: Create `apps/web/src/hooks/use-api.ts`**

```tsx
import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useApiQuery<T>(key: string[], path: string) {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery<{ data: T }>({
    queryKey: key,
    queryFn: () => apiClient<{ data: T }>(path, { token: token! }),
    enabled: !!token,
  });
}

export function useApiMutation<TInput, TResult = unknown>(
  path: string,
  options?: { method?: string; onSuccess?: () => void }
) {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  return useMutation<{ data: TResult }, Error, TInput>({
    mutationFn: (input) =>
      apiClient<{ data: TResult }>(path, {
        method: options?.method || "POST",
        body: JSON.stringify(input),
        token: token!,
      }),
    onSuccess: () => {
      options?.onSuccess?.();
      queryClient.invalidateQueries();
    },
  });
}
```

- [ ] **Step 2: Create `apps/web/src/components/data-table/data-table.tsx`**

```tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={(row.id as string) ?? i}
                className={onRowClick ? "cursor-pointer" : ""}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/app/(dashboard)/workforce/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { useApiQuery } from "@/hooks/use-api";
import { Plus } from "lucide-react";

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  employmentType: string;
  hireDate: string | null;
}

const columns = [
  {
    key: "name",
    label: "Name",
    render: (row: Worker) => `${row.firstName} ${row.lastName}`,
  },
  { key: "position", label: "Position" },
  {
    key: "status",
    label: "Status",
    render: (row: Worker) => (
      <Badge variant={row.status === "active" ? "default" : "secondary"}>
        {row.status}
      </Badge>
    ),
  },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "employmentType", label: "Type" },
  { key: "hireDate", label: "Hire Date" },
];

export default function WorkforcePage() {
  const router = useRouter();
  const { data, isLoading } = useApiQuery<Worker[]>(["workers"], "/api/workers");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workforce</h1>
        <Button onClick={() => router.push("/workforce/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Employee
        </Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable columns={columns} data={data?.data || []} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/src/app/(dashboard)/workforce/new/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiMutation } from "@/hooks/use-api";

export default function NewWorkerPage() {
  const router = useRouter();
  const mutation = useApiMutation("/api/workers", {
    onSuccess: () => router.push("/workforce"),
  });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Add New Employee</h1>
      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Create Employee"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
            {mutation.isError && (
              <p className="text-sm text-red-600">{mutation.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat: add workforce management UI with data table and create form"
```

---

### Task 9: Service Recipients UI

**Files:**
- Modify: `apps/web/src/app/(dashboard)/recipients/page.tsx` (overwrite placeholder)
- Create: `apps/web/src/app/(dashboard)/recipients/new/page.tsx`

- [ ] **Step 1-3:** Follow the same pattern as Task 8 but for recipients. Use `createRecipientSchema` fields: name, type, phone, email, address, notes, tags.

- [ ] **Step 4: Commit**

```bash
git add apps/web/
git commit -m "feat: add service recipients UI with list and create form"
```

---

## Chunk 3: Visits, Scheduling, and EVV Core

After this chunk, visits can be created, scheduled on a calendar, and checked-in/checked-out with GPS verification. The operations worklist shows visit verification status.

---

### Task 10: Visits API Routes + EVV Check-in/Check-out

**Files:**
- Create: `packages/shared/src/validators/visit.ts`
- Create: `apps/api/src/services/visit.service.ts`
- Create: `apps/api/src/routes/visits.ts`
- Modify: `apps/api/src/app.ts` — wire visits routes

- [ ] **Step 1: Create `packages/shared/src/validators/visit.ts`**

```typescript
import { z } from "zod";

export const createVisitSchema = z.object({
  serviceRecipientId: z.string().uuid(),
  workerId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  label: z.string().optional(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  scheduledUnits: z.string().optional(),
  notes: z.string().optional(),
});

export const updateVisitSchema = createVisitSchema.partial();

export const checkInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  method: z.enum(["gps", "nfc", "qr", "biometric", "signature", "photo", "manual"]).default("gps"),
});

export const checkOutSchema = checkInSchema;

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
```

Update `packages/shared/src/validators/index.ts` to add `export * from "./visit";`

- [ ] **Step 2: Create `apps/api/src/services/visit.service.ts`**

```typescript
import { eq, and, between, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { visits } from "@evv/db";
import type { CreateVisitInput, UpdateVisitInput, CheckInInput, CheckOutInput } from "@evv/shared";

export async function listVisits(tenantId: string, filters?: {
  status?: string;
  workerId?: string;
  recipientId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const conditions = [eq(visits.tenantId, tenantId)];

  if (filters?.status) conditions.push(eq(visits.verificationStatus, filters.status));
  if (filters?.workerId) conditions.push(eq(visits.workerId, filters.workerId));
  if (filters?.recipientId) conditions.push(eq(visits.serviceRecipientId, filters.recipientId));
  if (filters?.dateFrom && filters?.dateTo) {
    conditions.push(between(visits.scheduledStart, new Date(filters.dateFrom), new Date(filters.dateTo)));
  }

  return db.select().from(visits).where(and(...conditions)).orderBy(desc(visits.scheduledStart));
}

export async function getVisit(tenantId: string, visitId: string) {
  const [visit] = await db.select().from(visits)
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .limit(1);
  return visit ?? null;
}

export async function createVisit(tenantId: string, input: CreateVisitInput) {
  const [visit] = await db.insert(visits).values({
    tenantId,
    serviceRecipientId: input.serviceRecipientId,
    workerId: input.workerId,
    serviceTypeId: input.serviceTypeId,
    label: input.label,
    scheduledStart: new Date(input.scheduledStart),
    scheduledEnd: new Date(input.scheduledEnd),
    scheduledUnits: input.scheduledUnits,
    notes: input.notes,
  }).returning();
  return visit;
}

export async function updateVisit(tenantId: string, visitId: string, input: UpdateVisitInput) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.scheduledStart) updateData.scheduledStart = new Date(input.scheduledStart);
  if (input.scheduledEnd) updateData.scheduledEnd = new Date(input.scheduledEnd);
  if (input.workerId) updateData.workerId = input.workerId;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.label !== undefined) updateData.label = input.label;

  const [visit] = await db.update(visits)
    .set(updateData)
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return visit ?? null;
}

export async function checkIn(tenantId: string, visitId: string, input: CheckInInput) {
  const [visit] = await db.update(visits)
    .set({
      actualStart: new Date(),
      checkInMethod: input.method,
      checkInLat: String(input.lat),
      checkInLng: String(input.lng),
      checkInAccuracy: input.accuracy ? String(input.accuracy) : null,
      verificationStatus: "verified",
      updatedAt: new Date(),
    })
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return visit ?? null;
}

export async function checkOut(tenantId: string, visitId: string, input: CheckOutInput) {
  const visit = await getVisit(tenantId, visitId);
  if (!visit || !visit.actualStart) return null;

  const actualEnd = new Date();
  const durationHours = (actualEnd.getTime() - new Date(visit.actualStart).getTime()) / (1000 * 60 * 60);

  const [updated] = await db.update(visits)
    .set({
      actualEnd,
      checkOutMethod: input.method,
      checkOutLat: String(input.lat),
      checkOutLng: String(input.lng),
      checkOutAccuracy: input.accuracy ? String(input.accuracy) : null,
      actualUnits: String(Math.round(durationHours * 100) / 100),
      verificationStatus: "verified",
      updatedAt: new Date(),
    })
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return updated ?? null;
}

export async function deleteVisit(tenantId: string, visitId: string) {
  const [visit] = await db.delete(visits)
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return visit ?? null;
}
```

- [ ] **Step 3: Create `apps/api/src/routes/visits.ts`**

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "../middleware/auth";
import { createVisitSchema, updateVisitSchema, checkInSchema, checkOutSchema } from "@evv/shared";
import * as visitService from "../services/visit.service";

export const visitRoutes = new Hono();

visitRoutes.get("/", async (c) => {
  const { tenantId } = getAuth(c);
  const visits = await visitService.listVisits(tenantId, {
    status: c.req.query("status"),
    workerId: c.req.query("worker_id"),
    recipientId: c.req.query("recipient_id"),
    dateFrom: c.req.query("date_from"),
    dateTo: c.req.query("date_to"),
  });
  return c.json({ data: visits });
});

visitRoutes.get("/:id", async (c) => {
  const { tenantId } = getAuth(c);
  const visit = await visitService.getVisit(tenantId, c.req.param("id"));
  if (!visit) return c.json({ error: "Visit not found" }, 404);
  return c.json({ data: visit });
});

visitRoutes.post("/", zValidator("json", createVisitSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const visit = await visitService.createVisit(tenantId, c.req.valid("json"));
  return c.json({ data: visit }, 201);
});

visitRoutes.patch("/:id", zValidator("json", updateVisitSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const visit = await visitService.updateVisit(tenantId, c.req.param("id"), c.req.valid("json"));
  if (!visit) return c.json({ error: "Visit not found" }, 404);
  return c.json({ data: visit });
});

visitRoutes.delete("/:id", async (c) => {
  const { tenantId } = getAuth(c);
  const visit = await visitService.deleteVisit(tenantId, c.req.param("id"));
  if (!visit) return c.json({ error: "Visit not found" }, 404);
  return c.json({ data: visit });
});

visitRoutes.post("/:id/check-in", zValidator("json", checkInSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const visit = await visitService.checkIn(tenantId, c.req.param("id"), c.req.valid("json"));
  if (!visit) return c.json({ error: "Visit not found" }, 404);
  return c.json({ data: visit });
});

visitRoutes.post("/:id/check-out", zValidator("json", checkOutSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const visit = await visitService.checkOut(tenantId, c.req.param("id"), c.req.valid("json"));
  if (!visit) return c.json({ error: "Visit not found or not checked in" }, 400);
  return c.json({ data: visit });
});
```

- [ ] **Step 4: Wire into `apps/api/src/app.ts`**

Add `import { visitRoutes } from "./routes/visits";` and `api.route("/visits", visitRoutes);`

- [ ] **Step 5: Commit**

```bash
git add packages/shared/ apps/api/
git commit -m "feat: add visits CRUD API with EVV check-in/check-out endpoints"
```

---

### Task 11: Operations Worklist UI

**Files:**
- Modify: `apps/web/src/app/(dashboard)/operations/page.tsx` (overwrite placeholder)

- [ ] **Step 1: Create Operations Worklist page**

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { useApiQuery } from "@/hooks/use-api";

interface Visit {
  id: string;
  serviceRecipientId: string;
  workerId: string;
  verificationStatus: string;
  billingStatus: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  scheduledUnits: string | null;
  actualUnits: string | null;
}

const statusCards = [
  { key: "verified", label: "Up to Date", color: "bg-green-100 text-green-800" },
  { key: "check_in_missed", label: "Check-in Missed", color: "bg-red-100 text-red-800" },
  { key: "check_out_missed", label: "Check-out Missed", color: "bg-orange-100 text-orange-800" },
  { key: "missed_visit", label: "Missed Visit", color: "bg-orange-100 text-orange-800" },
  { key: "needs_review", label: "Needs Review", color: "bg-yellow-100 text-yellow-800" },
  { key: "invalid_data", label: "Invalid Data", color: "bg-red-100 text-red-800" },
];

const columns = [
  { key: "serviceRecipientId", label: "Recipient" },
  {
    key: "verificationStatus",
    label: "Status",
    render: (row: Visit) => {
      const card = statusCards.find((c) => c.key === row.verificationStatus);
      return <Badge className={card?.color}>{card?.label || row.verificationStatus}</Badge>;
    },
  },
  { key: "workerId", label: "Worker" },
  {
    key: "scheduledStart",
    label: "Scheduled",
    render: (row: Visit) => new Date(row.scheduledStart).toLocaleString(),
  },
  {
    key: "actualStart",
    label: "Actual",
    render: (row: Visit) => row.actualStart ? new Date(row.actualStart).toLocaleString() : "-",
  },
  { key: "scheduledUnits", label: "Sched. Units" },
  { key: "actualUnits", label: "Actual Units" },
];

export default function OperationsPage() {
  const [filter, setFilter] = useState<string | null>(null);
  const { data, isLoading } = useApiQuery<Visit[]>(
    ["visits", filter ?? "all"],
    filter ? `/api/visits?status=${filter}` : "/api/visits"
  );

  const visits = data?.data || [];

  const counts = statusCards.map((sc) => ({
    ...sc,
    count: visits.filter((v) => v.verificationStatus === sc.key).length,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Operations Worklist</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {counts.map((sc) => (
          <Card
            key={sc.key}
            className={`cursor-pointer transition-shadow hover:shadow-md ${filter === sc.key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setFilter(filter === sc.key ? null : sc.key)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{sc.count}</div>
              <div className="text-xs text-muted-foreground">{sc.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={filter ? visits.filter((v) => v.verificationStatus === filter) : visits}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/
git commit -m "feat: add operations worklist UI with status filter cards"
```

---

### Task 12: Scheduling Calendar UI

**Files:**
- Modify: `apps/web/src/app/(dashboard)/scheduling/page.tsx` (overwrite placeholder)

- [ ] **Step 1: Create weekly calendar view**

This will be a custom weekly calendar component showing visits as time blocks. Use a simple CSS grid approach (no heavy calendar library needed for v1).

```tsx
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/use-api";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface Visit {
  id: string;
  workerId: string;
  serviceRecipientId: string;
  scheduledStart: string;
  scheduledEnd: string;
  verificationStatus: string;
  label: string | null;
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

const statusColor: Record<string, string> = {
  verified: "bg-green-200 border-green-400",
  needs_review: "bg-gray-200 border-gray-400",
  check_in_missed: "bg-red-200 border-red-400",
  check_out_missed: "bg-orange-200 border-orange-400",
  missed_visit: "bg-red-100 border-red-300",
};

export default function SchedulingPage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeek = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDates(base);
  }, [weekOffset]);

  const dateFrom = formatDate(currentWeek[0]);
  const dateTo = formatDate(currentWeek[6]);

  const { data } = useApiQuery<Visit[]>(
    ["schedule", dateFrom, dateTo],
    `/api/visits?date_from=${dateFrom}T00:00:00Z&date_to=${dateTo}T23:59:59Z`
  );

  const visits = data?.data || [];

  const visitsByDay = useMemo(() => {
    const map: Record<string, Visit[]> = {};
    for (const day of currentWeek) {
      map[formatDate(day)] = [];
    }
    for (const v of visits) {
      const key = new Date(v.scheduledStart).toISOString().split("T")[0];
      if (map[key]) map[key].push(v);
    }
    return map;
  }, [visits, currentWeek]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button><Plus className="mr-2 h-4 w-4" /> New Visit</Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {currentWeek.map((day) => {
          const key = formatDate(day);
          const dayVisits = visitsByDay[key] || [];
          const isToday = key === formatDate(new Date());

          return (
            <div key={key} className="min-h-[200px]">
              <div className={`mb-2 rounded px-2 py-1 text-center text-sm font-medium ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </div>
              <div className="space-y-1">
                {dayVisits.map((v) => (
                  <Card
                    key={v.id}
                    className={`cursor-pointer border-l-4 p-2 text-xs ${statusColor[v.verificationStatus] || "bg-blue-100 border-blue-400"}`}
                  >
                    <div className="font-medium">{v.label || "Visit"}</div>
                    <div className="text-muted-foreground">
                      {new Date(v.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {new Date(v.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/
git commit -m "feat: add weekly scheduling calendar view"
```

---

## Chunk 4: Billing, Reporting, and Forms

After this chunk, the billing worklist tracks visit billing status, reports can be generated, and digital forms can be created and submitted.

---

### Task 13: Billing API + UI

**Files:**
- Create: `apps/api/src/services/billing.service.ts`
- Create: `apps/api/src/routes/billing.ts`
- Modify: `apps/api/src/app.ts` — wire billing routes
- Modify: `apps/web/src/app/(dashboard)/billing/page.tsx`

- [ ] **Step 1: Create `apps/api/src/services/billing.service.ts`**

```typescript
import { eq, and, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { visits } from "@evv/db";

export async function getBillingWorklist(tenantId: string, status?: string) {
  const conditions = [eq(visits.tenantId, tenantId)];
  if (status) conditions.push(eq(visits.billingStatus, status));
  return db.select().from(visits).where(and(...conditions));
}

export async function updateBillingStatus(tenantId: string, visitId: string, status: string) {
  const [visit] = await db.update(visits)
    .set({ billingStatus: status, updatedAt: new Date() })
    .where(and(eq(visits.id, visitId), eq(visits.tenantId, tenantId)))
    .returning();
  return visit ?? null;
}

export async function getBillingSummary(tenantId: string) {
  const allVisits = await db.select().from(visits).where(eq(visits.tenantId, tenantId));
  const summary: Record<string, { count: number }> = {};
  for (const v of allVisits) {
    if (!summary[v.billingStatus]) summary[v.billingStatus] = { count: 0 };
    summary[v.billingStatus].count++;
  }
  return summary;
}
```

- [ ] **Step 2: Create `apps/api/src/routes/billing.ts`**

```typescript
import { Hono } from "hono";
import { getAuth } from "../middleware/auth";
import * as billingService from "../services/billing.service";

export const billingRoutes = new Hono();

billingRoutes.get("/worklist", async (c) => {
  const { tenantId } = getAuth(c);
  const status = c.req.query("status");
  const visits = await billingService.getBillingWorklist(tenantId, status);
  return c.json({ data: visits });
});

billingRoutes.get("/summary", async (c) => {
  const { tenantId } = getAuth(c);
  const summary = await billingService.getBillingSummary(tenantId);
  return c.json({ data: summary });
});

billingRoutes.patch("/:visitId", async (c) => {
  const { tenantId } = getAuth(c);
  const body = await c.req.json<{ status: string }>();
  const visit = await billingService.updateBillingStatus(tenantId, c.req.param("visitId"), body.status);
  if (!visit) return c.json({ error: "Visit not found" }, 404);
  return c.json({ data: visit });
});
```

Wire into `app.ts`: `api.route("/billing", billingRoutes);`

- [ ] **Step 3: Create Billing Worklist UI** (follow same pattern as Operations page with billing status cards)

- [ ] **Step 4: Commit**

```bash
git add packages/ apps/
git commit -m "feat: add billing worklist API and UI"
```

---

### Task 14: Reports API + UI

**Files:**
- Create: `apps/api/src/services/report.service.ts`
- Create: `apps/api/src/routes/reports.ts`
- Modify: `apps/web/src/app/(dashboard)/reporting/page.tsx`

- [ ] **Step 1: Create report service** — CRUD for report jobs with queued/processing/completed status flow. For v1, generate reports synchronously as CSV.

- [ ] **Step 2: Create report routes** — `GET /api/reports`, `POST /api/reports`, `GET /api/reports/:id`

- [ ] **Step 3: Create Report Center UI** — Show list of generated reports with status, allow creating new reports by selecting a template and parameters.

- [ ] **Step 4: Commit**

```bash
git add packages/ apps/
git commit -m "feat: add report engine API and report center UI"
```

---

### Task 15: Digital Forms Engine API + UI

**Files:**
- Create: `apps/api/src/routes/forms.ts`
- Modify: `apps/web/src/app/(dashboard)/forms/page.tsx`

- [ ] **Step 1: Create forms routes** — CRUD for form templates and submissions. `GET /api/form-templates`, `POST /api/form-templates`, `POST /api/visits/:id/forms`

- [ ] **Step 2: Create Forms UI** — List form templates, create new templates with JSON schema builder. Simple v1 with name, description, and JSON schema text area.

- [ ] **Step 3: Commit**

```bash
git add apps/
git commit -m "feat: add digital forms engine API and UI"
```

---

## Chunk 5: Notifications, Settings, Dashboard Metrics

After this chunk, the dashboard shows real metrics, notifications work, and organization settings are configurable.

---

### Task 16: Dashboard Metrics API

**Files:**
- Create: `apps/api/src/routes/dashboard.ts`
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx` — fetch real data

- [ ] **Step 1: Create dashboard routes** — Aggregate metrics from visits, workers, billing tables.

```typescript
// GET /api/dashboard/metrics returns:
{
  visitsToday: number,
  visitsThisWeek: number,
  complianceRate: number, // % of visits with "verified" status
  activeWorkers: number,
  alertCount: number, // missed visits + overdue tasks
}
```

- [ ] **Step 2: Update dashboard page to fetch and display real metrics**

- [ ] **Step 3: Add Workforce Tasklist to dashboard** — `GET /api/dashboard/tasks` returns workforce tasks with upcoming/overdue/action_required counts.

- [ ] **Step 4: Commit**

```bash
git add apps/
git commit -m "feat: add live dashboard metrics and workforce tasklist"
```

---

### Task 17: Notifications API + UI

**Files:**
- Create: `apps/api/src/services/notification.service.ts`
- Create: `apps/api/src/routes/notifications.ts`
- Modify: `apps/web/src/components/layout/header.tsx` — notification bell with count

- [ ] **Step 1: Create notification service** — `create`, `list`, `markRead`, `getUnreadCount`

- [ ] **Step 2: Create notification routes** — `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `GET /api/notifications/unread-count`

- [ ] **Step 3: Update header** — Fetch unread count, show badge on bell icon, dropdown with recent notifications.

- [ ] **Step 4: Commit**

```bash
git add apps/
git commit -m "feat: add notifications API and UI with unread badge"
```

---

### Task 18: Organization Settings UI

**Files:**
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`
- Create: `apps/web/src/app/(dashboard)/settings/service-types/page.tsx`
- Create: `apps/web/src/app/(dashboard)/settings/roles/page.tsx`

- [ ] **Step 1: Create settings page** — Tabs or sub-navigation for: General, Service Catalog, Task Types, Roles & Permissions.

- [ ] **Step 2: General settings** — Edit tenant name, timezone, terminology overrides, verification rules.

- [ ] **Step 3: Service Catalog page** — List and create service types (uses existing API).

- [ ] **Step 4: Roles page** — List roles with permissions grid.

- [ ] **Step 5: Commit**

```bash
git add apps/
git commit -m "feat: add organization settings pages"
```

---

## Chunk 6: Industry Plugin System + Polish

After this chunk, tenants can switch industries, terminology adapts throughout the UI, and the healthcare plugin provides GEOH-parity defaults.

---

### Task 19: Industry Plugin Engine

**Files:**
- Create: `apps/api/src/services/plugin.service.ts`
- Create: `apps/api/src/routes/plugins.ts`
- Modify: `packages/db/src/seed.ts` — add security + cleaning plugin seeds

- [ ] **Step 1: Create plugin service** — Load plugin config, apply defaults when creating a new tenant.

- [ ] **Step 2: Seed additional plugins**

```typescript
// Security plugin
{ id: "security", name: "Security / Guarding",
  terminology: { visit: "Shift", client: "Property", worker: "Guard", trip: "Patrol" } }

// Cleaning plugin
{ id: "cleaning", name: "Commercial Cleaning",
  terminology: { visit: "Job", client: "Property", worker: "Technician", trip: "Route" } }
```

- [ ] **Step 3: Create terminology context** — React context that reads tenant settings and provides term labels throughout the UI. E.g., `useTerm("visit")` returns "Shift" for security tenants.

- [ ] **Step 4: Apply terminology to sidebar, page titles, and table headers**

- [ ] **Step 5: Commit**

```bash
git add packages/ apps/
git commit -m "feat: add industry plugin system with dynamic terminology"
```

---

### Task 20: TanStack Query Provider + Global Error Handling

**Files:**
- Create: `apps/web/src/components/providers.tsx`
- Modify: `apps/web/src/app/layout.tsx` — wrap with providers

- [ ] **Step 1: Create providers component** with QueryClientProvider + error boundary

- [ ] **Step 2: Add auto-refresh token logic** — Intercept 401 responses in api-client, attempt token refresh, retry original request.

- [ ] **Step 3: Commit**

```bash
git add apps/web/
git commit -m "feat: add global providers, error handling, and token refresh"
```

---

## Chunk 7: Database Migration, Seed, and Dev Setup

### Task 21: End-to-End Dev Environment

- [ ] **Step 1: Copy `.env.example` to `.env`**
- [ ] **Step 2: Start Docker services** — `docker-compose up -d`
- [ ] **Step 3: Install all dependencies** — `npm install` (from root)
- [ ] **Step 4: Push schema to database** — `cd packages/db && npx drizzle-kit push`
- [ ] **Step 5: Run seed** — `cd packages/db && npx tsx src/seed.ts`
- [ ] **Step 6: Start dev servers** — `npm run dev` (starts both web + api via turbo)
- [ ] **Step 7: Test login** — Navigate to `http://localhost:3000/login`, login with `admin@demo.evv / admin123!`
- [ ] **Step 8: Verify all pages load** — Click through sidebar navigation

---

## Chunk 8: Mobile App (Future Phase)

> This chunk is deferred. The mobile app (React Native + Expo) will be added once the web admin portal and API are stable. It will implement:
> - My Schedule screen
> - GPS check-in/check-out flow
> - Offline mode with SQLite queue
> - Push notifications
> - Form completion
>
> This will be planned as a separate implementation plan when ready.

---

## Execution Order Summary

| Phase | Tasks | What You Get |
|-------|-------|-------------|
| **1. Foundation** | Tasks 1-5 | Monorepo, DB schema, auth API, Next.js shell with login |
| **2. CRUD** | Tasks 6-9 | Workers, recipients, service types — full CRUD API + UI |
| **3. EVV Core** | Tasks 10-12 | Visits, check-in/out, operations worklist, calendar |
| **4. Billing/Reports/Forms** | Tasks 13-15 | Billing pipeline, report engine, digital forms |
| **5. Dashboard/Notifs/Settings** | Tasks 16-18 | Live metrics, notifications, org settings |
| **6. Plugins/Polish** | Tasks 19-20 | Industry plugins, terminology system, token refresh |
| **7. Dev Setup** | Task 21 | Full dev environment running end-to-end |
| **8. Mobile** | Deferred | React Native field worker app |

---

*End of Implementation Plan*
