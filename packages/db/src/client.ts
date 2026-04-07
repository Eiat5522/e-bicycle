import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let client: postgres.Sql | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl && !databaseUrl.includes("replace-with")) {
    return databaseUrl;
  }

  const supabaseDatabasePassword = process.env.SUPABASE_DATABASE_PASSWORD?.trim();

  if (supabaseDatabasePassword) {
    return `postgresql://postgres:${encodeURIComponent(
      supabaseDatabasePassword
    )}@db.lcqxsopihpwhbvwrttvw.supabase.co:5432/postgres?sslmode=require`;
  }

  throw new Error("DATABASE_URL or SUPABASE_DATABASE_PASSWORD is required for database access.");
}

export function getDb() {
  if (!client) {
    client = postgres(getDatabaseUrl(), {
      prepare: false
    });
  }

  if (!database) {
    database = drizzle(client, { schema });
  }

  return database;
}

export async function closeDb() {
  if (!client) {
    return;
  }

  await client.end();
  client = undefined;
  database = undefined;
}
