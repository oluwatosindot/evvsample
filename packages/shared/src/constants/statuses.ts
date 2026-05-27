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
