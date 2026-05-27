# Universal EVV Platform — Design Specification

> **Version:** 1.0
> **Date:** 2026-05-27
> **Status:** Draft
> **Reference Platform:** GEOH (geoh.app)

---

## 1. Vision & Scope

**Product vision:** The operating system for field workforce accountability — a multi-tenant SaaS platform that brings Electronic Visit Verification beyond healthcare into security, cleaning, construction, delivery, logistics, education, government, telecom, and sales.

**Core premise:** Every industry that deploys workers to locations needs to answer the same questions: *Who showed up? Where? When? What did they do? How do we bill for it?* GEOH answers these for home care. This platform answers them for everyone.

### 1.1 Target Industries

| Industry | "Visit" Term | "Client" Term | Verification Method | Billing Model |
|----------|-------------|---------------|-------------------|---------------|
| Healthcare / Home Care | Visit | Patient / Client | GPS + signature | Medicaid claims / insurance |
| Security / Guarding | Shift / Patrol | Property / Site | GPS + NFC tap + QR scan | Hourly / contract |
| Commercial Cleaning | Job / Service | Property / Account | GPS + photo proof | Per-visit / contract |
| Construction | Shift / Task | Job Site | GPS + photo proof | Hourly / project |
| Delivery / Logistics | Delivery / Stop | Recipient / Customer | GPS + signature + photo | Per-delivery / route |
| Home Services (HVAC, plumbing) | Appointment | Customer | GPS + signature | Per-job / hourly |
| Education (tutoring, therapy) | Session | Student / Family | GPS + signature | Per-session / hourly |
| Government (inspections) | Inspection / Visit | Site / Case | GPS + photo + form | Per-inspection |

### 1.2 Design Principles

1. **Industry-agnostic core, industry-specific plugins** — The platform core handles scheduling, verification, billing, and workforce management. Industry plugins configure terminology, compliance rules, default service types, and form templates.
2. **Configuration over code** — New industries are added by configuration (plugin definitions), not new code paths.
3. **Multi-tenant isolation** — Each organization's data, branding, and settings are fully isolated.
4. **Mobile-first verification** — The field worker experience is a mobile app. The admin experience is a responsive web app.
5. **Offline-capable** — Field workers must be able to clock in/out and complete forms without connectivity, syncing when back online.

---

## 2. Platform Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                       │
├──────────────────────┬──────────────────────┬───────────────────┤
│   Admin Web Portal   │   Mobile App (PWA)   │   Public API      │
│   (React/Next.js)    │   (React Native)     │   (REST + WS)     │
└──────────┬───────────┴──────────┬───────────┴─────────┬─────────┘
           │                      │                      │
┌──────────▼──────────────────────▼──────────────────────▼─────────┐
│                         API GATEWAY                              │
│              Authentication · Rate Limiting · Routing            │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                       SERVICE LAYER                              │
├─────────┬──────────┬──────────┬──────────┬──────────┬───────────┤
│  Auth   │Schedule  │  EVV     │ Billing  │Workforce │  Reports  │
│ Service │ Service  │ Service  │ Service  │ Service  │  Service  │
├─────────┴──────────┴──────────┴──────────┴──────────┴───────────┤
│                     PLUGIN ENGINE                                │
│         Industry configs · Custom fields · Form schemas          │
├─────────────────────────────────────────────────────────────────┤
│                     DATA LAYER                                   │
│     PostgreSQL (primary) · Redis (cache/sessions) · S3 (files)  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Multi-Tenancy Model

- **Database-level isolation**: Shared database, tenant-scoped schemas (or row-level security with `tenant_id` on every table).
- **Tenant context**: Every API request carries `tenant_id` via JWT claims. Middleware enforces scoping automatically.
- **Tenant configuration** stored as JSON: terminology overrides, enabled modules, branding, compliance rules, verification methods.

---

## 3. Module Specifications

### 3.1 Dashboard

**GEOH equivalent:** Dashboard > Employee Tasklist + Metrics

#### 3.1.1 Workforce Tasklist

A real-time view of pending, overdue, and completed tasks for the workforce.

**Data model:**

