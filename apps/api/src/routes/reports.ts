import { Hono } from "hono";
import { getAuth } from "../middleware/auth";
import * as reportService from "../services/report.service";

export const reportRoutes = new Hono();

reportRoutes.get("/", async (c) => {
  const { tenantId } = getAuth(c);
  const reports = await reportService.listReports(tenantId);
  return c.json({ data: reports });
});

reportRoutes.get("/templates", async (c) => {
  const { tenantId } = getAuth(c);
  const templates = await reportService.listReportTemplates(tenantId);
  return c.json({ data: templates });
});

reportRoutes.post("/templates", async (c) => {
  const { tenantId } = getAuth(c);
  const body = await c.req.json();
  const template = await reportService.createReportTemplate(tenantId, body);
  return c.json({ data: template }, 201);
});

reportRoutes.get("/:id", async (c) => {
  const { tenantId } = getAuth(c);
  const report = await reportService.getReport(tenantId, c.req.param("id"));
  if (!report) return c.json({ error: "Report not found" }, 404);
  return c.json({ data: report });
});

reportRoutes.post("/", async (c) => {
  const { tenantId, userId } = getAuth(c);
  const body = await c.req.json();
  const report = await reportService.createReport(tenantId, {
    ...body,
    initiatedBy: userId,
  });
  return c.json({ data: report }, 201);
});
