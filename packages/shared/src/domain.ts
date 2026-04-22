export type BikeStatus = "available" | "reserved" | "in_use" | "maintenance";
export type RideStatus = "ready" | "active" | "paused" | "completed";
export type SupportMode = "chatbot" | "live_agent";
export type UnlockMethod = "qr" | "bluetooth";
export type UnlockStatus =
  | "idle"
  | "scanning"
  | "connecting"
  | "authorizing"
  | "unlocking"
  | "success"
  | "failed";

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface Bike {
  readonly id: string;
  readonly model: string;
  readonly imageUrl?: string;
  readonly rideClass?: string;
  readonly estimatedRangeKm: number;
  readonly topSpeedKmh: number;
  readonly pricingLabel: string;
  readonly ratePerMinute?: number;
  readonly status: BikeStatus;
  readonly activeRiderId?: string | null;
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

export interface UnlockRequest {
  readonly bikeId: string;
  readonly method: UnlockMethod;
  readonly attempt: number;
}

export interface UnlockPhase {
  readonly status: Extract<UnlockStatus, "scanning" | "connecting" | "authorizing" | "unlocking">;
  readonly label: string;
  readonly description: string;
}

export interface UnlockResult {
  readonly bikeId: string;
  readonly method: UnlockMethod;
  readonly attempt: number;
  readonly phases: readonly UnlockPhase[];
  readonly finalStatus: Extract<UnlockStatus, "success" | "failed">;
  readonly successMessage: string;
  readonly failureMessage?: string;
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

export interface RideHistoryCheckpoint {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly coordinates: Coordinates;
  readonly elapsedSec: number;
}

export interface RideHistoryItem {
  readonly id: string;
  readonly bikeId: string;
  readonly bikeModel: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationSec: number;
  readonly distanceKm: number;
  readonly totalCost: number;
  readonly ratePerMinute: number;
  readonly billableMinutes: number;
  readonly currencyCode: string;
  readonly walletTransactionId: string | null;
  readonly fareCalculationMethod: string;
  readonly co2SavedKg: number;
  readonly startLocation: string;
  readonly endLocation: string;
  readonly routeLabel: string;
  readonly paymentLabel: string;
  readonly route: readonly Coordinates[];
  readonly checkpoints: readonly RideHistoryCheckpoint[];
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

export type KpiTrendKey = "revenue" | "activeRides" | "utilization" | "supportLoad";

export interface KpiTrendPoint {
  readonly label: string;
  readonly revenue: number;
  readonly activeRides: number;
  readonly utilization: number;
  readonly supportLoad: number;
}

export interface ExecutiveKpiMetric {
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly deltaTone: "positive" | "neutral" | "warning";
  readonly detail: string;
  readonly trendKey: KpiTrendKey;
}

export interface ExecutiveKpiInsight {
  readonly title: string;
  readonly value: string;
  readonly detail: string;
  readonly tone: "accent" | "success" | "warning";
}

export interface ExecutiveKpiSummary {
  readonly headlineMetrics: readonly ExecutiveKpiMetric[];
  readonly trends: readonly KpiTrendPoint[];
  readonly insights: readonly ExecutiveKpiInsight[];
}
