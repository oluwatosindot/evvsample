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
