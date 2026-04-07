import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./src/database-url";

const connectionString = getDatabaseUrl();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: connectionString
  }
});
