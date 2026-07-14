import { calculateRideRevenue, formatCurrency, formatDistanceKm } from "@glide/shared";

import { formatAdminDate } from "@/lib/formatting";
import type { Database } from "@/lib/supabase/database.types";
import type {
  BikeRow,
  BikeStatusEventRow,
  BikeRideHistoryRow,
  ProfileRow
} from "@/lib/supabase/database.aliases";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"];

export interface DashboardInput {
  readonly bikes: readonly BikeRow[];
  readonly bikeStatusEvents: readonly BikeStatusEventRow[];
  readonly rideHistory: readonly BikeRideHistoryRow[];
  readonly wallets: readonly WalletRow[];
  readonly walletTransactions: readonly WalletTransactionRow[];
  readonly profiles: readonly ProfileRow[];
  readonly serverTime: string;
}

interface ActiveRideSummary {
  readonly bikeId: string;
  readonly currentCost: number;
  readonly distanceKm: number;
  readonly dropoffState: "en_route" | "approaching" | "arrived";
  readonly nextDropoffZoneKm: number | null;
  readonly riderLabel: string | null;
  readonly startLocation: string;
}

interface SummaryMetric {
  readonly label: string;
  readonly value: string;
  readonly note: string;
}

interface TargetMetric {
  readonly label: string;
  readonly currentValue: string;
  readonly helperText: string;
  readonly progress: number;
}

interface FleetStatusMetric {
  readonly label: string;
  readonly count: number;
  readonly accent: string;
  readonly accentSoft: string;
}

interface ActivityFeedItem {
  readonly title: string;
  readonly detail: string;
  readonly timestamp: string;
}

interface RouteSummary {
  readonly id: string;
  readonly routeLabel: string;
  readonly completedAt: string;
  readonly distanceKm: number;
  readonly durationSec: number;
  readonly totalCost: number;
}

interface WatchlistBike {
  readonly id: string;
  readonly model: string;
  readonly location: string;
  readonly lastReportedAt: string;
  readonly estimatedRangeKm: number;
  readonly status: BikeRow["status"];
}

interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

const APPROACHING_DROPOFF_THRESHOLD_KM = 0.25;
const ARRIVED_DROPOFF_THRESHOLD_KM = 0.05;

const DROPOFF_ZONES = [
  {
    id: "benjakitti",
    label: "Benjakitti Park",
    coordinates: { latitude: 13.7319, longitude: 100.5459 }
  },
  {
    id: "lumphini-west",
    label: "Lumphini Park West Gate",
    coordinates: { latitude: 13.7305, longitude: 100.5418 }
  },
  {
    id: "silom-complex",
    label: "Silom Complex",
    coordinates: { latitude: 13.7286, longitude: 100.5345 }
  }
] as const;

export interface ExecutiveScorecardViewModel {
  readonly refreshedAtLabel: string;
  readonly reportingWindowLabel: string;
  readonly headlineMetrics: readonly {
    readonly label: string;
    readonly value: string;
    readonly delta: string;
    readonly deltaTone: "positive" | "neutral" | "warning";
    readonly detail: string;
    readonly trendKey: "revenue" | "activeRides" | "utilization" | "supportLoad";
  }[];
  readonly trends: readonly {
    readonly label: string;
    readonly revenue: number;
    readonly activeRides: number;
    readonly utilization: number;
    readonly supportLoad: number;
  }[];
  readonly insights: readonly {
    readonly title: string;
    readonly value: string;
    readonly detail: string;
    readonly tone: "accent" | "success" | "warning";
  }[];
}

