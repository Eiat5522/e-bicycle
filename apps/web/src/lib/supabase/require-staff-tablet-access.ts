import { NextResponse } from "next/server";

import { createAdminClient } from "./admin";
import { createAuthenticatedClient } from "./require-admin";

/**
 * Staff roles that are allowed to operate across stations (manager/admin
 * policy). All other staff roles must be assigned to the requested station.
 */
const CROSS_STATION_ROLES = new Set([
  "admin",
  "operations_manager",
  "assistant_operations_manager",
]);

export interface StaffTabletAuthContext {
  readonly userId: string;
  readonly staffId: string;
  readonly staffRole: string;
  readonly staffStationId: string | null;
  readonly deviceId: string;
  readonly deviceStationId: string | null;
  readonly stationId: string | null;
  readonly isCrossStationAllowed: boolean;
}

export type StaffTabletAuthResult =
  | { context: StaffTabletAuthContext }
  | { error: NextResponse };

export interface RequireStaffTabletAccessOptions {
  /** Registered tablet device identifier for this request. */
  readonly deviceId: string;
  /** Station the request is scoped to, if any. */
  readonly stationId?: string | null;
}

function unauthorized(message = "Authentication is required.") {
  return { error: NextResponse.json({ message }, { status: 401 }) };
}

function forbidden(message: string) {
  return { error: NextResponse.json({ message }, { status: 403 }) };
}

/**
 * Validate a `/api/staff-tablet/*` request end-to-end:
 *
 * 1. Requires a valid Supabase Bearer token.
 * 2. Requires an active `staff_profiles` row for the authenticated user.
 * 3. Requires a registered `tablet_devices` row for `deviceId` with
 *    `device_status = 'active'` (rejects `disabled` and `lost`).
 * 4. If `stationId` is provided, requires the staff member (or device) be
 *    assigned to that station, unless the staff role is manager/admin.
 */
export async function requireStaffTabletAccess(
  request: Request,
  options: RequireStaffTabletAccessOptions,
): Promise<StaffTabletAuthResult> {
  const { deviceId } = options;
  const stationId = options.stationId ?? null;

  let authClient;
  try {
    authClient = createAuthenticatedClient(request);
  } catch {
    return unauthorized();
  }

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return unauthorized();
  }

  const admin = createAdminClient();

  const { data: staff, error: staffError } = await admin
    .from("staff_profiles")
    .select("id, role, station_id, status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (staffError) {
    return { error: NextResponse.json({ message: "Unable to verify staff access." }, { status: 500 }) };
  }

  if (!staff || staff.status !== "active") {
    return forbidden("An active staff profile is required.");
  }

  const { data: device, error: deviceError } = await admin
    .from("tablet_devices")
    .select("id, device_status, station_id")
    .eq("device_identifier", deviceId)
    .maybeSingle();

  if (deviceError) {
    return { error: NextResponse.json({ message: "Unable to verify device access." }, { status: 500 }) };
  }

  if (!device) {
    return forbidden("Device is not registered.");
  }

  if (device.device_status === "disabled") {
    return forbidden("Device is disabled.");
  }

  if (device.device_status === "lost") {
    return forbidden("Device has been reported lost.");
  }

  const isCrossStationAllowed = CROSS_STATION_ROLES.has(staff.role);

  if (!isCrossStationAllowed) {
    const requiredStationId = stationId ?? device.station_id;

    if (requiredStationId && staff.station_id !== requiredStationId) {
      return forbidden("Staff member is not assigned to this station.");
    }

    if (device.station_id && staff.station_id !== device.station_id) {
      return forbidden("Staff member is not assigned to this station.");
    }
  }

  return {
    context: {
      userId: user.id,
      staffId: staff.id,
      staffRole: staff.role,
      staffStationId: staff.station_id,
      deviceId: device.id,
      deviceStationId: device.station_id,
      stationId,
      isCrossStationAllowed,
    },
  };
}
