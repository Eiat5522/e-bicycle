import type { StaffSnapshot, StaffTabletBootstrapResponse } from "@glide/shared";
import { createAdminClient } from "../supabase/admin";
import type { StaffTabletAuthContext } from "../supabase/require-staff-tablet-access";

export class BootstrapUnavailableError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

/** Never collapse elevated operational roles into admin authority. */
export function projectStaffRole(role: string): StaffSnapshot["role"] {
  switch (role) {
    case "station_staff": return "station_staff";
    case "station_manager": return "station_manager";
    case "admin": return "admin";
    default: throw new BootstrapUnavailableError("BOOTSTRAP_ROLE_UNSUPPORTED", "Staff role cannot be represented by the tablet snapshot.");
  }
}

/** Canonical subset only: this is deliberately NOT a complete bootstrap DTO. */
export async function loadScopedCanonicalSnapshot(
  context: StaffTabletAuthContext,
  deviceIdentifier: string,
  client: ReturnType<typeof createAdminClient>,
) {
  const stationId = context.deviceStationId;
  const scopeError = () => new BootstrapUnavailableError("BOOTSTRAP_SCOPE_UNAVAILABLE", "The validated station snapshot is unavailable.");
  if (!stationId || (context.stationId !== null && context.stationId !== stationId) ||
    !context.staffStationId || (!context.isCrossStationAllowed && context.staffStationId !== stationId)) throw scopeError();
  try {
    const [stationResult, staffResult, deviceResult, bikesResult] = await Promise.all([
      client.from("stations").select("id, station_name, operating_status").eq("id", stationId).maybeSingle(),
      client.from("staff_profiles").select("id, profile_id, staff_name, role, station_id, status").eq("id", context.staffId).eq("profile_id", context.userId).maybeSingle(),
      client.from("tablet_devices").select("id, device_identifier, device_status, station_id").eq("id", context.deviceId).eq("device_identifier", deviceIdentifier).eq("station_id", stationId).maybeSingle(),
      client.from("bikes").select("id, station_id, model, status, battery_status, last_reported_at, active_rider_id, active_ride_started_at").eq("station_id", stationId),
    ]);
    if ([stationResult, staffResult, deviceResult, bikesResult].some((result) => result.error)) throw new Error("query failed");
    const station = stationResult.data;
    const staff = staffResult.data;
    const device = deviceResult.data;
    if (!station || station.id !== stationId || !staff || staff.id !== context.staffId ||
      staff.profile_id !== context.userId || staff.role !== context.staffRole || staff.station_id !== context.staffStationId || staff.status !== "active" ||
      !device || device.id !== context.deviceId || device.device_identifier !== deviceIdentifier || device.station_id !== stationId || device.device_status !== "active" ||
      !bikesResult.data || bikesResult.data.some((bike) => bike.station_id !== stationId)) throw scopeError();
    const projectedStaff: StaffSnapshot = { staffId: staff.id, name: staff.staff_name, role: projectStaffRole(staff.role), stationIds: [staff.station_id] };
    const bikes: StaffTabletBootstrapResponse["bikes"] = bikesResult.data.map((bike) => {
      // Preserve legacy declarations without claiming a policy-approved conversion.
      if (bike.status === "available" || bike.status === "maintenance") {
        throw new BootstrapUnavailableError("BOOTSTRAP_STATUS_UNSUPPORTED", "Bike status schema requires reconciliation.");
      }
      return {
        vehicleId: bike.id, model: bike.model, productStatus: bike.status,
        serverStatus: bike.status, stationId, batteryStatus: bike.battery_status,
        lastKnownAtServer: bike.last_reported_at,
      };
    });
    // Bike-owned active ride markers have no canonical rentalId, start station
    // or payment verification state. Never turn them into fabricated rentals.
    return { station, staff: projectedStaff, device, bikes,
      activeRideMarkers: bikesResult.data.filter((bike) => bike.active_rider_id !== null || bike.active_ride_started_at !== null) };
  } catch (error) {
    if (error instanceof BootstrapUnavailableError) throw error;
    throw new BootstrapUnavailableError("BOOTSTRAP_READ_UNAVAILABLE", "Unable to read the station snapshot.");
  }
}

/**
 * No approved notice-version/offline-policy source exists in the current schema
 * or server configuration. Do not interpret arbitrary device metadata as policy.
 * Keep the public endpoint unavailable rather than manufacture approved values.
 */
export async function loadStaffTabletSnapshot(
  context: StaffTabletAuthContext,
  deviceIdentifier: string,
  dependencies: { createClient?: typeof createAdminClient } = {},
): Promise<StaffTabletBootstrapResponse> {
  void context;
  void deviceIdentifier;
  void dependencies;
  throw new BootstrapUnavailableError("BOOTSTRAP_CONFIGURATION_UNAVAILABLE", "Approved notice versions and offline access policy are unavailable.");
}