```
WorkforceTask {
  id: UUID
  tenant_id: UUID
  worker_id: UUID → Worker
  task_type_id: UUID → TaskType       // e.g., "TB Test", "Site Inspection", "Equipment Check"
  status: enum(upcoming, action_required, overdue, completed)
  reason: string                       // optional context
  start_date: date
  due_date: date
  completed_date: date | null
  created_at: timestamp
  updated_at: timestamp
}

TaskType {
  id: UUID
  tenant_id: UUID
  name: string                         // "CPR Certification", "Background Check", etc.
  category: string                     // grouping
  recurrence: enum(once, annual, biannual, quarterly, monthly, custom)
  recurrence_days: int | null          // for custom
  requires_document: boolean           // must upload proof?
  is_active: boolean
}
```

**Summary cards** (top of page):
| Card | Filter |
|------|--------|
| Upcoming | status = upcoming, due_date > today |
| Action Required | status = action_required |
| Overdue | status = overdue (due_date < today, not completed) |
| Completed | status = completed |

**Table columns:** Worker Name, Task, Reason, Status, Start Date, Due Date, Completed Date

**Actions:** + Create Task, bulk actions, search/filter, column configuration

#### 3.1.2 Metrics Dashboard

Pluggable widget grid showing KPIs relevant to the tenant's industry.

**Default widgets:**
- Visits today / this week / this month (count + trend)
- Verification compliance rate (% of visits with valid check-in/out)
- Workforce utilization (scheduled hours vs. available hours)
- Revenue summary (billed / collected / outstanding)
- Alert count (missed visits, overdue tasks)

**Widget configuration:** Tenants can show/hide widgets and rearrange layout. Industry plugins provide additional widgets (e.g., healthcare: "Claims pending", security: "Patrol completion rate").

---

### 3.2 Operations Worklist (EVV Core)

**GEOH equivalent:** Operations > Operations Worklist

The nerve center of the platform — surfaces all visits/shifts that need attention.

#### 3.2.1 Data Model

```
Visit {
  id: UUID
  tenant_id: UUID
  service_recipient_id: UUID → ServiceRecipient
  worker_id: UUID → Worker
  service_type_id: UUID → ServiceType
  label: string | null

  // Scheduling
  scheduled_start: timestamp
  scheduled_end: timestamp
  scheduled_units: decimal

  // Actuals (EVV data)
  actual_start: timestamp | null
  actual_end: timestamp | null
  actual_units: decimal | null

  // Verification
  check_in_method: enum(gps, nfc, qr, biometric, signature, photo, manual) | null
  check_in_lat: decimal | null
  check_in_lng: decimal | null
  check_in_accuracy: decimal | null
  check_out_method: enum(...) | null
  check_out_lat: decimal | null
  check_out_lng: decimal | null
  check_out_accuracy: decimal | null

  // Status
  verification_status: enum(verified, check_in_missed, check_out_missed, missed_visit, needs_review, invalid_data)
  billing_status: enum(unbilled, on_hold, ready_to_bill, billed, denied, partially_paid, paid, uncollectable)

  // Notes & forms
  notes: text | null
  form_submissions: jsonb | null       // completed digital forms
  attachments: jsonb | null            // photos, signatures, documents

  created_at: timestamp
  updated_at: timestamp
}
```

#### 3.2.2 Worklist UI

**Filter cards** (top row, clickable to filter table):
| Card | Count | Color |
|------|-------|-------|
| Up to Date | (date selector) | Green |
| Check-in Missed | n | Red |
| Check-out Missed | n | Orange |
| Missed Visit | n | Orange |
| Needs Review | n | Yellow |
| Invalid Data | n | Red (flagged) |

**Table columns:** Service Recipient, Errors/Warnings, Worker, Label, Scheduled Time, Actual Time, Scheduled Units, Visit Units

**Actions per row:** Edit visit, reassign worker, mark as reviewed, add note, view verification details (map + timestamps)

**Bulk actions:** Mark reviewed, reassign, export

---

### 3.3 Scheduling

**GEOH equivalent:** Scheduling > Schedule + Visits + Trips

#### 3.3.1 Calendar View

- **Week view** (default): 7-day columns, time slots on Y-axis, visit cards placed by time
- **Month view**: condensed day cells with visit counts
- **Day view**: detailed single-day timeline
- **List view**: tabular format with sorting/filtering

**Visit card** on calendar shows:
- Worker name
- Time range
- Service recipient name
- Service type
- Status indicator (color: green=completed, blue=active/in-progress, red=missed, gray=scheduled)

