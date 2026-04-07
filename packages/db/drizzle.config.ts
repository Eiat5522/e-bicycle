import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL?.trim();
const supabaseDatabasePassword = process.env.SUPABASE_DATABASE_PASSWORD?.trim();

const connectionString =
  databaseUrl && !databaseUrl.includes("replace-with")
    ? databaseUrl
    : supabaseDatabasePassword
      ? `postgresql://postgres:${encodeURIComponent(
          supabaseDatabasePassword
        )}@db.lcqxsopihpwhbvwrttvw.supabase.co:5432/postgres?sslmode=require`
      : undefined;

if (!connectionString) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_PASSWORD is required to run Drizzle Kit.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: connectionString
  }
});
