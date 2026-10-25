import "server-only";
import { Pool, type PoolClient } from "pg";
import type { StaffTabletAuthContext } from "../supabase/require-staff-tablet-access";

/** Trusted backend identity assertion. This login must never be supplied to a
 * browser. SQL grants only the reviewed private dispatcher, not table writes.
 * URL TLS options are forbidden because node-postgres can override ssl config.
 */
export class OperationalEvidenceOwner {
  private readonly pool: Pool;
  constructor(config: { connectionString: string; ca: string }) {
    const url = new URL(config.connectionString);
    if (!config.ca || !["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname ||
      !url.username || ["postgres", "supabase_admin", "service_role", "authenticator"].includes(decodeURIComponent(url.username)) ||
      url.search || url.hash) throw new Error("EVIDENCE_TRANSPORT_CONFIG_REQUIRED");
    this.pool = new Pool({ connectionString: config.connectionString, ssl: { ca: config.ca, rejectUnauthorized: true },
      max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
      statement_timeout: 10000, query_timeout: 12000, allowExitOnIdle: true });
    this.pool.on("error", () => { /* No credentials/queries in client-visible diagnostics. */ });
  }
  async execute(context: StaffTabletAuthContext, operation: "init" | "authorize" | "receipt" | "complete", payload: Record<string, unknown>, bytes: Buffer | null, signal: AbortSignal): Promise<Record<string, unknown> | null> {
    if (signal.aborted || ![context.userId, context.staffId, context.deviceId, context.stationId].every(v => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v))) throw new Error("DENIED");
    let client: PoolClient | undefined;
    let released = false;
    const destroy = () => {
      if (client && !released) { released = true; client.release(true); }
    };
    // Destroy, never recycle, a socket with an outstanding query. Racing only
    // the caller without this release would retain pool slots and actor work.
    const cancelled = new Error("EVIDENCE_OWNER_UNAVAILABLE");
    let rejectAbort!: (error: Error) => void;
    const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
    const onAbort = () => { destroy(); rejectAbort(cancelled); };
    signal.addEventListener("abort", onAbort, { once: true });
    const check = () => { if (signal.aborted) throw cancelled; };
    const wait = async <T>(work: Promise<T>): Promise<T> => {
      const result = await Promise.race([work, aborted]);
      check();
      return result;
    };
    const query = async (sql: string, values?: unknown[]) => {
      check();
      return wait(client!.query(sql, values));
    };
    let failed = true;
    try {
      check();
      await wait(this.pool.connect().then(acquired => {
        client = acquired;
        // Acquisition may finish after the caller has already been cancelled.
        if (signal.aborted) destroy();
      }));
      if (signal.aborted) throw new Error("DENIED");
      await query("begin");
      const role = await query(`select not r.rolsuper and not r.rolbypassrls and not r.rolcreaterole and not r.rolcreatedb
        and pg_has_role(current_user,'api08_evidence_executor','MEMBER')
        and not exists(select 1 from pg_auth_members m where m.member=r.oid and (m.roleid<>'api08_evidence_executor'::regrole or m.admin_option))
        and not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname in ('public','private') and c.relkind in ('r','p') and
          (c.relowner=r.oid or has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE')))
        and not exists(select 1 from pg_namespace where nspowner=r.oid or
          (nspname in ('public','private') and has_schema_privilege(current_user,oid,'CREATE')))
        and not exists(select 1 from pg_database where datdba=r.oid) as safe
        from pg_roles r where r.rolname=current_user`);
      if (role.rows[0]?.safe !== true) throw new Error("EVIDENCE_OWNER_UNAVAILABLE");
      // All settings are transaction-local; dispatcher rechecks database authority
      // on this same connection, including before durable receipt replay.
      await query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
        [context.userId, JSON.stringify({ sub: context.userId, role: "authenticated" })]);
      const result = await query("select private.station_evidence_operate($1,$2::uuid,$3::uuid,$4::uuid,$5::jsonb,$6::bytea) as result",
        [operation, context.staffId, context.deviceId, context.stationId, JSON.stringify(payload), bytes]);
      if (signal.aborted) throw new Error("EVIDENCE_OWNER_UNAVAILABLE");
      await query("commit");
      failed = false;
      return result.rows[0]?.result ?? null;
    } catch (error) {
      await query("rollback").catch(() => {});
      const code = (error as { code?: string }).code;
      if (code === "42501") throw new Error("DENIED");
      if (code === "23505") throw new Error("EVIDENCE_COMPLETION_CONFLICT");
      if (code === "22023") throw new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED");
      throw new Error("EVIDENCE_OWNER_UNAVAILABLE");
    } finally {
      signal.removeEventListener("abort", onAbort);
      if (client && !released) { released = true; client.release(failed); }
    }
  }
  dispose() { return this.pool.end(); }
}
