import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(connectionString: string) {
  // Parse the URL to extract components, preserving dots in username
  const url = new URL(connectionString);
  const client = postgres({
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1) || "postgres",
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    prepare: false, // Required for Supabase connection pooler
  });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
export * from "./schema";