**Actions:** + New Visit, + New Trip/Route, drag-to-reschedule, click to edit

#### 3.3.2 Visits Sub-Module

List view of all visits with advanced filtering:
- Date range, worker, service recipient, service type, status
- Sortable columns, column configuration
- Export (CSV, Excel, PDF)

#### 3.3.3 Trips / Route Management

Group multiple visits into a route/trip for a single worker.

```
Trip {
  id: UUID
  tenant_id: UUID
  worker_id: UUID → Worker
  name: string
  date: date
  status: enum(planned, in_progress, completed, cancelled)
  visits: UUID[] → Visit[]            // ordered list
  estimated_distance: decimal | null
  estimated_duration: int | null       // minutes
  actual_distance: decimal | null
  actual_duration: int | null
}
```

#### 3.3.4 Smart Matching Engine

AI-powered worker-to-visit assignment considering:
- **Skills/certifications**: worker has required qualifications for the service type
- **Proximity**: worker's location or home base vs. service location
- **Availability**: worker's schedule, shift preferences, overtime limits
- **Continuity**: prefer assigning the same worker to recurring visits (relationship continuity)
- **Cost**: minimize travel time/distance across all assignments
- **Language/preferences**: match language, gender preferences where applicable

---

### 3.4 Service Recipient Management

**GEOH equivalent:** Clients > View Clients + Authorizations

#### 3.4.1 Service Recipients

The entity receiving the service. Configurable label per industry.

```
ServiceRecipient {
  id: UUID
  tenant_id: UUID

  // Identity
  name: string                         // or first_name + last_name for individuals
  type: enum(individual, organization, property, site)
  status: enum(active, inactive, discharged, suspended)

  // Contact
  address: Address
  phone: string
  email: string | null

  // Relationships
  primary_contact_id: UUID | null → Contact
  assigned_manager_id: UUID | null → Worker

  // Custom fields (industry-specific, stored as JSONB)
  custom_fields: jsonb

  // Metadata
  notes: text | null
  tags: string[]
  created_at: timestamp
  updated_at: timestamp
}
```

**GEOH-specific columns that become configurable custom fields:**
- Salesperson, Supervisory Nurse, Admission Nurse, Case Manager, Referring → all become `custom_fields` or linked contacts with configurable role labels

**Table UI:** Searchable list, column configuration, + New Recipient, bulk export

#### 3.4.2 Service Agreements (Authorizations)

Define what services are authorized/contracted for a recipient.

```
ServiceAgreement {
  id: UUID
  tenant_id: UUID
  service_recipient_id: UUID → ServiceRecipient
  service_type_id: UUID → ServiceType

  // Authorization details
  status: enum(active, pending, expired, cancelled)
  start_date: date
  end_date: date

  // Units
  authorized_units: decimal            // total approved
  used_units: decimal                  // consumed so far
  unit_type: enum(hours, visits, days, units)

  // Rates
  rate: decimal
  rate_type: enum(per_hour, per_visit, per_day, per_unit, flat_fee)

  // Payer
  payer_id: UUID | null → Payer        // insurance, Medicaid, direct client, etc.
  authorization_number: string | null   // external reference

  notes: text | null
  created_at: timestamp
  updated_at: timestamp
}
```

---

### 3.5 Workforce Management

**GEOH equivalent:** Employees

#### 3.5.1 Worker Registry

```
Worker {
  id: UUID
  tenant_id: UUID
  user_id: UUID → User                // login account

  // Identity
  first_name: string
  last_name: string
  position: string | null

  // Role & organization
  role_id: UUID → Role                 // Employee, Admin, Scheduler, Manager, etc.
  group_ids: UUID[] → Group[]
  manager_id: UUID | null → Worker     // staff manager / supervisor
  employment_type: enum(employee, contractor, temp, volunteer)

  // Contact
  phone: string
  email: string
  address: Address | null

  // Employment
  status: enum(active, inactive, terminated, on_leave)
  hire_date: date
  termination_date: date | null

  // Skills & credentials (linked via WorkforceTask + Credential tables)
  skills: string[]
  languages: string[]

  // Custom fields
  custom_fields: jsonb

  created_at: timestamp
  updated_at: timestamp
}
```

