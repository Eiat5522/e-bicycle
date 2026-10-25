/** @jest-environment node */
import { LocalEvidenceOwner, type LocalEvidenceOwnerConfig } from "./evidence-owner-local";
import { createLocalEvidenceWorkflow } from "./evidence-workflow-local";

const config: LocalEvidenceOwnerConfig = {
  mode: "LOCAL_SYNTHETIC_ONLY", allowDatabaseByteSnapshots: true,
  psql: `${process.env.HOME}/.hermes/cache/scratch/example/pgroot/usr/lib/postgresql/16/bin/psql`,
  socket: `${process.env.HOME}/.hermes/cache/scratch/example/socket`, port: 55439,
  database: "evidence_durable_123", libraryPath: `${process.env.HOME}/.hermes/cache/scratch/example/pgroot/usr/lib/x86_64-linux-gnu`, timeoutMs: 1000, maxBytes: 1024,
};
describe("explicit local evidence construction", () => {
  test.each([
    { mode: "production" }, { allowDatabaseByteSnapshots: false },
    { socket: "127.0.0.1" }, { socket: `${process.env.HOME}/.hermes/cache/scratch/../hosted` },
    { database: "postgres" }, { database: "evidence_durable_123;select 1" },
    { psql: "/bin/sh" }, { port: 0 }, { port: 65536 }, { timeoutMs: 0 }, { maxBytes: 0 },
  ])("rejects unsafe configuration %j before IO", override => {
    expect(() => new LocalEvidenceOwner({ ...config, ...override } as LocalEvidenceOwnerConfig)).toThrow("EVIDENCE_LOCAL_OWNER_CONFIG_REQUIRED");
  });
  it("does not discover credentials or production URLs from the environment", () => {
    expect(() => createLocalEvidenceWorkflow({ owner: config, storage: {
      origin: "https://hosted.example.invalid", bucket: "local-evidence", serviceKey: "synthetic",
      policy: { allowedMimeTypes: ["image/bmp"], maxBytes: 1024, signedUploadExpirySeconds: 7200, timeoutMs: 1000, maxChunks: 8 },
    } })).toThrow("EVIDENCE_LOCAL_TARGET_REQUIRED");
  });
  it("denies malformed actor context without launching an owner process", async () => {
    const owner = new LocalEvidenceOwner(config);
    await expect(owner.authorize({ userId: "untrusted" } as never, "96000000-0000-0000-0000-000000000001", new AbortController().signal)).rejects.toThrow("DENIED");
  });
});
