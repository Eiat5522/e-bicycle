import type { BikeStatus } from "@glide/shared";

import { hasSupabaseConfig, supabase } from "./supabase";
import type { Database } from "./supabase.types";

type BikeStatusRow = Pick<
  Database["public"]["Tables"]["bikes"]["Row"],
  | "active_ride_start_location"
  | "active_ride_started_at"
  | "active_rider_id"
  | "id"
  | "location"
  | "status"
>;

export interface BikeStatusService {
  updateBikeStatus(input: {
    actorId: string;
    bikeId: string;
    status: BikeStatus;
  }): Promise<void>;
}

function validateTransition(
  bike: BikeStatusRow,
  requestedStatus: BikeStatus,
  actorId: string
) {
  if (
    requestedStatus === "in_use" &&
    bike.status === "in_use" &&
    bike.active_rider_id !== actorId
  ) {
    throw new Error("This bike is already in use by another rider.");
  }

  if (requestedStatus === "available" && bike.active_rider_id !== actorId) {
    throw new Error("Only the active rider can end this ride.");
  }

  if (requestedStatus === "reserved" && bike.status !== "available") {
    throw new Error("Only available bikes can be reserved.");
  }

  if (requestedStatus === "maintenance" && bike.status === "in_use") {
    throw new Error("Cannot set in-use bike to maintenance.");
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported bike status: ${String(value)}`);
}

function getTransitionKind(status: BikeStatus) {
  switch (status) {
    case "in_use":
      return "ride_start";
    case "available":
      return "ride_end";
    case "reserved":
      return "reserve";
    case "maintenance":
      return "maintenance";
    default:
      return assertNever(status);
  }
}

function createSupabaseBikeStatusService(): BikeStatusService {
  return {
    async updateBikeStatus({ actorId, bikeId, status }) {
      const { data: currentBike, error: currentBikeError } = await supabase
        .from("bikes")
        .select(
          "id, status, active_rider_id, location, active_ride_started_at, active_ride_start_location"
        )
        .eq("id", bikeId)
        .maybeSingle();

      if (currentBikeError) {
        throw new Error(`Failed to fetch bike status: ${currentBikeError.message}`);
      }

      if (!currentBike) {
        throw new Error("Bike not found.");
      }

      // complete_ride releases the bike atomically before the mobile retry path
      // runs, so an unowned available bike is an idempotent success.
      if (
        currentBike.status === "available" &&
        status === "available" &&
        currentBike.active_rider_id === null
      ) {
        return;
      }

      if (
        currentBike.status === status &&
        status === "reserved" &&
        currentBike.active_rider_id === actorId
      ) {
        return;
      }

      validateTransition(currentBike, status, actorId);

      if (currentBike.status === status) {
        return;
      }

      const reportedAt = new Date().toISOString();
      const isStartingRide = status === "in_use";
      const isAssigningRider = isStartingRide || status === "reserved";
      const activeRiderId = isAssigningRider ? actorId : null;

      const { data, error } = await supabase.rpc("update_bike_status_with_event", {
        p_active_ride_start_location: isStartingRide ? currentBike.location : null,
        p_active_ride_started_at: isStartingRide ? reportedAt : null,
        p_active_rider_id: activeRiderId,
        p_actor_id: actorId,
        p_bike_id: bikeId,
        p_context: {
          active_ride_start_location: currentBike.active_ride_start_location,
          active_ride_started_at: currentBike.active_ride_started_at,
          active_rider_id_after: activeRiderId,
          active_rider_id_before: currentBike.active_rider_id,
          bike_location: currentBike.location,
          requested_status: status,
          source: "apps/mobile/src/lib/bike-status-service.ts"
        },
        p_expected_active_rider_id: currentBike.active_rider_id,
        p_expected_status: currentBike.status,
        p_last_reported_at: reportedAt,
        p_status: status,
        p_transition_kind: getTransitionKind(status)
      });

      if (error) {
        throw new Error(`Failed to update bike status: ${error.message}`);
      }

      if (!data?.length) {
        throw new Error("Bike state changed. Please retry.");
      }
    }
  };
}

function createBikeStatusService(): BikeStatusService {
  if (hasSupabaseConfig) {
    return createSupabaseBikeStatusService();
  }

  return {
    async updateBikeStatus() {
      throw new Error("Supabase configuration is required to sync bike status changes.");
    }
  };
}

export const configuredBikeStatusService = createBikeStatusService();