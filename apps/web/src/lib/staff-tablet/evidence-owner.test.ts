/** @jest-environment node */
import { Pool } from "pg";
import { OperationalEvidenceOwner } from "./evidence-owner";

jest.mock("pg", () => ({ Pool: jest.fn() }));

describe("dedicated evidence transport configuration", () => {
  test.each([
    { connectionString: "postgresql://postgres:secret@localhost/db", ca: "ca" },
    { connectionString: "postgresql://evidence:secret@localhost/db?sslmode=disable", ca: "ca" },
    { connectionString: "postgresql://evidence:secret@localhost/db", ca: "" },
  ])("fails closed for invalid TLS/role config", config => {
    expect(() => new OperationalEvidenceOwner(config)).toThrow("EVIDENCE_TRANSPORT_CONFIG_REQUIRED");
  });
});

describe("transaction identity isolation", () => {
  const context = { userId: "94000000-0000-0000-0000-000000000001", staffId: "94000000-0000-0000-0000-000000000003", deviceId: "94000000-0000-0000-0000-000000000004", stationId: "94000000-0000-0000-0000-000000000002", staffRole: "station_admin", staffStationId: null, deviceStationId: null, isCrossStationAllowed: false };
  function setup(safe = true, sqlError?: string) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("from pg_roles")) return { rows: [{ safe }] };
      if (sql.includes("station_evidence_operate")) {
        if (sqlError) throw Object.assign(new Error("internal SQL detail"), { code: sqlError });
        return { rows: [{ result: { attachmentId: "committed" } }] };
      }
      return { rows: [] };
    });
    const release = jest.fn();
    const connect = jest.fn(async () => ({ query, release }));
    (Pool as unknown as jest.Mock).mockImplementation(() => ({ connect, on: jest.fn(), end: jest.fn() }));
    const owner = new OperationalEvidenceOwner({ connectionString: "postgresql://api08_login@db.example/db", ca: "reviewed CA" });
    return { owner, query, release, connect };
  }
  test("uses verified TLS, one connection, parameterized binary bytes, and commit before result", async () => {
    const { owner, query, release, connect } = setup();
    const bytes = Buffer.from("exact original bytes");
    await expect(owner.execute(context, "complete", { reservationId: "id" }, bytes, new AbortController().signal)).resolves.toEqual({ attachmentId: "committed" });
    expect(connect).toHaveBeenCalledTimes(1);
    expect(Pool).toHaveBeenLastCalledWith(expect.objectContaining({ max: 2, ssl: { ca: "reviewed CA", rejectUnauthorized: true } }));
    expect(query.mock.calls.map(call => call[0])[0]).toBe("begin");
    const calls = query.mock.calls as unknown as [string, unknown[]][];
    expect(calls.find(call => call[0].includes("set_config"))?.[1]?.[0]).toBe(context.userId);
    expect(calls.find(call => call[0].includes("station_evidence_operate"))?.[1]?.[5]).toBe(bytes);
    expect(query.mock.calls.at(-1)?.[0]).toBe("commit");
    expect(release).toHaveBeenCalledWith(false);
  });
  test.each(["42501", "23505", "22023", "XX000"])("rolls back and destroys failed checkout (%s)", async code => {
    const { owner, query, release } = setup(true, code);
    await expect(owner.execute(context, "receipt", {}, null, new AbortController().signal)).rejects.toThrow();
    expect(query.mock.calls.at(-1)?.[0]).toBe("rollback");
    expect(release).toHaveBeenCalledWith(true);
    expect(query.mock.calls.some(call => call[0] === "commit")).toBe(false);
  });
  test.each(["checkout", "begin", "from pg_roles", "set_config", "station_evidence_operate", "commit", "rollback"].flatMap(boundary => [ [boundary, "abort"], [boundary, "deadline"] ]))("cancels promptly during %s (%s) without subsequent SQL or double release", async (boundary, cancellation) => {
    const { owner, query, release, connect } = setup();
    const abort = new AbortController();
    let resume!: (value: { rows: unknown[] }) => void;
    let failLate!: (error: Error) => void;
    const pending = new Promise<{ rows: unknown[] }>((resolve, reject) => { resume = resolve; failLate = reject; });
    const original = query.getMockImplementation()!;
    if (boundary === "checkout") connect.mockImplementationOnce(() => pending.then(() => ({ query, release })));
    else query.mockImplementation(async (sql: string) => {
      if (sql.includes(boundary)) return pending as never;
      if (boundary === "rollback" && sql.includes("station_evidence_operate")) throw new Error("SQL failure");
      return original(sql);
    });
    const signal = cancellation === "deadline" ? AbortSignal.timeout(20) : abort.signal;
    const result = owner.execute(context, "complete", {}, null, signal);
    const rejection = expect(result).rejects.toThrow("EVIDENCE_OWNER_UNAVAILABLE");
    for (let i = 0; i < 100; i++) await Promise.resolve();
    const dispatched = query.mock.calls.length;
    if (boundary !== "checkout") expect(query.mock.calls.at(-1)?.[0]).toContain(boundary);
    abort.abort();
    // The caller must settle while the underlying boundary is still delayed.
    await Promise.race([rejection, new Promise((_, reject) => setTimeout(() => reject(new Error("abort retained checkout")), 100))]);
    if (boundary !== "checkout") expect(release).toHaveBeenCalledWith(true);
    if (cancellation === "deadline" && boundary !== "checkout") failLate(new Error("late socket failure"));
    else resume({ rows: [{ safe: true }] });
    for (let i = 0; i < 100; i++) await Promise.resolve();
    expect(query.mock.calls).toHaveLength(dispatched);
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(true);
  });
  test("rejects privileged login before asserting identity or invoking private SQL", async () => {
    const { owner, query, release } = setup(false);
    await expect(owner.execute(context, "init", {}, null, new AbortController().signal)).rejects.toThrow("EVIDENCE_OWNER_UNAVAILABLE");
    expect(query.mock.calls.some(call => call[0].includes("set_config"))).toBe(false);
    expect(release).toHaveBeenCalledWith(true);
  });
});
