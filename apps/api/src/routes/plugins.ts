import { Hono } from "hono";
import { getAuth } from "../middleware/auth";
import * as pluginService from "../services/plugin.service";

export const pluginRoutes = new Hono();

pluginRoutes.get("/", async (c) => {
  const plugins = await pluginService.listPlugins();
  return c.json({ data: plugins });
});

pluginRoutes.get("/:id", async (c) => {
  const plugin = await pluginService.getPlugin(c.req.param("id"));
  if (!plugin) return c.json({ error: "Plugin not found" }, 404);
  return c.json({ data: plugin });
});

pluginRoutes.get("/tenant/settings", async (c) => {
  const { tenantId } = getAuth(c);
  const tenant = await pluginService.getTenantSettings(tenantId);
  if (!tenant) return c.json({ error: "Tenant not found" }, 404);
  return c.json({ data: tenant });
});

pluginRoutes.patch("/tenant/settings", async (c) => {
  const { tenantId } = getAuth(c);
  const body = await c.req.json();
  const tenant = await pluginService.updateTenantSettings(tenantId, body.settings);
  if (!tenant) return c.json({ error: "Tenant not found" }, 404);
  return c.json({ data: tenant });
});