export interface OperationsDashboardViewModel {
  readonly lastSyncLabel: string;
  readonly summaryMetrics: readonly SummaryMetric[];
  readonly targetMetrics: readonly TargetMetric[];
  readonly fleetBreakdown: readonly FleetStatusMetric[];
  readonly recentRoutes: readonly RouteSummary[];
  readonly activityFeed: readonly ActivityFeedItem[];
  readonly watchlist: readonly WatchlistBike[];
  readonly activeRide: ActiveRideSummary | null;
  readonly completedRevenue: number;
  readonly averageCompletedRideRevenue: number;
  readonly averageRideDurationSec: number;
  readonly averageRideDistanceKm: number;
  readonly averageFleetRangeKm: number;
  readonly paymentMethodsCount: number;
  readonly totalBikes: number;
  readonly availableBikes: number;
}

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function roundMetric(value: number, digits = 1) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getRiderLabels(profiles: readonly ProfileRow[]) {
  return Object.fromEntries(profiles.map((profile) => [profile.id, profile.first_name]));
}

function getLocationCoordinatesMap(bikes: readonly BikeRow[]) {
  return new Map<string, Coordinates>(
    bikes.map((bike) => [
      bike.location,
      {
        latitude: bike.latitude,
        longitude: bike.longitude
      }
    ])
  );
}

function getNearestDropoffZone(coordinates: Coordinates) {
  const nearestZone = [...DROPOFF_ZONES]
    .map((zone) => ({
      ...zone,
      distanceKm: calculateDistanceKm(coordinates, zone.coordinates)
    }))
    .sort((leftZone, rightZone) => leftZone.distanceKm - rightZone.distanceKm)[0];

  if (!nearestZone) {
    return null;
  }

  const dropoffState: ActiveRideSummary["dropoffState"] =
    nearestZone.distanceKm <= ARRIVED_DROPOFF_THRESHOLD_KM
      ? "arrived"
      : nearestZone.distanceKm <= APPROACHING_DROPOFF_THRESHOLD_KM
        ? "approaching"
        : "en_route";

  return {
    ...nearestZone,
    dropoffState
  };
}

function getActiveRide(
  bikes: readonly BikeRow[],
  bikeStatusEvents: readonly BikeStatusEventRow[],
  profiles: readonly ProfileRow[],
  serverTime: string
) {
  const activeBike = bikes.find((bike) => bike.status === "in_use");

  if (!activeBike) {
    return null;
  }

  const riderLabels = getRiderLabels(profiles);
  const rideStartEvent = [...bikeStatusEvents]
    .filter(
      (event) =>
        event.bike_id === activeBike.id &&
        event.transition_kind === "ride_start" &&
        event.to_status === "in_use"
    )
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0];
  const rideStartContext = rideStartEvent?.context as
    | {
        readonly active_ride_start_location: string | null;
        readonly active_ride_started_at: string | null;
      }
    | null;
  const startTimestamp =
    rideStartContext?.active_ride_started_at ??
    activeBike.active_ride_started_at ??
    rideStartEvent?.created_at ??
    activeBike.last_reported_at;
  const startedAt = Date.parse(startTimestamp);
  const now = Date.parse(serverTime);
  const durationSec =
    Number.isFinite(startedAt) && Number.isFinite(now) ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
  const currentCost = calculateRideRevenue({
    durationSec,
    ratePerMinute: Number(activeBike.rate_per_minute)
  });
  const locationCoordinatesMap = getLocationCoordinatesMap(bikes);
  const startLocation =
    rideStartContext?.active_ride_start_location ?? activeBike.active_ride_start_location ?? activeBike.location;
  const startCoordinates = locationCoordinatesMap.get(startLocation);
  const currentCoordinates: Coordinates = {
    latitude: activeBike.latitude,
    longitude: activeBike.longitude
  };
  const estimatedDistanceKm = startCoordinates ? roundMetric(calculateDistanceKm(startCoordinates, currentCoordinates)) : 0;
  const nearestDropoffZone = getNearestDropoffZone(currentCoordinates);
  const dropoffState: ActiveRideSummary["dropoffState"] = nearestDropoffZone?.dropoffState ?? "en_route";

  return {
    bikeId: activeBike.id,
    currentCost,
    distanceKm: estimatedDistanceKm,
    dropoffState,
    nextDropoffZoneKm: nearestDropoffZone ? roundMetric(nearestDropoffZone.distanceKm) : null,
    riderLabel: activeBike.active_rider_id ? riderLabels[activeBike.active_rider_id] ?? activeBike.active_rider_id : null,
    startLocation
  };
}

