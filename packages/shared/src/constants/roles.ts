export const SYSTEM_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  SCHEDULER: "scheduler",
  BILLING_SPECIALIST: "billing_specialist",
  FIELD_WORKER: "field_worker",
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
