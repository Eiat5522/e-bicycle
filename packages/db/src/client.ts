import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "./database-url";
import * as schema from "./schema";

let client: postgres.Sql | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

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
