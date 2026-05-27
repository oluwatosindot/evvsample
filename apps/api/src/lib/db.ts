import { createDb, type Database } from "@evv/db";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
    _db = createDb(DATABASE_URL);
  }
  return _db;
}

export const db = new Proxy({} as Database, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
