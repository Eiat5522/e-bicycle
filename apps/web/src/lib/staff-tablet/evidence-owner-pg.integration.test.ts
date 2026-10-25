/** @jest-environment node */
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { OperationalEvidenceOwner } from "./evidence-owner";
import { validateOperationalEvidenceImage } from "./evidence-image";

const enabled = Boolean(process.env.API08_DRIVER_DATABASE_URL && process.env.API08_DRIVER_CA);
(enabled ? describe : describe.skip)("real dedicated-login pg transport via local verified TLS facade", () => {
  let owner: OperationalEvidenceOwner;
  const context = { userId: "94000000-0000-0000-0000-000000000001", staffId: "94000000-0000-0000-0000-000000000003", deviceId: "94000000-0000-0000-0000-000000000004", stationId: "94000000-0000-0000-0000-000000000002", staffRole: "station_admin", staffStationId: null, deviceStationId: null, isCrossStationAllowed: false };
  beforeAll(() => { owner = new OperationalEvidenceOwner({ connectionString: process.env.API08_DRIVER_DATABASE_URL!, ca: readFileSync(process.env.API08_DRIVER_CA!, "utf8") }); });
  afterAll(async () => { await owner?.dispose(); });
  (process.env.API08_DRIVER_ADMIN_URL ? test : test.skip)("aborted blocked dispatcher frees checkout before lock release and permits good pooled work", async () => {
    const admin = new Pool({ connectionString: process.env.API08_DRIVER_ADMIN_URL });
    const lock = await admin.connect();
    const abort = new AbortController();
    try {
      await lock.query("begin; lock table private.station_evidence_reservations in access exclusive mode");
      const sql = readFileSync("../../supabase/tests/st02_evidence_operational_images.sql", "utf8");
      const [, format, hex] = [...sql.matchAll(/\('image\/(png|jpeg)',decode\('([0-9a-f]+)'/g)][0]!;
      const bytes = Buffer.from(hex!, "hex");
      const payload = { evidenceLocalId: "96000000-0000-0000-0000-000000000001", parentLocalId: "94000000-0000-0000-0000-000000000006", parentKind: "rental_start", kind: "pre_use_photo", mimeType: `image/${format}`, byteSize: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), uploadedAtDevice: "2026-07-28T12:00:00Z" };
      const result = owner.execute(context, "init", payload, null, abort.signal);
      const rejected = expect(result).rejects.toThrow("EVIDENCE_OWNER_UNAVAILABLE");
      let blocked = false;
      for (let i = 0; i < 100; i++) {
        const state = await admin.query("select 1 from pg_stat_activity where datname=current_database() and cardinality(pg_blocking_pids(pid))>0 and query like '%station_evidence_operate%'");
        if (state.rowCount) { blocked = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(blocked).toBe(true);
      abort.abort();
      await Promise.race([rejected, new Promise((_, reject) => setTimeout(() => reject(new Error("checkout retained")), 500))]);
      // Destructive release removes the checkout even while SQL is blocked.
      const pool = (owner as unknown as { pool: Pool }).pool;
      expect(pool.totalCount).toBe(0);
      expect(pool.idleCount).toBe(0);
      await lock.query("rollback");
      // Backend disconnect observation may lag until the blocked statement ends.
      await expect(owner.execute({ ...context, userId: "94000000-0000-0000-0000-000000000011" }, "init", payload, null, new AbortController().signal)).rejects.toThrow("DENIED");
    } finally {
      abort.abort();
      await lock.query("rollback");
      lock.release();
      await admin.end();
    }
  });
  test("JPEG/PNG reservation, current-authority checks, exact durable finalize and replay with pooled actor isolation", async () => {
    const sql = readFileSync("../../supabase/tests/st02_evidence_operational_images.sql", "utf8");
    const images = [...sql.matchAll(/\('image\/(png|jpeg)',decode\('([0-9a-f]+)'/g)];
    expect(images).toHaveLength(2);
    let index = 0;
    for (const [, format, hex] of images) {
      const bytes = Buffer.from(hex!, "hex");
      await validateOperationalEvidenceImage(bytes, `image/${format}`);
      const payload = { evidenceLocalId: `96000000-0000-0000-0000-00000000000${++index}`, parentLocalId: "94000000-0000-0000-0000-000000000006", parentKind: "rental_start", kind: "pre_use_photo", mimeType: `image/${format}`, byteSize: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), uploadedAtDevice: "2026-07-28T12:00:00Z" };
      const signal = new AbortController().signal;
      await expect(owner.execute(context, "init", { ...payload, mimeType: "image/heic" }, null, signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
      await expect(owner.execute(context, "init", { ...payload, byteSize: 10485761 }, null, signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
      const [reservation, concurrentReservation] = await Promise.all([
        owner.execute(context, "init", payload, null, signal), owner.execute(context, "init", payload, null, signal),
      ]);
      expect(concurrentReservation).toEqual(reservation);
      expect(reservation?.id).toBeTruthy();
      expect(await owner.execute(context, "init", payload, null, signal)).toEqual(reservation);
      const complete = { ...payload, reservationId: reservation!.id };
      await expect(owner.execute({ ...context, userId: "94000000-0000-0000-0000-000000000011" }, "authorize", complete, null, signal)).rejects.toThrow("DENIED");
      expect(await owner.execute(context, "receipt", complete, null, signal)).toBeNull();
      await expect(owner.execute(context, "complete", complete, Buffer.from("wrong bytes"), signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
      const [result, concurrentResult] = await Promise.all([
        owner.execute(context, "complete", complete, bytes, signal), owner.execute(context, "complete", complete, bytes, signal),
      ]);
      expect(concurrentResult).toEqual(result);
      expect(result?.attachmentId).toBeTruthy();
      expect(await owner.execute(context, "receipt", complete, null, signal)).toEqual(result);
      expect(await owner.execute(context, "complete", complete, bytes, signal)).toEqual(result);
      await expect(owner.execute(context, "complete", { ...complete, uploadedAtDevice: "2026-07-28T12:00:01Z" }, bytes, signal)).rejects.toThrow("EVIDENCE_COMPLETION_CONFLICT");
      expect(await owner.execute(context, "receipt", complete, null, signal)).toEqual(result);
    }
  });
});
