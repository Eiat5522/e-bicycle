import * as shared from "../src";

// Exercise the public export boundary, including persisted/transport decoding.
const contract = shared as typeof shared & {
  projectUnsupportedInventory: (input: Record<string, unknown>) => Record<string, unknown>;
  decodeInventoryResult: (input: unknown) => unknown;
};

test.each(["available", "maintenance", "future_status"])("unsupported %s retains facts without granting authority", (rawStatus) => {
  const result = contract.projectUnsupportedInventory({
    id: "bike", rawStatus, model: "Model", location: "Station",
    coordinates: { latitude: 1, longitude: 2 }, lastReportedAt: "precise-time",
    activeRideStartedAt: "2026-01-01T00:00:00.123456Z", activeRiderId: "private-actor",
    rentalId: "invented", imageUrl: "invented", status: "ready_to_rent"
  });
  expect(result).toEqual({ kind: "unsupported", id: "bike", rawStatus,
    reason: "STATUS_RECONCILIATION_REQUIRED", rentable: false, actionsAllowed: [],
    model: "Model", location: "Station", coordinates: { latitude: 1, longitude: 2 },
    lastReportedAt: "precise-time", activeRideStartedAt: "2026-01-01T00:00:00.123456Z" });
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
});

test("unknown DTO versions cannot masquerade as complete canonical inventory", () => {
  expect(() => contract.decodeInventoryResult({ contractVersion: "inventory.v999", inventory: [] }))
    .toThrow("Unsupported inventory contract version");
});
