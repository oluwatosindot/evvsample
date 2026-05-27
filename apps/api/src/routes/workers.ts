import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { getAuth } from "../middleware/auth";
import { createWorkerSchema, updateWorkerSchema } from "@evv/shared";
import * as workerService from "../services/worker.service";

export const workerRoutes = new Hono();

workerRoutes.get("/", async (c) => {
  const { tenantId } = getAuth(c);
  const search = c.req.query("search");
  const workers = await workerService.listWorkers(tenantId, search);
  return c.json({ data: workers });
});

workerRoutes.get("/:id", async (c) => {
  const { tenantId } = getAuth(c);
  const worker = await workerService.getWorker(tenantId, c.req.param("id"));
  if (!worker) return c.json({ error: "Worker not found" }, 404);
  return c.json({ data: worker });
});

workerRoutes.post("/", zValidator("json", createWorkerSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const input = c.req.valid("json");
  const worker = await workerService.createWorker(tenantId, input);
  return c.json({ data: worker }, 201);
});

workerRoutes.patch("/:id", zValidator("json", updateWorkerSchema), async (c) => {
  const { tenantId } = getAuth(c);
  const worker = await workerService.updateWorker(tenantId, c.req.param("id"), c.req.valid("json"));
  if (!worker) return c.json({ error: "Worker not found" }, 404);
  return c.json({ data: worker });
});