**Table columns:** Name, Position, Role, Staff Manager, Phone, Email, Status, Hire Date
**Filters sidebar:** Roles dropdown, Groups dropdown
**Actions:** + New Employee, Resubmit, Copy, Email, Print, CSV, Excel export
**Pagination:** configurable per-page (20 default)

#### 3.5.2 Credential Tracking

```
Credential {
  id: UUID
  tenant_id: UUID
  worker_id: UUID → Worker
  credential_type_id: UUID → TaskType

  status: enum(valid, expiring_soon, expired, pending_verification)
  issue_date: date | null
  expiry_date: date | null
  document_url: string | null          // uploaded proof
  verified_by: UUID | null → User
  verified_at: timestamp | null

  created_at: timestamp
  updated_at: timestamp
}
```

---

### 3.6 Billing & Financials

**GEOH equivalent:** Smart Billing > Billing Worklist

#### 3.6.1 Billing Pipeline

```
Visits flow through billing statuses:

  ┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌────────┐
  │ On Hold  │───▶│ Unbilled │───▶│ Ready to Bill│───▶│ Billed │
  └──────────┘    └──────────┘    └──────────────┘    └───┬────┘
                                                          │
                                    ┌─────────────────────┼──────────────┐
                                    ▼                     ▼              ▼
                              ┌──────────┐         ┌───────────┐  ┌──────────────┐
                              │  Denied  │         │ Partially │  │     Paid     │
                              │          │         │   Paid    │  │              │
                              └──────────┘         └───────────┘  └──────────────┘
                                    │
                                    ▼
                           ┌───────────────┐
                           │ Uncollectable │
                           └───────────────┘
```

#### 3.6.2 Billing Worklist UI

**Summary cards** (top row):
| Card | Shows |
|------|-------|
| On Hold Visits | $amount / count |
| Unbilled Visits | $amount / count |
| Ready to Bill | $amount / count |
| Billed Visits | $amount / count |
| Denied Visits | $amount / count |
| Partially Paid | $amount / count |
| Uncollectable | $amount / count |

**Table columns:** Service Recipient, Billing Status, Service Type, Actual Time, Visit Units, Calculated Amount, Billed Amount, Paid Amount, Balance Due

#### 3.6.3 Service Catalog (Visit Types)

**GEOH equivalent:** Agency Management > Visit Types

```
ServiceType {
  id: UUID
  tenant_id: UUID

  name: string                         // "RHS Daily - Level 2", "Night Patrol", "Deep Clean"
  description: string
  code: string | null                  // service code (T2016, custom codes)

  // Pricing
  unit_type: enum(hours, partial_units, per_day, per_visit, flat)
  rounding: enum(none, nearest_15min, nearest_30min, nearest_hour, round_up, round_down)
  unit_rate: decimal
  per_diem: decimal | null

  // Configuration
  requires_form: UUID | null → FormTemplate
  verification_methods: string[]       // which methods are acceptable
  min_duration: int | null             // minutes
  max_duration: int | null

  is_active: boolean
  color: string | null                 // for calendar display

  created_at: timestamp
  updated_at: timestamp
}
```

#### 3.6.4 Invoice Generation

For non-claims industries, the platform generates invoices:

```
Invoice {
  id: UUID
  tenant_id: UUID
  invoice_number: string               // auto-generated
  payer_id: UUID → Payer

  status: enum(draft, sent, partially_paid, paid, overdue, cancelled)

  line_items: InvoiceLineItem[]
  subtotal: decimal
  tax: decimal
  total: decimal

  issue_date: date
  due_date: date
  paid_amount: decimal

  created_at: timestamp
  updated_at: timestamp
}

InvoiceLineItem {
  visit_id: UUID → Visit
  service_type: string
  description: string
  quantity: decimal
  unit_rate: decimal
  amount: decimal
}
```

---

### 3.7 Reporting

**GEOH equivalent:** Reporting > Report Center

#### 3.7.1 Report Engine

Async report generation system (same pattern as GEOH).

```
Report {
  id: UUID
  tenant_id: UUID

  name: string
  template_id: UUID → ReportTemplate
  parameters: jsonb                    // date range, filters, groupings

  status: enum(queued, processing, completed, failed)
  initiated_by: UUID → User

  queued_at: timestamp
  started_at: timestamp | null
  completed_at: timestamp | null
  failed_at: timestamp | null

  output_format: enum(pdf, csv, excel)
  output_url: string | null            // S3 link to generated file
  progress: int                        // 0-100
  outcome: text | null                 // error message if failed
}
```

