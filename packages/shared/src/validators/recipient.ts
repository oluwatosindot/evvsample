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
