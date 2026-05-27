import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "@evv/shared";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    c.set("auth", {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
    } satisfies AuthContext);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}

export function getAuth(c: Context): AuthContext {
  return c.get("auth") as AuthContext;
}
