import { bikeStatusValues } from "./bike-status";
import type { BikeStatus } from "./bike-status";
import type { Bike, Coordinates } from "./domain";

export const inventoryContractVersion = "inventory.v1" as const;
export const inventoryUnavailableReason = "STATUS_RECONCILIATION_REQUIRED" as const;
export const inventoryUnavailableMessage = "Unavailable: status reconciliation required";

export interface UnsupportedInventory {
  readonly kind: "unsupported";
  readonly id: string;
  readonly rawStatus: string;
  readonly reason: typeof inventoryUnavailableReason;
  readonly rentable: false;
  readonly actionsAllowed: readonly [];
  readonly model?: string;
  readonly stationId?: string;
  readonly location?: string;
  readonly coordinates?: Coordinates;
  readonly lastReportedAt?: string;
  readonly activeRideStartedAt?: string | null;
  readonly batteryLevel?: number;
  readonly batteryStatus?: string;
}

export type BikeInventory =
  | { readonly kind: "supported"; readonly bike: Bike }
  | UnsupportedInventory;

export interface InventoryResult {
  readonly contractVersion: typeof inventoryContractVersion;
  readonly inventory: readonly BikeInventory[];
  /** Matching scoped rows before limit, including unsupported records. */
  readonly totalCount: number;
  readonly unsupportedCount: number;
  readonly returnedCount: number;
  readonly returnedUnsupportedCount: number;
  readonly serverTime: string;
  readonly searchCenter?: Coordinates;
}

export class InventoryContractError extends Error {
  readonly code = "UNSUPPORTED_INVENTORY_CONTRACT";
  constructor(message = "Unsupported inventory contract version") { super(message); }
}

export function isCanonicalBikeStatus(status: unknown): status is BikeStatus {
  return typeof status === "string" && bikeStatusValues.some((value) => value === status);
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InventoryContractError("Invalid inventory payload");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string") throw new InventoryContractError("Invalid inventory text");
  return value;
}
function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new InventoryContractError("Invalid inventory number");
  return value;
}
function coordinates(value: unknown): Coordinates {
  const row = object(value);
  const latitude = number(row.latitude), longitude = number(row.longitude);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new InventoryContractError("Invalid inventory coordinates");
  return { latitude, longitude };
}

/** Explicit public-field allowlist: actor IDs and inferred rental/safety facts never cross this boundary. */
export function projectUnsupportedInventory(input: Record<string, unknown>): UnsupportedInventory {
  const result: UnsupportedInventory = {
    kind: "unsupported", id: text(input.id), rawStatus: text(input.rawStatus),
    reason: inventoryUnavailableReason, rentable: false, actionsAllowed: [],
    ...(input.model !== undefined ? { model: text(input.model) } : {}),
    ...(input.stationId !== undefined ? { stationId: text(input.stationId) } : {}),
    ...(input.location !== undefined ? { location: text(input.location) } : {}),
    ...(input.coordinates !== undefined ? { coordinates: coordinates(input.coordinates) } : {}),
    ...(input.lastReportedAt !== undefined ? { lastReportedAt: text(input.lastReportedAt) } : {}),
    ...(input.activeRideStartedAt !== undefined ? { activeRideStartedAt: input.activeRideStartedAt === null ? null : text(input.activeRideStartedAt) } : {}),
    ...(input.batteryLevel !== undefined ? { batteryLevel: number(input.batteryLevel) } : {}),
    ...(input.batteryStatus !== undefined ? { batteryStatus: text(input.batteryStatus) } : {}),
  };
  return result;
}

/** Runtime decoding, not an assertion that arbitrary HTTP/cache JSON is a domain bike. */
export function decodeBikeInventory(value: unknown): BikeInventory {
  const row = object(value);
  if (row.kind === "unsupported") {
    if (isCanonicalBikeStatus(row.rawStatus) || row.reason !== inventoryUnavailableReason || row.rentable !== false || !Array.isArray(row.actionsAllowed) || row.actionsAllowed.length !== 0 || "status" in row || "productStatus" in row) throw new InventoryContractError("Invalid unsupported inventory authority");
    return projectUnsupportedInventory(row);
  }
  if (row.kind !== "supported") throw new InventoryContractError("Invalid inventory discriminator");
  const bike = object(row.bike);
  if (!isCanonicalBikeStatus(bike.status)) throw new InventoryContractError("Invalid supported bike status");
  return { kind: "supported", bike: {
    id: text(bike.id), model: text(bike.model), status: bike.status,
    location: text(bike.location), coordinates: coordinates(bike.coordinates),
    lastReportedAt: text(bike.lastReportedAt), estimatedRangeKm: number(bike.estimatedRangeKm),
    topSpeedKmh: number(bike.topSpeedKmh), pricingLabel: text(bike.pricingLabel),
    ...(bike.ratePerMinute !== undefined ? { ratePerMinute: number(bike.ratePerMinute) } : {}),
    ...(bike.imageUrl !== undefined ? { imageUrl: text(bike.imageUrl) } : {}),
    ...(bike.rideClass !== undefined ? { rideClass: text(bike.rideClass) } : {}),
    ...(bike.activeRiderId !== undefined ? { activeRiderId: bike.activeRiderId === null ? null : text(bike.activeRiderId) } : {}),
    ...(bike.activeRideStartedAt !== undefined ? { activeRideStartedAt: bike.activeRideStartedAt === null ? null : text(bike.activeRideStartedAt) } : {}),
  } };
}

export function decodeInventoryResult(value: unknown): InventoryResult {
  const row = object(value);
  if (row.contractVersion !== inventoryContractVersion) throw new InventoryContractError();
  if (!Array.isArray(row.inventory)) throw new InventoryContractError("Invalid inventory list");
  const inventory = row.inventory.map(decodeBikeInventory);
  const totalCount = number(row.totalCount), unsupportedCount = number(row.unsupportedCount);
  const returnedCount = number(row.returnedCount), returnedUnsupportedCount = number(row.returnedUnsupportedCount);
  const counts = [totalCount, unsupportedCount, returnedCount, returnedUnsupportedCount];
  if (counts.some((v) => !Number.isSafeInteger(v) || v < 0) || returnedCount !== inventory.length || returnedUnsupportedCount !== inventory.filter((r) => r.kind === "unsupported").length || totalCount < returnedCount || unsupportedCount < returnedUnsupportedCount || unsupportedCount > totalCount) throw new InventoryContractError("Invalid inventory counts");
  return { contractVersion: inventoryContractVersion, inventory, totalCount, unsupportedCount, returnedCount, returnedUnsupportedCount, serverTime: text(row.serverTime), ...(row.searchCenter !== undefined ? { searchCenter: coordinates(row.searchCenter) } : {}) };
}

/** Canonical-only clients must fail explicitly, never receive a misleading filtered list. */
export function requireCanonicalInventory(record: BikeInventory): Bike {
  if (record.kind !== "supported") throw new InventoryContractError("Bike status schema requires reconciliation. Use inventory.v1.");
  return record.bike;
}
