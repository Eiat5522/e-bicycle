import {
  getBikeStatusTransitionKind,
  type BikeStatus
} from "@glide/shared";

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

function validateTransition(bike: BikeStatusRow, requestedStatus: BikeStatus, actorId: string) {
  if (requestedStatus === "reserved") {
    if (bike.status !== "ready_to_rent") {
      throw new Error("Only ready-to-rent bikes can be reserved.");
    }

    return;
  }

  if (requestedStatus === "in_use") {
    if (bike.status === "in_use" && bike.active_rider_id !== actorId) {
      throw new Error("This bike is already in use by another rider.");
    }

    if (bike.status === "reserved" && bike.active_rider_id !== actorId) {
      throw new Error("This bike is reserved by another rider.");
    }

    if (bike.status !== "ready_to_rent" && bike.status !== "reserved" && bike.status !== "in_use") {
      throw new Error("Only ready-to-rent or reserved bikes can start a ride.");
    }

    return;
  }

  if (requestedStatus === "returned_pending_inspection") {
    if (bike.status !== "in_use") {
      throw new Error("Only in-use bikes can be returned for inspection.");
    }

    if (bike.active_rider_id !== actorId) {
      throw new Error("Only the active rider can end this ride.");
    }

    return;
  }

  throw new Error("Unsupported bike status transition.");
}

function getTransitionKind(status: BikeStatus) {
  switch (status) {
    case "in_use":
      return getBikeStatusTransitionKind("rider", "start_ride") ?? "ride_start";
    case "reserved":
      return getBikeStatusTransitionKind("rider", "reserve") ?? "reserve";
    case "returned_pending_inspection":
      return getBikeStatusTransitionKind("rider", "complete_ride") ?? "ride_end";
    default:
      throw new Error(`Unsupported rider bike status: ${status}`);
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

      const isSameStatus = currentBike.status === status;
      const isOwnedNoOp =
        (status === "in_use" || status === "reserved") && currentBike.active_rider_id === actorId;
      const isReturnRetry =
        status === "returned_pending_inspection" && currentBike.active_rider_id === null;

      if (isSameStatus && (isOwnedNoOp || isReturnRetry)) {
        return;
      }

      validateTransition(currentBike, status, actorId);

      if (currentBike.status === status) {
        return;
      }

      const reportedAt = new Date().toISOString();
      const isStartingRide = status === "in_use";
      const isEndingRide = status === "returned_pending_inspection";
      const isAssigningRider = isStartingRide || status === "reserved";
      const activeRiderId = isAssigningRider ? actorId : null;

      const { data, error } = await supabase.rpc("update_bike_status_with_event", {
        p_active_ride_start_location: isStartingRide ? currentBike.location : null,
        p_active_ride_started_at: isStartingRide ? reportedAt : null,
        p_active_rider_id: isEndingRide ? null : activeRiderId,
        p_actor_id: actorId,
        p_bike_id: bikeId,
        p_context: {
          active_ride_start_location: currentBike.active_ride_start_location,
          active_ride_started_at: currentBike.active_ride_started_at,
          active_rider_id_after: isEndingRide ? null : activeRiderId,
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
