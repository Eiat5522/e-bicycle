import type { Database } from "./database.types";

export type BikeRow = Database["public"]["Tables"]["bikes"]["Row"];
export type BikeRideHistoryRow = Database["public"]["Tables"]["bike_ride_history"]["Row"];
export type BikeStatusEventRow = Database["public"]["Tables"]["bike_status_events"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