function getDailyTrendPoints(
  rideHistory: readonly BikeRideHistoryRow[],
  totalBikes: number,
  supportLoad: number,
  serverTime: string
) {
  const completedByDay = new Map<string, { readonly revenue: number; readonly rides: number }>();

  for (const ride of rideHistory) {
    const dayKey = ride.completed_at.slice(0, 10);
    const current = completedByDay.get(dayKey) ?? { revenue: 0, rides: 0 };
    completedByDay.set(dayKey, {
      revenue: Math.round((current.revenue + Number(ride.total_cost)) * 100) / 100,
      rides: current.rides + 1
    });
  }

  const endDate = new Date(serverTime);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 6);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    const dayKey = date.toISOString().slice(0, 10);
    const dayStats = completedByDay.get(dayKey) ?? { revenue: 0, rides: 0 };

    return {
      label: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(date),
      revenue: dayStats.revenue,
      activeRides: dayStats.rides,
      utilization: formatPercent(dayStats.rides, totalBikes),
      supportLoad
    };
  });
}

function getRideSummaryRows(rideHistory: readonly BikeRideHistoryRow[]): readonly RouteSummary[] {
  return [...rideHistory]
    .sort((left, right) => new Date(right.completed_at).getTime() - new Date(left.completed_at).getTime())
    .slice(0, 3)
    .map((ride) => ({
      completedAt: ride.completed_at,
      distanceKm: Number(ride.distance_km),
      durationSec: ride.duration_sec,
      id: ride.id,
      routeLabel: ride.route_label,
      totalCost: Number(ride.total_cost)
    }));
}

function getMostValuableCompletedRide(rideHistory: readonly BikeRideHistoryRow[]): RouteSummary | null {
  if (rideHistory.length === 0) {
    return null;
  }
  const sorted = [...rideHistory].sort((left, right) => Number(right.total_cost) - Number(left.total_cost));
  const ride = sorted[0];
  if (!ride) {
    return null;
  }
  return {
    completedAt: ride.completed_at,
    distanceKm: Number(ride.distance_km),
    durationSec: ride.duration_sec,
    id: ride.id,
    routeLabel: ride.route_label,
    totalCost: Number(ride.total_cost)
  };
}

function getWatchlist(bikes: readonly BikeRow[]): readonly WatchlistBike[] {
  return [...bikes]
    .sort((left, right) => Number(left.estimated_range_km) - Number(right.estimated_range_km))
    .slice(0, 4)
    .map((bike) => ({
      estimatedRangeKm: Number(bike.estimated_range_km),
      id: bike.id,
      lastReportedAt: bike.last_reported_at,
      location: bike.location,
      model: bike.model,
      status: bike.status
    }));
}

function getFleetBreakdown(bikes: readonly BikeRow[]): readonly FleetStatusMetric[] {
  const counts = bikes.reduce<Record<BikeRow["status"], number>>(
    (accumulator, bike) => {
      accumulator[bike.status] = (accumulator[bike.status] ?? 0) + 1;
      return accumulator;
    },
    {
      available: 0,
      in_use: 0,
      maintenance: 0,
      reserved: 0
    }
  );

  return [
    {
      label: "Available",
      count: counts.available,
      accent: "var(--dashboard-success)",
      accentSoft: "var(--dashboard-success-soft)"
    },
    {
      label: "In use",
      count: counts.in_use,
      accent: "var(--dashboard-accent)",
      accentSoft: "var(--dashboard-accent-soft)"
    },
    {
      label: "Reserved",
      count: counts.reserved,
      accent: "var(--dashboard-highlight)",
      accentSoft: "var(--dashboard-highlight-soft)"
    },
    {
      label: "Maintenance",
      count: counts.maintenance,
      accent: "var(--dashboard-danger)",
      accentSoft: "var(--dashboard-danger-soft)"
    }
  ];
}

