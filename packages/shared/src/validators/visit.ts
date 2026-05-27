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
