export type BikeStatus = "available" | "reserved" | "in_use" | "maintenance";
export type RideStatus = "ready" | "active" | "paused" | "completed";
export type SupportMode = "chatbot" | "live_agent";

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface Bike {
  readonly id: string;
  readonly model: string;
  readonly rideClass?: string;
  readonly estimatedRangeKm: number;
  readonly topSpeedKmh: number;
  readonly pricingLabel: string;
  readonly status: BikeStatus;
  readonly location: string;
  readonly coordinates: Coordinates;
  readonly lastReportedAt: string;
}

export interface NearbyBikesQuery {
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
  readonly limit?: number;
}

export interface NearbyBikesResult {
  readonly bikes: readonly Bike[];
  readonly serverTime: string;
  readonly searchCenter?: Coordinates;
}

export interface Ride {
  readonly id: string;
  readonly bikeId: string;
  readonly status: RideStatus;
  readonly durationSec: number;
  readonly distanceKm: number;
  readonly currentCost: number;
  readonly startLocation: string;
  readonly endLocation?: string;
  readonly nextDropoffZoneKm?: number;
}

export interface RideSummary {
  readonly rideId: string;
  readonly totalCost: number;
  readonly distanceKm: number;
  readonly co2SavedKg: number;
  readonly routeLabel: string;
}

export interface WalletTransaction {
  readonly id: string;
  readonly type: "ride" | "top_up" | "reward";
  readonly title: string;
  readonly subtitle: string;
  readonly amount: number;
  readonly timestamp: string;
}

export interface Wallet {
  readonly balance: number;
  readonly points: number;
  readonly paymentMethods: readonly string[];
  readonly transactions: readonly WalletTransaction[];
}

export interface User {
  readonly id: string;
  readonly firstName: string;
  readonly email: string;
}

export interface SupportSession {
  readonly id: string;
  readonly mode: SupportMode;
  readonly status: "open" | "escalated" | "closed";
}

export interface AdminOverview {
  readonly activeBikes: number;
  readonly activeRides: number;
  readonly openSupportSessions: number;
  readonly walletBalanceTotal: number;
}