#### 3.7.2 Report Templates

Pre-built and custom report templates:

**Universal templates:**
- Visit Summary (by date range, worker, recipient, service type)
- Verification Compliance (missed check-ins, exceptions)
- Workforce Utilization (hours scheduled vs. worked)
- Billing Summary (revenue by period, service type, payer)
- Payroll Report (hours worked, overtime, by worker)
- Credential Status (upcoming expirations, overdue)
- Audit Trail (system activity log)

**Industry-specific templates** (provided by plugins):
- Healthcare: EVV state submission report, authorization utilization, clinical documentation summary
- Security: patrol completion, incident report summary, site coverage
- Cleaning: service completion, quality inspection results
- Delivery: on-time delivery rate, route efficiency

---

### 3.8 Organization Settings

**GEOH equivalent:** Agency Management

#### 3.8.1 Module Breakdown

| Sub-Module | GEOH Equivalent | Purpose |
|------------|----------------|---------|
| Service Catalog | Visit Types | Define service types, rates, billing rules |
| Task Types | Tasks | Define credential/compliance tracking items |
| External Contacts | Case Managers, Physicians, Specialists | Contacts outside the org (supervisors, inspectors, etc.) |
| Partner Organizations | Case Management Offices | Linked organizations |
| Document Templates | Documents | Form templates, checklists, report layouts |
| Roles & Permissions | Role List | RBAC configuration |
| Integrations | Service Connections | External system connections (API, webhooks) |
| Tenant Settings | Agency Settings | Branding, timezone, locale, compliance config |

#### 3.8.2 External Contacts

