import "server-only";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { StaffTabletAuthContext } from "../supabase/require-staff-tablet-access";
import type { VerifiedEvidenceReservation } from "./evidence-storage-verifier";

/** Explicit local Unix-socket owner transport, never a service-role RPC.
 * No environment auto-discovery and no production construction path. The caller
 * must supply context obtained from the real guard, not JSON identity fields.
 */
export interface LocalEvidenceOwnerConfig {
  mode: "LOCAL_SYNTHETIC_ONLY";
  allowDatabaseByteSnapshots: true;
  psql: string;
  socket: string;
  port: number;
  database: string;
  libraryPath: string;
  timeoutMs: number;
  maxBytes: number;
}
const uuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s);
const text = (s: string) => `convert_from(decode('${Buffer.from(s, "utf8").toString("hex")}','hex'),'UTF8')`;
export class LocalEvidenceOwner {
  private readonly config: LocalEvidenceOwnerConfig;
  constructor(config: LocalEvidenceOwnerConfig) {
    if (config.mode !== "LOCAL_SYNTHETIC_ONLY" || config.allowDatabaseByteSnapshots !== true ||
      !/^evidence_(?:durable_)?[0-9]+$/.test(config.database) ||
      !config.socket.startsWith(`${process.env.HOME}/.hermes/cache/scratch/`) || resolve(config.socket) !== config.socket ||
      !config.psql.startsWith(`${process.env.HOME}/.hermes/cache/scratch/`) || !config.psql.endsWith("/pgroot/usr/lib/postgresql/16/bin/psql") ||
      !config.libraryPath.startsWith(`${process.env.HOME}/.hermes/cache/scratch/`) ||
      ![config.port, config.timeoutMs, config.maxBytes].every(n => Number.isSafeInteger(n) && n > 0) || config.port > 65535 || config.timeoutMs > 2147483647) {
      throw new Error("EVIDENCE_LOCAL_OWNER_CONFIG_REQUIRED");
    }
    this.config = { ...config };
  }
  private async execute(context: StaffTabletAuthContext, query: string, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted || ![context.userId, context.staffId, context.deviceId, context.stationId].every(v => typeof v === "string" && uuid(v))) throw new Error("DENIED");
    const c = this.config;
    const sql = `begin;
set local statement_timeout=${c.timeoutMs};
set local lock_timeout=${c.timeoutMs};
select set_config('request.jwt.claims',${text(JSON.stringify({ sub: context.userId, role: "authenticated" }))},true);
select set_config('request.jwt.claim.sub',${text(context.userId)},true);
do $owner$ declare s public.staff_profiles; begin
 if inet_server_addr() is not null or current_database()<>${text(c.database)} then raise exception 'DENIED'; end if;
 s:=private.station_actor('${context.deviceId}'::uuid);
 if s.id<>'${context.staffId}'::uuid or s.station_id is distinct from '${context.stationId}'::uuid or s.profile_id<>'${context.userId}'::uuid then raise exception 'DENIED'; end if;
end $owner$;
select 'EVIDENCE_RESULT:'||(${query})::text;
commit;`;
    return new Promise((accept, reject) => {
      const child = spawn(c.psql, ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-h", c.socket, "-p", String(c.port), "-d", c.database], {
        env: { NODE_ENV: "test", PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C", HOME: "/nonexistent", LD_LIBRARY_PATH: c.libraryPath, PGSERVICEFILE: "/dev/null", PGPASSFILE: "/dev/null" },
        stdio: ["pipe", "pipe", "pipe"],
      });
      let output = "";
      let failed = false;
      const stop = () => { failed = true; child.kill("SIGKILL"); };
      const timer = setTimeout(stop, c.timeoutMs);
      signal.addEventListener("abort", stop, { once: true });
      child.stdout.on("data", chunk => { output += chunk.toString(); if (output.length > 65536) stop(); });
      // Do not leak SQL, connection details, bytes or provider messages to clients.
      child.stderr.resume();
      child.stdin.on("error", () => {});
      child.on("error", () => { failed = true; });
      child.on("close", code => {
        clearTimeout(timer); signal.removeEventListener("abort", stop);
        if (failed || code !== 0 || signal.aborted) { reject(new Error("EVIDENCE_OWNER_UNAVAILABLE")); return; }
        try {
          const rows = output.split("\n").filter(row => row.startsWith("EVIDENCE_RESULT:"));
          if (rows.length !== 1) throw new Error();
          accept(JSON.parse(rows[0]!.slice("EVIDENCE_RESULT:".length)));
        } catch { reject(new Error("EVIDENCE_OWNER_UNAVAILABLE")); }
      });
      child.stdin.end(sql);
    });
  }
  async reserve(context: StaffTabletAuthContext, request: { evidenceLocalId: string; parentLocalId: string; parentKind: string; kind: string; mimeType: string; byteSize: number; sha256: string }, signal: AbortSignal) {
    if (!Number.isSafeInteger(request.byteSize) || request.byteSize <= 0 || request.byteSize > this.config.maxBytes) throw new Error("EVIDENCE_BYTES_REJECTED");
    const raw = JSON.stringify({ deviceId: context.deviceId, evidenceLocalId: request.evidenceLocalId, parentLocalId: request.parentLocalId, parentKind: request.parentKind, kind: request.kind, declaredMime: request.mimeType, declaredSize: request.byteSize, declaredSha256: request.sha256 });
    const row = await this.execute(context, `to_jsonb(private.station_evidence_upload_reserve(${text(raw)}))`, signal);
    return this.reservation(row);
  }
  async authorize(context: StaffTabletAuthContext, id: string, signal: AbortSignal) {
    if (!uuid(id)) throw new Error("DENIED");
    return this.reservation(await this.execute(context, `to_jsonb(private.station_evidence_authorize('${id}'::uuid))`, signal));
  }
  async receipt(context: StaffTabletAuthContext, id: string, signal: AbortSignal) {
    if (!uuid(id)) throw new Error("DENIED");
    return this.execute(context, `coalesce(private.station_evidence_completion_receipt('${id}'::uuid),'null'::jsonb)`, signal);
  }
  async finalize(context: StaffTabletAuthContext, id: string, bytes: Buffer, uploadedAtDevice: string, signal: AbortSignal) {
    if (!uuid(id) || bytes.length === 0 || bytes.length > this.config.maxBytes) throw new Error("EVIDENCE_BYTES_REJECTED");
    return this.execute(context, `private.station_evidence_finalize('${id}'::uuid,decode('${bytes.toString("hex")}','hex'),${text(uploadedAtDevice)})`, signal);
  }
  private reservation(value: unknown): VerifiedEvidenceReservation & { evidenceLocalId: string } {
    if (!value || typeof value !== "object") throw new Error("EVIDENCE_OWNER_UNAVAILABLE");
    const r = value as Record<string, unknown>;
    const size = Number(r.declared_size);
    if (!["id", "object_key", "actor_profile_id", "staff_id", "station_id", "device_id", "parent_local_id", "evidence_local_id"].every(k => typeof r[k] === "string" && uuid(r[k] as string)) || !Number.isSafeInteger(size) || size <= 0) throw new Error("EVIDENCE_OWNER_UNAVAILABLE");
    return { id: r.id as string, objectKey: r.object_key as string, actorProfileId: r.actor_profile_id as string, staffId: r.staff_id as string, stationId: r.station_id as string, deviceId: r.device_id as string, parentLocalId: r.parent_local_id as string, parentKind: r.parent_kind as string, evidenceLocalId: r.evidence_local_id as string, declaredMime: r.declared_mime as string, declaredSize: size, declaredSha256: r.declared_sha256 as string };
  }
}
