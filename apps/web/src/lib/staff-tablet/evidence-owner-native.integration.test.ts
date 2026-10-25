/** @jest-environment node */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { createEvidencePost } from "./evidence-http";
import { createLocalEvidenceWorkflow } from "./evidence-workflow-local";
import { LocalEvidenceOwner } from "./evidence-owner-local";
import { requireStaffTabletAccess } from "../supabase/require-staff-tablet-access";

jest.mock("../supabase/require-staff-tablet-access", () => ({ requireStaffTabletAccess: jest.fn() }));
const enabled = Boolean(process.env.API08_NATIVE_HTTP_CONFIG);
const suite = enabled ? describe : describe.skip;
// Guard fixture is synthetic. This exercises real HTTP, real Storage and native
// owner transactions, not Supabase Auth/PostgREST or deployed Next routing.
suite("native owner + actual Supabase Storage HTTP acceptance", () => {
  let config: Parameters<typeof createLocalEvidenceWorkflow>[0];
  let server: Server;
  let proxy: Server;
  let origin: string;
  let storageOrigin: string;
  let owner: LocalEvidenceOwner;
  const context = { userId: "a4000000-0000-0000-0000-000000000001", staffId: "a4000000-0000-0000-0000-000000000003", deviceId: "a4000000-0000-0000-0000-000000000004", stationId: "a4000000-0000-0000-0000-000000000002", staffRole: "station_admin", staffStationId: "a4000000-0000-0000-0000-000000000002", deviceStationId: "a4000000-0000-0000-0000-000000000002", isCrossStationAllowed: false };
  const bytes = Buffer.from("424d3a00000000000000360000002800000001000000010000000100180000000000040000000000000000000000000000000000000000000000", "hex");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const payload = (n: number) => ({ deviceId: "api08-http", stationId: context.stationId, parentLocalId: "a4000000-0000-0000-0000-000000000006", parentKind: "rental_start", evidenceLocalId: `96000000-0000-0000-0000-${String(n).padStart(12, "0")}`, kind: "pre_use_photo", mimeType: "image/bmp", byteSize: bytes.length, sha256 });
  const signal = () => new AbortController().signal;
  function localSql(sql: string) {
    const c = config.owner;
    return execFileSync(c.psql, ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-h", c.socket, "-p", String(c.port), "-d", c.database], { input: sql, encoding: "utf8", timeout: 10000, env: { NODE_ENV: "test", PATH: "/usr/bin:/bin", LD_LIBRARY_PATH: c.libraryPath, HOME: "/nonexistent" } }).trim();
  }
  const post = async (operation: string, body: unknown) => fetch(`${origin}/${operation}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  async function upload(n: number) {
    const response = await post("init", payload(n));
    expect(response.status).toBe(200);
    const target = await response.json();
    const uploaded = await fetch(target.signedUrl, { method: "PUT", headers: { "content-type": "image/bmp", "x-upsert": "false" }, body: bytes });
    expect(uploaded.ok).toBe(true);
    return target;
  }
  beforeAll(async () => {
    config = JSON.parse(readFileSync(process.env.API08_NATIVE_HTTP_CONFIG!, "utf8"));
    const upstream = new URL(config.storage.origin);
    if (upstream.hostname !== "127.0.0.1" || upstream.protocol !== "http:") throw new Error("local Storage required");
    storageOrigin = upstream.origin;
    // Prefix-only forwarding proxy; every response/body comes from actual Storage.
    proxy = createServer(async (request, response) => {
      try {
        const body: Buffer[] = [];
        for await (const chunk of request) body.push(Buffer.from(chunk));
        const headers = new Headers();
        for (const [key, value] of Object.entries(request.headers)) if (typeof value === "string" && !["host", "connection", "content-length"].includes(key)) headers.set(key, value);
        const result = await fetch(`${storageOrigin}${request.url!.replace(/^\/storage\/v1/, "")}`, { method: request.method ?? "GET", headers, ...["GET", "HEAD"].includes(request.method ?? "GET") ? {} : { body: Buffer.concat(body) }, redirect: "error" });
        response.writeHead(result.status, Object.fromEntries(result.headers));
        response.end(Buffer.from(await result.arrayBuffer()));
      } catch { response.writeHead(502); response.end(); }
    });
    await new Promise<void>(resolve => proxy.listen(0, "127.0.0.1", resolve));
    const address = proxy.address();
    if (!address || typeof address === "string") throw new Error("proxy listen");
    config.storage.origin = `http://127.0.0.1:${address.port}`;
    const created = await fetch(`${storageOrigin}/bucket`, { method: "POST", headers: { authorization: `Bearer ${config.storage.serviceKey}`, "content-type": "application/json" }, body: JSON.stringify({ id: config.storage.bucket, name: config.storage.bucket, public: false, file_size_limit: 1024, allowed_mime_types: ["image/bmp"] }) });
    expect(created.ok).toBe(true);
    owner = new LocalEvidenceOwner(config.owner);
    const workflow = createLocalEvidenceWorkflow(config);
    jest.mocked(requireStaffTabletAccess).mockResolvedValue({ context });
    server = createServer(async (incoming, outgoing) => {
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const operation = incoming.url === "/init" ? "init" : "complete";
      const response = await createEvidencePost(operation, workflow)(new Request(`http://127.0.0.1${incoming.url}`, { method: "POST", headers: { "content-type": "application/json" }, body: Buffer.concat(chunks) }));
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text());
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const bound = server.address();
    if (!bound || typeof bound === "string") throw new Error("HTTP listen");
    origin = `http://127.0.0.1:${bound.port}`;
  }, 30000);
  afterAll(async () => {
    for (const current of [server, proxy]) if (current) await new Promise<void>((resolve, reject) => { current.close(error => error ? reject(error) : resolve()); current.closeAllConnections(); });
  });
  it("issues a real signed target, uploads actual bytes, atomically links, and survives source overwrite", async () => {
    const target = await upload(1);
    const complete = { ...payload(1), reservationId: target.reservationId, uploadedAtDevice: "2026-07-28T12:00:00Z" };
    const response = await post("complete", complete);
    expect(response.status).toBe(200);
    const receipt = await response.json();
    expect(localSql("select sync_status from public.tablet_sync_records where local_id='a4000000-0000-0000-0000-000000000006';")).toBe("accepted_pending_evidence");
    expect(receipt).toMatchObject({ linked: true, state: "DURABLE_DATABASE_SNAPSHOT", sha256, byteSize: 58 });
    expect(receipt.attachmentId).toMatch(/^[0-9a-f-]{36}$/);
    const changed = Buffer.from(bytes); changed[54] = 255;
    const overwritten = await fetch(`${storageOrigin}/object/${config.storage.bucket}/${target.objectKey}`, { method: "POST", headers: { authorization: `Bearer ${config.storage.serviceKey}`, "content-type": "image/bmp", "x-upsert": "true" }, body: changed });
    expect(overwritten.ok).toBe(true);
    // New process, same durable receipt; no reliance on adapter memory or staging.
    expect(await new LocalEvidenceOwner(config.owner).receipt(context, target.reservationId, signal())).toEqual(receipt);
    const replay = await post("complete", complete);
    expect(replay.status).toBe(200); expect(await replay.json()).toEqual(receipt);
    const deleted = await fetch(`${storageOrigin}/object/${config.storage.bucket}`, { method: "DELETE", headers: { authorization: `Bearer ${config.storage.serviceKey}`, "content-type": "application/json" }, body: JSON.stringify({ prefixes: [target.objectKey] }) });
    expect(deleted.ok).toBe(true);
    const afterDelete = await post("complete", complete);
    expect(afterDelete.status).toBe(200); expect(await afterDelete.json()).toEqual(receipt);
    expect((await post("complete", { ...complete, uploadedAtDevice: "2026-07-28T12:00:01Z" })).status).toBe(409);
    const unauthorized = await post("complete", { ...complete, parentLocalId: "a4000000-0000-0000-0000-000000000099" });
    expect(unauthorized.status).toBe(403);
  }, 30000);
  it("rejects hash mismatch and unavailable reference without fabricating attachment success", async () => {
    const wrong = await post("init", { ...payload(2), sha256: "0".repeat(64) });
    expect(wrong.status).toBe(503);
    const target = await upload(2);
    const changed = Buffer.from(bytes); changed[54] = 255;
    expect((await fetch(`${storageOrigin}/object/${config.storage.bucket}/${target.objectKey}`, { method: "POST", headers: { authorization: `Bearer ${config.storage.serviceKey}`, "content-type": "image/bmp", "x-upsert": "true" }, body: changed })).ok).toBe(true);
    const result = await post("complete", { ...payload(2), reservationId: target.reservationId, uploadedAtDevice: "2026-07-28T12:00:00Z" });
    expect(result.status).toBe(422);
    expect(await owner.receipt(context, target.reservationId, signal())).toBeNull();
    expect((await post("init", { ...payload(3), mimeType: "image/png" })).status).toBe(503);
    expect((await post("init", { ...payload(3), byteSize: 1025 })).status).toBe(503);
    // Restore exact staged bytes and complete on a later request.
    expect((await fetch(`${storageOrigin}/object/${config.storage.bucket}/${target.objectKey}`, { method: "POST", headers: { authorization: `Bearer ${config.storage.serviceKey}`, "content-type": "image/bmp", "x-upsert": "true" }, body: bytes })).ok).toBe(true);
    // A prior authorization is not sufficient after the active device is revoked.
    await owner.authorize(context, target.reservationId, signal());
    localSql("update public.tablet_devices set device_status='disabled' where device_identifier='api08-http';");
    try {
      await expect(owner.finalize(context, target.reservationId, bytes, "2026-07-28T12:00:00Z", signal())).rejects.toThrow("EVIDENCE_OWNER_UNAVAILABLE");
      expect((await post("complete", { ...payload(2), reservationId: target.reservationId, uploadedAtDevice: "2026-07-28T12:00:00Z" })).status).toBe(503);
    } finally { localSql("update public.tablet_devices set device_status='active' where device_identifier='api08-http';"); }
    expect((await post("complete", { ...payload(2), reservationId: target.reservationId, uploadedAtDevice: "2026-07-28T12:00:00Z" })).status).toBe(200);
  }, 30000);
  it("serializes concurrent completion to one attachment and completes all required files", async () => {
    for (let n = 3; n <= 6; n++) {
      const target = await upload(n);
      const body = { ...payload(n), reservationId: target.reservationId, uploadedAtDevice: "2026-07-28T12:00:00Z" };
      const replies = await Promise.all([post("complete", body), post("complete", body)]);
      expect(replies.map(r => r.status)).toEqual([200, 200]);
      expect(await replies[0]!.json()).toEqual(await replies[1]!.json());
    }
    expect(localSql("select sync_status from public.tablet_sync_records where local_id='a4000000-0000-0000-0000-000000000006';")).toBe("accepted_pending_evidence");
    const final = await Promise.all([7, 8].map(async n => {
      const target = await upload(n);
      const response = await post("complete", { ...payload(n), reservationId: target.reservationId, uploadedAtDevice: "2026-07-28T12:00:00Z" });
      expect(response.status).toBe(200); return response.json();
    }));
    expect(final[0].attachmentId).not.toBe(final[1].attachmentId);
    expect(localSql("select sync_status from public.tablet_sync_records where local_id='a4000000-0000-0000-0000-000000000006';")).toBe("accepted");
  }, 60000);
});
