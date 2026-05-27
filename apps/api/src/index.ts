import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app";

const PORT = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`EVV API running on http://localhost:${info.port}`);
});
