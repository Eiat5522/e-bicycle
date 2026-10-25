import type { TabletSyncEnvelope } from "@glide/shared";
import { NextResponse } from "next/server";

import { requireStaffTabletAccess } from "../supabase/require-staff-tablet-access";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Root is depth zero; every value (including primitives) consumes one node.
const MAX_IDENTITY_DEPTH = 64;
const MAX_IDENTITY_NODES = 10_000;

function* identityEntries(value: Record<string, unknown> | unknown[]): Generator<[string, unknown]> {
  if (Array.isArray(value)) {
    for (const entry of value) yield ["", entry];
  } else {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) yield [key, value[key]];
    }
  }
}

function matchesIdentity(value: unknown, staffId: string, stationId: string): boolean {
  const stack = [{ entries: identityEntries([value]), depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const frame = stack[stack.length - 1]!;
    const next = frame.entries.next();
    if (next.done) {
      stack.pop();
      continue;
    }
    if (++nodes > MAX_IDENTITY_NODES || frame.depth > MAX_IDENTITY_DEPTH) return false;
    const [key, entry] = next.value;
    if (key === "staffId" && entry !== staffId) return false;
    if ((key === "stationId" || key === "returnStationId") && entry !== stationId) return false;
    if (Array.isArray(entry) || isObject(entry)) {
      stack.push({ entries: identityEntries(entry), depth: frame.depth + 1 });
    }
  }
  return true;
}

/** Required actor/scope fields from the approved payloads, not business validation. */
function hasRequiredPayloadIdentity(record: TabletSyncEnvelope["records"][number]): boolean {
  const payload = record.payload as unknown as Record<string, unknown>;
  if (["rental_start", "rental_return", "incident", "battery_log", "manual_override", "shift_closeout"].includes(record.recordType) && !isIdentifier(payload.staffId)) return false;
  if (["rental_start", "incident", "battery_log", "shift_closeout"].includes(record.recordType) && !isIdentifier(payload.stationId)) return false;
  if (record.recordType === "rental_return" && !isIdentifier(payload.returnStationId)) return false;
  if (payload.manualOverride !== undefined && (!isObject(payload.manualOverride) || !isIdentifier(payload.manualOverride.staffId))) return false;
  return true;
}

/** Identity binding only; domain payload validation remains the command handler's responsibility. */
export async function requireStaffTabletSyncContext(request: Request, envelope: TabletSyncEnvelope) {
  if (!isObject(envelope) || !isIdentifier(envelope.deviceId) || !isIdentifier(envelope.stationId) ||
    !isIdentifier(envelope.staffId) || !Array.isArray(envelope.records) ||
    !envelope.records.every((record) => isObject(record) && isIdentifier(record.localId) && isObject(record.payload) && hasRequiredPayloadIdentity(record))
  ) return invalidRequest();
  const result = await requireStaffTabletAccess(request, { deviceId: envelope.deviceId, stationId: envelope.stationId });
  if ("error" in result) return result;
  const stationId = result.context.stationId ?? result.context.deviceStationId;
  if (!stationId || !matchesIdentity(envelope, result.context.staffId, stationId) ||
    envelope.records.some((record) => record.recordType === "rider_registration" &&
      (!isObject(record.payload) || !isObject(record.payload.pdpaConsent) ||
        record.payload.pdpaConsent.staffId !== result.context.staffId ||
        record.payload.pdpaConsent.stationId !== stationId))
  ) return invalidRequest();
  return { context: result.context, deviceIdentifier: envelope.deviceId, envelope };
}

function invalidRequest() {
  return { error: NextResponse.json({ message: "Invalid staff tablet request identity." }, { status: 400 }) };
}

/** IDs remain opaque strings: reject empty/padded/control values, never normalize them. */
function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value && !/[\u0000-\u001f\u007f]/u.test(value);
}

/** deviceIdentifier is the wire deviceId, not context.deviceId (the database UUID). */
export async function requireStaffTabletQueryContext(
  request: Request,
  options: { requireSince?: boolean } = {},
) {
  const query = new URL(request.url).searchParams;
  const deviceIdentifier = query.get("deviceId");
  const stationId = query.get("stationId");
  const since = query.get("since");
  if (
    ["deviceId", "stationId", "since"].some((key) => query.getAll(key).length > 1) ||
    !isIdentifier(deviceIdentifier) || !isIdentifier(stationId) ||
    (since !== null && !isIdentifier(since)) || (options.requireSince && since === null)
  ) return invalidRequest();
  const result = await requireStaffTabletAccess(request, { deviceId: deviceIdentifier, stationId });
  if ("error" in result) return result;
  return { context: result.context, deviceIdentifier, since: since ?? undefined };
}