function getCompletedRevenue(rideHistory: readonly BikeRideHistoryRow[]) {
  return rideHistory.reduce((totalRevenue, ride) => totalRevenue + Number(ride.total_cost), 0);
}

function getAverage(values: readonly number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getActivityFeed(input: DashboardInput, activeRide: ActiveRideSummary | null, recentRoutes: readonly RouteSummary[]) {
  const latestWalletTransaction = input.walletTransactions[0];
  const dropoffStateLabel = activeRide
    ? activeRide.dropoffState === "arrived"
      ? "ready to end"
      : activeRide.dropoffState === "approaching"
        ? "approaching the drop-off zone"
        : "en route"
    : null;
  const activeRideMessage = activeRide
    ? `${activeRide.bikeId} is ${formatDistanceKm(activeRide.distanceKm)} into the ${activeRide.startLocation} route${dropoffStateLabel ? ` and ${dropoffStateLabel}` : ""}.`
    : "No active ride is currently assigned.";
  const activeRideTimestamp = activeRide ? "Live now" : "No active ride";
  const mostValuableRide = getMostValuableCompletedRide(input.rideHistory);

  return [
    {
      title: input.bikes.length > 0 ? "Telemetry sync completed" : "No telemetry sync yet",
      detail:
        input.bikes.length > 0
          ? `${input.bikes.length} bikes checked in across the Bangkok network.`
          : "Supabase has not returned any live bikes yet.",
      timestamp: formatAdminDate(input.serverTime)
    },
    {
      title: "Ride in progress",
      detail: activeRideMessage,
      timestamp: activeRideTimestamp
    },
    {
      title: "Latest wallet event",
      detail: latestWalletTransaction
        ? `${latestWalletTransaction.title} recorded for ${formatCurrency(Math.abs(Number(latestWalletTransaction.amount)))}.`
        : "No wallet transactions were returned from Supabase.",
      timestamp: latestWalletTransaction ? formatAdminDate(latestWalletTransaction.created_at) : "No recent event"
    },
    {
      title: "Most valuable completed ride",
      detail: mostValuableRide
        ? `${mostValuableRide.routeLabel} closed at ${formatCurrency(mostValuableRide.totalCost)}.`
        : "No completed rides were returned from Supabase.",
      timestamp: mostValuableRide ? formatAdminDate(mostValuableRide.completedAt) : "No recent completion"
    }
  ];
}

export function selectExecutiveScorecardViewModel(input: DashboardInput): ExecutiveScorecardViewModel {
  const totalBikes = input.bikes.length;
  const availableBikes = input.bikes.filter((bike) => bike.status === "available").length;
  const activeRideCount = input.bikes.filter((bike) => bike.status === "in_use").length;
  const reservedBikesCount = input.bikes.filter((bike) => bike.status === "reserved").length;
  const maintenanceCount = input.bikes.filter((bike) => bike.status === "maintenance").length;
  const walletBalanceTotal = input.wallets.reduce((totalBalance, wallet) => totalBalance + Number(wallet.balance), 0);
  const completedRevenue = getCompletedRevenue(input.rideHistory);
  const activeRide = getActiveRide(input.bikes, input.bikeStatusEvents, input.profiles, input.serverTime);
  const trackedRevenue = completedRevenue + (activeRide?.currentCost ?? 0);
  const utilizationPercent = formatPercent(activeRideCount + reservedBikesCount, totalBikes);
  const trendPoints = totalBikes === 0 && input.rideHistory.length === 0 ? [] : getDailyTrendPoints(input.rideHistory, totalBikes, maintenanceCount, input.serverTime);
  const headlineMetrics: ExecutiveScorecardViewModel["headlineMetrics"] =
    totalBikes === 0 && input.rideHistory.length === 0 && input.wallets.length === 0
    ? []
    : [
        {
          label: "Wallet float",
          value: formatCurrency(walletBalanceTotal),
          delta: input.wallets.length > 0 ? `${input.wallets.length} wallet${input.wallets.length === 1 ? "" : "s"}` : "No wallets",
          deltaTone: walletBalanceTotal > 0 ? "positive" : "neutral",
          detail: "Available rider balance across active payment wallets.",
          trendKey: "revenue" as const
        },
        {
          label: "Tracked revenue",
          value: formatCurrency(trackedRevenue),
          delta: `${input.rideHistory.length} completed`,
          deltaTone: trackedRevenue > 0 ? "positive" : "neutral",
          detail: "Completed ride revenue plus the currently open ride.",
          trendKey: "revenue" as const
        },
        {
          label: "Active rides",
          value: activeRideCount.toString(),
          delta: activeRideCount > 0 ? "Live" : "Idle",
          deltaTone: "neutral",
          detail: "Trips in motion across the Bangkok operations zone.",
          trendKey: "activeRides" as const
        },
        {
          label: "Fleet utilization",
          value: `${utilizationPercent}%`,
          delta: `${availableBikes}/${totalBikes} ready`,
          deltaTone: utilizationPercent > 50 ? "warning" : "positive",
          detail: "Share of bikes currently reserved or in use.",
          trendKey: "utilization" as const
        },
        {
          label: "Support pressure",
          value: `${maintenanceCount} open`,
          delta: maintenanceCount > 0 ? "Maintenance watch" : "Clear",
          deltaTone: maintenanceCount > 0 ? "warning" : "neutral",
          detail: "Maintenance bikes needing attention.",
          trendKey: "supportLoad" as const
        }
      ];

  const mostActiveDay = [...trendPoints].sort((left, right) => right.activeRides - left.activeRides)[0];
  const strongestRevenueDay = [...trendPoints].sort((left, right) => right.revenue - left.revenue)[0];

  const insights: ExecutiveScorecardViewModel["insights"] =
    totalBikes === 0 && input.rideHistory.length === 0 && input.wallets.length === 0
    ? []
    : [
        {
          title: "Demand is strongest on " + (mostActiveDay?.label ?? "today"),
          value: `${mostActiveDay?.activeRides ?? 0} rides`,
          detail:
            mostActiveDay && mostActiveDay.revenue > 0
              ? `${mostActiveDay.label} also brought in ${formatCurrency(mostActiveDay.revenue)} in completed ride revenue.`
              : "No completed ride volume was recorded in the current 7-day window.",
          tone: "accent" as const
        },
        {
          title: "Revenue quality is live",
          value: formatCurrency(trackedRevenue),
          detail:
            strongestRevenueDay && strongestRevenueDay.revenue > 0
              ? `${strongestRevenueDay.label} was the highest grossing day at ${formatCurrency(strongestRevenueDay.revenue)}.`
              : "Live tracked revenue is currently limited to the active ride and any completed rides returned by Supabase.",
          tone: "success" as const
        },
        {
          title: "Support needs a watch",
          value: `${maintenanceCount} open`,
          detail: maintenanceCount > 0 ? "Maintenance queue is reflected directly from live bike status." : "No bikes are flagged for maintenance right now.",
          tone: "warning" as const
        }
      ];

  return {
    refreshedAtLabel: formatAdminDate(input.serverTime),
    reportingWindowLabel: "7 days",
    headlineMetrics,
    trends: trendPoints,
    insights
  };
}

export function selectOperationsDashboardViewModel(input: DashboardInput): OperationsDashboardViewModel {
  const totalBikes = input.bikes.length;
  const availableBikes = input.bikes.filter((bike) => bike.status === "available").length;
  const activeRideCount = input.bikes.filter((bike) => bike.status === "in_use").length;
  const maintenanceCount = input.bikes.filter((bike) => bike.status === "maintenance").length;
  const completedRevenue = getCompletedRevenue(input.rideHistory);
  const averageRideDistanceKm = getAverage(input.rideHistory.map((ride) => Number(ride.distance_km)));
  const averageRideDurationSec = getAverage(input.rideHistory.map((ride) => Number(ride.duration_sec)));
  const averageFleetRangeKm = getAverage(input.bikes.map((bike) => Number(bike.estimated_range_km)));
  const averageCompletedRideRevenue = input.rideHistory.length === 0 ? 0 : completedRevenue / input.rideHistory.length;
  const walletBalanceTotal = input.wallets.reduce((totalBalance, wallet) => totalBalance + Number(wallet.balance), 0);
  const paymentMethodsCount = new Set(input.wallets.flatMap((wallet) => wallet.payment_methods)).size;
  const activeRide = getActiveRide(input.bikes, input.bikeStatusEvents, input.profiles, input.serverTime);
  const recentRoutes = getRideSummaryRows(input.rideHistory);
  const watchlist = getWatchlist(input.bikes);
  const fleetBreakdown = getFleetBreakdown(input.bikes);
  const activityFeed = getActivityFeed(input, activeRide, recentRoutes);
  const totalTrackedRevenue = completedRevenue + (activeRide?.currentCost ?? 0);

  return {
    lastSyncLabel: formatAdminDate(input.serverTime),
    summaryMetrics: [
      {
        label: "Fleet availability",
        value: `${availableBikes}/${totalBikes}`,
        note: `${formatPercent(availableBikes, totalBikes)}% dispatch-ready`
      },
      {
        label: "Active rides",
        value: activeRideCount.toString(),
        note: `${activeRide ? formatDistanceKm(activeRide.distanceKm) : "0.0 km"} in motion${activeRide?.dropoffState ? ` · ${activeRide.dropoffState.replace("_", " ")}` : ""}${activeRide?.riderLabel ? ` · in use by ${activeRide.riderLabel}` : ""}`
      },
      {
        label: "Support load",
        value: maintenanceCount.toString(),
        note: "Maintenance queue sourced from live bike status."
      },
      {
        label: "Wallet float",
        value: formatCurrency(walletBalanceTotal),
        note: `${formatCurrency(totalTrackedRevenue)} captured in tracked rides`
      },
      {
        label: "Active rider",
        value: activeRide?.riderLabel ?? "No active ride",
        note: `${activeRide?.bikeId ?? "No bike"} currently assigned`
      }
    ],
    targetMetrics: [
      {
        label: "Fleet dispatch readiness",
        currentValue: `${availableBikes} of ${totalBikes} bikes ready`,
        helperText: "Target: every bike is available or freshly reassigned.",
        progress: totalBikes === 0 ? 0 : (availableBikes / totalBikes) * 100
      },
      {
        label: "Wallet float target",
        currentValue: formatCurrency(walletBalanceTotal),
        helperText: `Target: ${formatCurrency(1500)} available for active demand.`,
        progress: clampPercent((walletBalanceTotal / 1500) * 100)
      },
      {
        label: "Average fleet range",
        currentValue: formatDistanceKm(averageFleetRangeKm),
        helperText: "Target: 40 km average range before a swap cycle.",
        progress: clampPercent((averageFleetRangeKm / 40) * 100)
      }
    ],
    fleetBreakdown,
    recentRoutes,
    activityFeed,
    watchlist,
    activeRide,
    completedRevenue,
    averageCompletedRideRevenue,
    averageRideDurationSec,
    averageRideDistanceKm,
    averageFleetRangeKm,
    paymentMethodsCount,
    totalBikes,
    availableBikes
  };
}
