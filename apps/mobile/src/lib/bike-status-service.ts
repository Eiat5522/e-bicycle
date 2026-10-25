import AsyncStorage from "@react-native-async-storage/async-storage";
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
  reconcilePendingStatusChanges(actorId: string): Promise<void>;
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
  type Payload = Database["public"]["Functions"]["update_bike_status_with_event"]["Args"];
  // Keep unresolved attempts intact: receipt matching includes every timestamp and context field.
  // Never infer success from a bike whose return has already cleared its owner.
  const prefix = "bike_status_attempt_v1:";
  const blocked = new Set<string>();
  async function clearAttempt(key: string) {
    blocked.add(key);
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ resolved: true }));
    } catch {
      try {
        await AsyncStorage.removeItem(key);
        blocked.delete(key);
        return;
      } catch {
        throw new Error("Bike status storage unavailable. Restore storage and retry; contact support if this persists.");
      }
    }
    blocked.delete(key);
    await AsyncStorage.removeItem(key);
  }
  async function dispatch(key: string, payload: Payload) {
    // Write-ahead fence: a crash or unavailable storage must not resurrect a
    // definitive rejection. Only an observed transport ambiguity enables replay.
    await AsyncStorage.setItem(key, JSON.stringify({ payload, replayAllowed: false }));
    let response;
    try {
      response = await supabase.rpc("update_bike_status_with_event", payload);
    } catch (error) {
      await AsyncStorage.setItem(key, JSON.stringify({ payload, replayAllowed: true }));
      throw error;
    }
    const { data, error } = response;
    if (error) {
      // SQLSTATE and PostgREST rejection codes prove a server response. Missing codes,
      // fetch failures and thrown network errors remain ambiguous and retain identity.
      const code = error.code ?? "";
      const sqlRejection = /^[0-9A-Z]{5}$/.test(code) && !/^(08|53|57|58|XX)/.test(code);
      if (sqlRejection || /^PGRST[123]/.test(code)) {
        await clearAttempt(key);
      } else {
        await AsyncStorage.setItem(key, JSON.stringify({ payload, replayAllowed: true }));
      }
      throw new Error(`Failed to update bike status: ${error.message}`);
    }
    if (!data?.length) {
      await clearAttempt(key);
      throw new Error("Bike state changed. Please retry.");
    }
    await clearAttempt(key);
  }
  const inFlight = new Map<string, { status: BikeStatus; promise: Promise<void> }>();
  async function update({ actorId, bikeId, status }: Parameters<BikeStatusService["updateBikeStatus"]>[0]) {
      const key = prefix + JSON.stringify([actorId, bikeId]);
      const stored = await AsyncStorage.getItem(key);
      const record = stored ? JSON.parse(stored) : null;
      if (blocked.has(key)) {
        await clearAttempt(key);
        return update({ actorId, bikeId, status });
      }
      if (record?.payload && record.replayAllowed !== true) {
        throw new Error("Bike status recovery requires support: dispatch outcome was not durably recorded. Do not clear app storage.");
      }
      const retry: Payload | undefined = record?.resolved ? undefined : record?.payload;
      if (retry) {
        if (retry.p_actor_id !== actorId || retry.p_bike_id !== bikeId) {
          throw new Error("Pending bike status attempt belongs to another rider or bike.");
        }
        if (retry.p_status !== status) {
          throw new Error("Resolve the pending bike status change before starting another.");
        }
        return dispatch(key, retry);
      }
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
      if (isSameStatus && isOwnedNoOp) {
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

      const payload: Payload = {
        ...(isStartingRide ? {
          p_active_ride_start_location: currentBike.location,
          p_active_ride_started_at: reportedAt
        } : {}),
        ...(activeRiderId === null ? {} : { p_active_rider_id: activeRiderId }),
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
        ...(currentBike.active_rider_id === null ? {} : {
          p_expected_active_rider_id: currentBike.active_rider_id
        }),
        p_expected_status: currentBike.status,
        p_last_reported_at: reportedAt,
        p_status: status,
        p_transition_kind: getTransitionKind(status)
      };
      await dispatch(key, payload);
  }
  return {
    async reconcilePendingStatusChanges(actorId) {
      const keys = await AsyncStorage.getAllKeys();
      for (const key of keys) {
        if (!key.startsWith(prefix)) continue;
        const [owner, bikeId] = JSON.parse(key.slice(prefix.length));
        if (owner !== actorId) continue;
        const stored = await AsyncStorage.getItem(key);
        const record = stored ? JSON.parse(stored) : null;
        if (record?.payload) {
          await this.updateBikeStatus({ actorId, bikeId, status: record.payload.p_status });
        }
      }
    },
    updateBikeStatus(input) {
      const key = JSON.stringify([input.actorId, input.bikeId]);
      const running = inFlight.get(key);
      if (running) {
        return running.status === input.status ? running.promise :
          Promise.reject(new Error("A bike status change is already in progress."));
      }
      const promise = update(input).finally(() => { inFlight.delete(key); });
      inFlight.set(key, { status: input.status, promise });
      return promise;
    }
  };
}

function createBikeStatusService(): BikeStatusService {
  if (hasSupabaseConfig) {
    return createSupabaseBikeStatusService();
  }

  return {
    async reconcilePendingStatusChanges() {},
    async updateBikeStatus() {
      throw new Error("Supabase configuration is required to sync bike status changes.");
    }
  };
}

export const configuredBikeStatusService = createBikeStatusService();
