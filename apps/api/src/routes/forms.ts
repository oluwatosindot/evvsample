import { Hono } from "hono";
import { getAuth } from "../middleware/auth";
import * as formService from "../services/form.service";

export const formRoutes = new Hono();

formRoutes.get("/templates", async (c) => {
  const { tenantId } = getAuth(c);
  const templates = await formService.listFormTemplates(tenantId);
  return c.json({ data: templates });
});

formRoutes.get("/templates/:id", async (c) => {
  const { tenantId } = getAuth(c);
  const template = await formService.getFormTemplate(tenantId, c.req.param("id"));
  if (!template) return c.json({ error: "Template not found" }, 404);
  return c.json({ data: template });
});

formRoutes.post("/templates", async (c) => {
  const { tenantId } = getAuth(c);
  const body = await c.req.json();
  const template = await formService.createFormTemplate(tenantId, body);
  return c.json({ data: template }, 201);
});

formRoutes.patch("/templates/:id", async (c) => {
  const { tenantId } = getAuth(c);
  const body = await c.req.json();
  const template = await formService.updateFormTemplate(tenantId, c.req.param("id"), body);
  if (!template) return c.json({ error: "Template not found" }, 404);
  return c.json({ data: template });
});

formRoutes.get("/submissions/:visitId", async (c) => {
  const { tenantId } = getAuth(c);
  const submissions = await formService.listFormSubmissions(tenantId, c.req.param("visitId"));
  return c.json({ data: submissions });
});

formRoutes.post("/submissions", async (c) => {
  const { tenantId, userId } = getAuth(c);
  const body = await c.req.json();
  const submission = await formService.createFormSubmission(tenantId, {
    ...body,
    submittedBy: userId,
  });
  return c.json({ data: submission }, 201);
});
