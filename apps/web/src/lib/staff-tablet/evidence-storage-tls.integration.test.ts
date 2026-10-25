/** @jest-environment node */
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:https";
import type { AddressInfo } from "node:net";
import { OperationalEvidenceStorage } from "./evidence-storage";

const enabled = Boolean(process.env.API08_STORAGE_TEST_CERT && process.env.API08_STORAGE_TEST_KEY);
(enabled ? describe : describe.skip)("operational fixed-origin TLS retrieval (not actual Supabase)", () => {
  let server: Server;
  let origin: string;
  let mode: string;
  let objects: number;
  const key = "96000000-0000-0000-0000-000000000001";
  beforeAll(async () => {
    server = createServer({ cert: readFileSync(process.env.API08_STORAGE_TEST_CERT!), key: readFileSync(process.env.API08_STORAGE_TEST_KEY!) }, (req, res) => {
      expect(req.headers.authorization).toBe("Bearer local-test-key");
      if (req.url === "/storage/v1/bucket/private-evidence") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ id: "private-evidence", public: mode === "public" }));
      } else if (req.url === `/storage/v1/object/upload/sign/private-evidence/${key}`) {
        expect(req.headers["x-upsert"]).toBe("false");
        res.end(JSON.stringify({ url: `/object/upload/sign/private-evidence/${key}?token=test${mode === "duplicate-token" ? "&token=second" : ""}` }));
      } else {
        objects++;
        if (mode === "redirect") { res.writeHead(302, { location: `${origin}/unexpected` }); res.end(); }
        else if (mode === "oversize") { res.writeHead(200, { "content-length": String(10 * 1024 * 1024 + 1) }); res.end(); }
        else if (mode === "stalled") { res.writeHead(200); res.flushHeaders(); }
        else { res.end(Buffer.from("original staged bytes")); }
      }
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    origin = `https://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  beforeEach(() => { mode = "normal"; objects = 0; });
  afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  function adapter() { return new OperationalEvidenceStorage({ origin, bucket: "private-evidence", serviceKey: "local-test-key" }); }
  test("issues non-upsert fixed two-hour target and downloads exact bytes over verified TLS", async () => {
    const storage = adapter();
    const result = await storage.issueSignedUpload(key, new AbortController().signal);
    expect(result.signedUploadExpirySeconds).toBe(7200);
    expect(result.uploadUrl).toBe(`${origin}/storage/v1/object/upload/sign/private-evidence/${key}?token=test`);
    await expect(storage.download(key, new AbortController().signal)).resolves.toEqual(Buffer.from("original staged bytes"));
  });
  test("refuses public bucket before object fetch", async () => {
    mode = "public";
    await expect(adapter().download(key, new AbortController().signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
    expect(objects).toBe(0);
  });
  test.each(["redirect", "oversize", "duplicate-token"])("rejects %s", async value => {
    mode = value;
    const storage = adapter();
    await expect(value === "duplicate-token" ? storage.issueSignedUpload(key, new AbortController().signal) : storage.download(key, new AbortController().signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
    if (value === "redirect") expect(objects).toBe(1);
  });
  test("aborts a stalled body", async () => {
    mode = "stalled";
    await expect(adapter().download(key, AbortSignal.timeout(100))).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  });
});