```
ExternalContact {
  id: UUID
  tenant_id: UUID

  name: string
  role_label: string                   // configurable: "Case Manager", "Property Manager", "Inspector"
  organization: string | null
  phone: string | null
  email: string | null
  fax: string | null

  linked_recipients: UUID[] → ServiceRecipient[]

  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

#### 3.8.3 Tenant Settings

```
TenantSettings {
  tenant_id: UUID

  // Branding
  name: string                         // organization name
  logo_url: string | null
  primary_color: string
  custom_domain: string | null

  // Localization
  timezone: string                     // e.g., "America/Indiana/Indianapolis"
  locale: string                       // e.g., "en-US"
  currency: string                     // e.g., "USD"
  date_format: string

  // Industry
  industry_plugin: string              // "healthcare", "security", "cleaning", etc.

  // Terminology overrides
  terminology: {
    visit: string                      // "Visit", "Shift", "Job", "Delivery"
    client: string                     // "Client", "Patient", "Property", "Site"
    worker: string                     // "Employee", "Caregiver", "Guard", "Technician"
    trip: string                       // "Trip", "Route", "Patrol"
  }

  // Verification rules
  verification: {
    allowed_methods: string[]          // ["gps", "nfc", "qr", "signature", "photo"]
    gps_radius_meters: int             // max distance from site for valid check-in
    require_photo_on_checkin: boolean
    require_photo_on_checkout: boolean
    require_signature: boolean
    allow_manual_override: boolean
    auto_checkout_after_minutes: int | null
  }

  // Compliance
  compliance: {
    max_shift_hours: int               // overtime threshold
    break_required_after_hours: int | null
    credential_expiry_warning_days: int // days before expiry to flag
  }

  // Modules enabled
  enabled_modules: string[]            // ["scheduling", "billing", "reporting", "forms", "trips"]
}
```

---

### 3.9 Alerts & Notifications

**GEOH equivalent:** Notifications + Fax

#### 3.9.1 Notification System

```
Notification {
  id: UUID
  tenant_id: UUID
  user_id: UUID → User

  type: enum(
    check_in_missed, check_out_missed, missed_visit,
    credential_expiring, credential_expired,
    visit_assigned, visit_cancelled, visit_updated,
    invoice_overdue, payment_received,
    system_alert, custom
  )

  title: string
  body: string
  action_url: string | null            // deep link to relevant page

  channels: string[]                   // ["in_app", "push", "sms", "email"]

  read: boolean
  read_at: timestamp | null

  created_at: timestamp
}
```

#### 3.9.2 Document Delivery

Replaces GEOH's Fax module with multi-channel document sending:
- **Email**: PDF attachments, automated reports
- **Fax** (legacy): via API integration (e.g., Twilio Fax, SRFax)
- **API push**: webhook delivery to external systems
- **In-app**: document available in portal

---

### 3.10 Digital Forms Engine

**GEOH equivalent:** Forms (clinical documentation)

Configurable form builder for field workers to complete during visits.

#### 3.10.1 Form Templates

```
FormTemplate {
  id: UUID
  tenant_id: UUID

  name: string                         // "Inspection Checklist", "Care Plan", "Delivery Confirmation"
  description: string | null
  category: string | null

  schema: jsonb                        // JSON Schema defining form fields
  ui_schema: jsonb | null              // optional UI hints (field ordering, sections, conditionals)

  required_for_service_types: UUID[]   // auto-attached to these service types

  version: int
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

**Field types supported:** text, number, date, time, select, multi-select, checkbox, radio, textarea, signature, photo, GPS location, barcode/QR scan, file upload, section header, calculated field.

#### 3.10.2 Form Submissions

```
FormSubmission {
  id: UUID
  tenant_id: UUID
  visit_id: UUID → Visit
  form_template_id: UUID → FormTemplate
  submitted_by: UUID → User

  data: jsonb                          // completed form data
  attachments: string[]                // URLs to uploaded files

  status: enum(draft, submitted, reviewed, approved, rejected)
  reviewed_by: UUID | null → User
  reviewed_at: timestamp | null

  submitted_at: timestamp
  created_at: timestamp
}
```

---

## 4. Role-Based Access Control (RBAC)

### 4.1 Default Roles

| Role | Dashboard | Operations | Scheduling | Recipients | Workforce | Billing | Reports | Settings |
|------|-----------|-----------|------------|------------|-----------|---------|---------|----------|
| **Super Admin** | Full | Full | Full | Full | Full | Full | Full | Full |
| **Admin** | Full | Full | Full | Full | Full | Full | Full | Limited |
| **Manager** | Team view | Team view | Team view | Assigned | Team view | View only | Team reports | None |
| **Scheduler** | View only | View only | Full | View only | View only | None | Schedule reports | None |
| **Billing Specialist** | View only | View only | View only | View only | View only | Full | Billing reports | None |
| **Field Worker** | Own tasks | None | Own schedule | Assigned | Own profile | None | None | None |

### 4.2 Permission Model

```
Permission {
  resource: string       // "visits", "workers", "billing", "settings", etc.
  action: string         // "create", "read", "update", "delete", "export"
  scope: enum(own, team, all)  // own data, their team's data, or all tenant data
}

Role {
  id: UUID
  tenant_id: UUID
  name: string
  is_system: boolean     // system roles can't be deleted
  permissions: Permission[]
}
```

Custom roles can be created per tenant with granular permission assignment.

---

## 5. Mobile App (Field Worker Experience)

### 5.1 Core Screens

1. **My Schedule** — Today's visits with status indicators, tap to navigate/start
2. **Check In** — GPS capture + configured verification method (photo, NFC, QR, signature)
3. **Visit In Progress** — Timer, notes, form completion, task checklist
4. **Check Out** — GPS capture + verification + summary review
5. **My Tasks** — Credential renewals, required trainings, pending items
6. **My Profile** — Personal info, documents, availability settings
7. **Notifications** — Push notification inbox

### 5.2 Offline Mode

- Schedule synced to device on app open and periodically
- Check-in/out data stored locally (SQLite) when offline
- Form submissions queued for upload
- Photos/signatures stored locally and uploaded when connected
- Sync indicator showing pending uploads
- Conflict resolution: server wins for schedule changes, device wins for verification data

---

## 6. Industry Plugin System

### 6.1 Plugin Definition

Each industry plugin is a configuration bundle:

```
IndustryPlugin {
  id: string                           // "healthcare", "security", "cleaning"
  name: string                         // "Healthcare / Home Care"

  terminology: {
    visit, client, worker, trip         // label overrides
  }

  default_service_types: ServiceType[] // pre-configured service catalog

  default_task_types: TaskType[]       // credential types to track

  default_form_templates: FormTemplate[] // industry forms

  default_verification_config: {
    allowed_methods, gps_radius, etc.
  }

  compliance_rules: {                  // industry-specific rules
    max_shift_hours, break_requirements, etc.
  }

  report_templates: ReportTemplate[]   // industry-specific reports

  integrations: {                      // suggested integrations
    available: string[]                // "medicaid_evv", "quickbooks", "alarm_monitoring"
  }
}
```

### 6.2 Initial Plugins

**Phase 1:**
- Healthcare / Home Care (reference: GEOH feature parity)

**Phase 2:**
- Security / Guarding
- Commercial Cleaning

**Phase 3:**
- Construction
- Delivery / Logistics
- Home Services

---

## 7. Navigation Structure

### 7.1 Admin Sidebar

```
┌─────────────────────────────┐
│  [Logo / Org Name]          │
│  [User Name] ▼              │
├─────────────────────────────┤
│  ■ Dashboard                │
│    ├ Workforce Tasklist      │
│    └ Metrics                 │
│                              │
│  ■ Operations                │
│    └ Verification Worklist   │
│                              │
│  ■ Scheduling                │
│    ├ Schedule                │
│    ├ Visits                  │
│    └ Routes / Trips          │
│                              │
│  ■ Service Recipients        │
│    ├ View All                │
│    └ Service Agreements      │
│                              │
│  ■ Workforce                 │
│    └ (expandable +)          │
│                              │
│  ■ Billing                   │
│    └ Billing Worklist        │
│                              │
│  ■ Reporting                 │
│    └ Report Center           │
│                              │
│  ■ Documents                 │
│                              │
│  ■ Organization Settings     │
│    ├ Service Catalog         │
│    ├ Task Types              │
│    ├ External Contacts       │
│    ├ Partner Orgs            │
│    ├ Form Templates          │
│    ├ Roles & Permissions     │
│    ├ Integrations            │
│    └ Settings                │
│                              │
│  ■ Help                      │
├─────────────────────────────┤
│  Version X.X.X              │
└─────────────────────────────┘
```

### 7.2 Global Elements

- **Search bar** (top): "Search Everything (Ctrl+F)" — searches across visits, workers, recipients, etc.
- **Right sidebar** (collapsible): Activity log, Quick actions, Notifications bell
- **Breadcrumbs**: Home > Module > Sub-page

---

## 8. Tech Stack Recommendation

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend (Admin)** | Next.js 15 + React 19 | SSR, file-based routing, React Server Components |
| **UI Components** | shadcn/ui + Tailwind CSS 4 | Accessible, customizable, fast to build |
| **State Management** | TanStack Query + Zustand | Server state + minimal client state |
| **Mobile App** | React Native + Expo | Cross-platform, shared business logic |
| **Backend API** | Node.js + Hono (or Fastify) | Lightweight, fast, TypeScript-native |
| **Database** | PostgreSQL 17 | JSONB for custom fields, row-level security |
| **Cache** | Redis | Sessions, real-time data, job queues |
| **File Storage** | S3-compatible (AWS/MinIO) | Documents, photos, signatures |
| **Auth** | NextAuth.js / Lucia Auth | JWT + refresh tokens, SSO-ready |
| **Real-time** | WebSockets (Socket.io) | Live dashboard updates, visit tracking |
| **Job Queue** | BullMQ (Redis-backed) | Async report generation, notifications |
| **Search** | PostgreSQL full-text (v1), Meilisearch (v2) | Start simple, scale later |
| **Maps** | Mapbox GL / Leaflet | GPS visualization, geofencing |
| **Hosting** | Vercel (frontend) + Railway/Fly.io (API) | Or self-hosted on VPS |

---

## 9. Database Schema Summary

### 9.1 Core Tables

```
tenants                    -- organizations
users                      -- login accounts
workers                    -- field staff (linked to users)
roles                      -- RBAC roles
permissions                -- granular permissions
service_recipients         -- clients/patients/sites
service_agreements         -- authorizations/contracts
service_types              -- service catalog
visits                     -- the core EVV record
trips                      -- grouped visit routes
workforce_tasks            -- credential/compliance tasks
task_types                 -- task type definitions
credentials                -- worker credentials
billing_records            -- billing pipeline
invoices                   -- generated invoices
invoice_line_items         -- invoice details
payers                     -- billing targets
reports                    -- async report jobs
report_templates           -- report definitions
form_templates             -- digital form schemas
form_submissions           -- completed forms
notifications              -- alerts & notifications
external_contacts          -- contacts outside org
partner_organizations      -- linked orgs
documents                  -- uploaded documents
audit_log                  -- system activity trail
tenant_settings            -- per-tenant configuration
industry_plugins           -- plugin definitions
```

### 9.2 Key Relationships

```
tenant ──┬── workers ──── credentials
         │       │──── workforce_tasks
         │       └──── visits ──── form_submissions
         │                │──── billing_records ──── invoices
         │                └──── trips
         ├── service_recipients ──── service_agreements
         ├── service_types
         ├── roles ──── permissions
         ├── external_contacts
         └── tenant_settings
```

---

## 10. API Structure

### 10.1 REST Endpoints

```
Auth:
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/logout

Dashboard:
  GET    /api/dashboard/metrics
  GET    /api/dashboard/tasks

Visits:
  GET    /api/visits                    ?status=&date=&worker_id=&recipient_id=
  POST   /api/visits
  GET    /api/visits/:id
  PATCH  /api/visits/:id
  DELETE /api/visits/:id
  POST   /api/visits/:id/check-in       { lat, lng, method, photo?, signature? }
  POST   /api/visits/:id/check-out      { lat, lng, method, photo?, signature? }

Scheduling:
  GET    /api/schedule                  ?week=&worker_id=
  POST   /api/schedule/auto-assign      (smart matching)

Workers:
  GET    /api/workers                   ?role=&group=&status=
  POST   /api/workers
  GET    /api/workers/:id
  PATCH  /api/workers/:id
  GET    /api/workers/:id/credentials
  GET    /api/workers/:id/schedule

Service Recipients:
  GET    /api/recipients                ?status=&search=
  POST   /api/recipients
  GET    /api/recipients/:id
  PATCH  /api/recipients/:id
  GET    /api/recipients/:id/agreements
  POST   /api/recipients/:id/agreements

Billing:
  GET    /api/billing/worklist          ?status=&date_range=
  PATCH  /api/billing/:visit_id         { status }
  POST   /api/billing/generate-invoices
  GET    /api/invoices
  GET    /api/invoices/:id

Reports:
  GET    /api/reports
  POST   /api/reports                   { template_id, parameters }
  GET    /api/reports/:id
  GET    /api/reports/:id/download

Forms:
  GET    /api/form-templates
  POST   /api/form-templates
  POST   /api/visits/:id/forms          { template_id, data }

Settings:
  GET    /api/settings
  PATCH  /api/settings
  GET    /api/service-types
  POST   /api/service-types
  GET    /api/roles
  POST   /api/roles
```

### 10.2 WebSocket Events

```
visit:check-in              -- real-time check-in notification
visit:check-out             -- real-time check-out notification
visit:missed                -- missed visit alert
worker:location-update      -- live worker location (opt-in)
notification:new            -- new notification pushed
dashboard:refresh           -- metrics updated
```

---

## Appendix A: GEOH Feature Parity Checklist

| GEOH Feature | Universal EVV Equivalent | Status |
|-------------|------------------------|--------|
| GPS-verified check-in/out | Multi-method verification | Designed |
| Operations Worklist | Verification Worklist | Designed |
| Weekly schedule calendar | Schedule (week/month/day/list) | Designed |
| Visits & Trips | Visits & Routes | Designed |
| Client list + Authorizations | Service Recipients + Agreements | Designed |
| Employee list + roles/groups | Workforce + RBAC | Designed |
| Employee Tasklist (credentials) | Workforce Tasklist | Designed |
| Smart Billing worklist | Billing Worklist + Invoices | Designed |
| Visit Types (service codes, rates) | Service Catalog | Designed |
| Report Center (async) | Report Engine | Designed |
| Fax | Document Delivery (multi-channel) | Designed |
| Agency Management | Organization Settings | Designed |
| Case Managers / Physicians | External Contacts (configurable roles) | Designed |
| Search Everything | Global Search | Designed |
| Notifications | Alerts & Notifications | Designed |
| Forms (clinical docs) | Digital Forms Engine | Designed |
| Mobile app (offline) | Mobile App (PWA / React Native) | Designed |
| Multi-location | Multi-tenant | Designed |

---

*End of Design Specification*
