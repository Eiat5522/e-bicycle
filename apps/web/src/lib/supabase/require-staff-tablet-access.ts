import { NextResponse } from "next/server";

import { createAdminClient } from "./admin";
import { createAuthenticatedClient } from "./require-admin";

/** Elevated roles may differ from the device's station, not omit assignments. */
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
  /** Omit to use the device station. Explicit null/empty selections are invalid. */
  readonly stationId?: string | null;
}

function unauthorized() {
  return { error: NextResponse.json({ message: "Authentication is required." }, { status: 401 }) };
}

function forbidden(message: string) {
  return { error: NextResponse.json({ message }, { status: 403 }) };
}

/**
 * Verify Bearer identity, active staff/device and non-null station assignments.
 * Selected station must match the device; ordinary staff must also match it.
 * Callers must return errors before any privileged workflow work.
 */
export async function requireStaffTabletAccess(
  request: Request,
  options: RequireStaffTabletAccessOptions,
): Promise<StaffTabletAuthResult> {
  const { deviceId } = options;
  const stationId = options.stationId ?? null;

  if (typeof deviceId !== "string" || !deviceId.trim()) {
    return forbidden("A registered device identifier is required.");
  }

  let authClient;
  try {
    authClient = createAuthenticatedClient(request);
  } catch {
    return unauthorized();
  }

  let user;
  try {
    const result = await authClient.auth.getUser();
    if (result.error || !result.data.user?.id?.trim()) return unauthorized();
    user = result.data.user;
  } catch {
    return unauthorized();
  }

  try {
    const admin = createAdminClient();
    const { data: staff, error: staffError } = await admin
      .from("staff_profiles")
      .select("id, role, station_id, status")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (staffError) {
      return { error: NextResponse.json({ message: "Unable to verify staff access." }, { status: 500 }) };
    }
    if (!staff?.id?.trim() || staff.status !== "active") {
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
    if (!device?.id?.trim()) return forbidden("Device is not registered.");
    if (device.device_status === "disabled") return forbidden("Device is disabled.");
    if (device.device_status === "lost") return forbidden("Device has been reported lost.");
    if (device.device_status !== "active") return forbidden("An active device is required.");

    if (
      !staff.station_id?.trim() ||
      !device.station_id?.trim() ||
      (options.stationId !== undefined &&
        (typeof options.stationId !== "string" || !options.stationId.trim())) ||
      (stationId !== null && stationId !== device.station_id)
    ) {
      return forbidden("A valid station assignment is required.");
    }

    const isCrossStationAllowed = CROSS_STATION_ROLES.has(staff.role);
    if (!isCrossStationAllowed && staff.station_id !== device.station_id) {
      return forbidden("Staff member is not assigned to this station.");
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
  } catch {
    return { error: NextResponse.json({ message: "Unable to verify staff tablet access." }, { status: 500 }) };
  }
}
