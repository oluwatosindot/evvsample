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
