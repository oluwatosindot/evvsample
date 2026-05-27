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
