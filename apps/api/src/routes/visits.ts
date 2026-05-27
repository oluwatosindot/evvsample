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
