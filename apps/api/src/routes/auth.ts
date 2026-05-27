import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "@evv/db";
import { loginSchema, refreshSchema } from "@evv/shared";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "change-me-refresh";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export const authRoutes = new Hono();

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isActive, true)))
    .limit(1);

  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const tokenPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

  return c.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      tenantId: user.tenantId,
    },
  });
});

authRoutes.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid("json");

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, payload.userId), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    const tokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const newRefreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    return c.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    return c.json({ error: "Invalid refresh token" }, 401);
  }
});

authRoutes.post("/logout", async (c) => {
  return c.json({ message: "Logged out" });
});
