function getConfiguredUrl(envName: string) {
  const url = process.env[envName]?.trim();

  return url && !url.includes("replace-with") ? url : undefined;
}

function getConfiguredHost(envName: string) {
  const host = process.env[envName]?.trim();

  if (!host || host.includes("replace-with")) {
    return undefined;
  }

  if (!host.includes("://")) {
    return host;
  }

  return new URL(host).host;
}

function withDefaultPostgresPort(host: string) {
  return host.includes(":") ? host : `${host}:5432`;
}

export function getDatabaseUrl() {
  const databaseUrl = getConfiguredUrl("DATABASE_URL") ?? getConfiguredUrl("SUPABASE_DATABASE_URL");

  if (databaseUrl) {
    return databaseUrl;
  }

  const supabaseDatabasePassword = process.env.SUPABASE_DATABASE_PASSWORD?.trim();
  const supabaseDatabaseHost =
    getConfiguredHost("SUPABASE_DATABASE_HOST") ?? getConfiguredHost("SUPABASE_DB_HOST");

  if (supabaseDatabasePassword && supabaseDatabaseHost) {
    return `postgresql://postgres:${encodeURIComponent(
      supabaseDatabasePassword
    )}@${withDefaultPostgresPort(supabaseDatabaseHost)}/postgres?sslmode=require`;
  }

  throw new Error(
    "DATABASE_URL or SUPABASE_DATABASE_URL is required, or set SUPABASE_DATABASE_PASSWORD with SUPABASE_DATABASE_HOST or SUPABASE_DB_HOST."
  );
}
