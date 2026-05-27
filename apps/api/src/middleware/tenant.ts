import { Context, Next } from "hono";
import { getAuth } from "./auth";

export async function tenantMiddleware(c: Context, next: Next) {
  const auth = getAuth(c);
  if (!auth.tenantId) {
    return c.json({ error: "Tenant context missing" }, 403);
  }
  await next();
}
