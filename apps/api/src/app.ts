import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth";
import { workerRoutes } from "./routes/workers";
import { recipientRoutes } from "./routes/recipients";
import { visitRoutes } from "./routes/visits";
import { billingRoutes } from "./routes/billing";
import { settingsRoutes } from "./routes/settings";
import { notificationRoutes } from "./routes/notifications";
import { dashboardRoutes } from "./routes/dashboard";
import { reportRoutes } from "./routes/reports";
import { formRoutes } from "./routes/forms";
import { pluginRoutes } from "./routes/plugins";
import { authMiddleware } from "./middleware/auth";
import { tenantMiddleware } from "./middleware/tenant";
import { errorHandler } from "./middleware/error-handler";

export const app = new Hono();

app.use("*", logger());
app.use("*", cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));

app.get("/health", (c) => c.json({ status: "ok" }));

// Public routes
app.route("/api/auth", authRoutes);

// Protected routes
const api = new Hono();
api.use("*", authMiddleware);
api.use("*", tenantMiddleware);

api.route("/dashboard", dashboardRoutes);
api.route("/workers", workerRoutes);
api.route("/recipients", recipientRoutes);
api.route("/visits", visitRoutes);
api.route("/billing", billingRoutes);
api.route("/settings", settingsRoutes);
api.route("/notifications", notificationRoutes);
api.route("/reports", reportRoutes);
api.route("/forms", formRoutes);
api.route("/plugins", pluginRoutes);

app.route("/api", api);
app.onError(errorHandler);
