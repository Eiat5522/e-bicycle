"use client";

import type { Coordinates, RideHistoryCheckpoint } from "@glide/shared";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type {
  KeyboardEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes
} from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import Image, { type ImageLoaderProps } from "next/image";
import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { formatAdminDate } from "@/lib/formatting";
import { DrawerCloseButton } from "@/components/side-drawer";
import { StatusToast } from "@/components/status-toast";

export interface ManagedBike {
  readonly id: string;
  readonly model: string;
  readonly rideClass: string | null;
  readonly topSpeedKmh: number;
  readonly pricingLabel: string;
  readonly ratePerMinute: number;
  readonly status: "available" | "reserved" | "in_use" | "maintenance";
  readonly activeRiderId: string | null;
  readonly activeRiderLabel: string | null;
  readonly location: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly lastReportedAt: string;
  readonly imageUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BikeRideHistoryEntry {
  readonly id: string;
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

const statusClasses: Record<ManagedBike["status"], string> = {
  available: "bg-[var(--clay-success-soft)] text-[var(--clay-success)]",
  reserved: "bg-[var(--clay-warning-soft)] text-[var(--clay-warning)]",
  in_use: "bg-[var(--clay-accent-soft)] text-[var(--clay-accent)]",
  maintenance: "bg-[var(--clay-danger-soft)] text-[var(--clay-danger)]"
};
const routeReplayIntervalMs = 900;
const coordinateEpsilon = 1e-9;

function getActiveRiderText(bike: ManagedBike) {
  if (!bike.activeRiderId) {
    return "No active rider";
  }

  if (bike.activeRiderLabel) {
    return `Currently in use by ${bike.activeRiderLabel}`;
  }

  return `Currently in use by ${bike.activeRiderId}`;
}

function formatDistance(distanceKm: number) {
  return `${distanceKm.toFixed(1)} km`;
}

function formatDuration(durationSec: number) {
  return `${Math.round(durationSec / 60)} min`;
}

function formatMoney(amount: number, currencyCode: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    currency: currencyCode,
    style: "currency",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function getElapsedLabel(elapsedSec: number) {
  if (elapsedSec === 0) {
    return "0 min";
  }

  return formatDuration(elapsedSec);
}

function getSyntheticCheckpoints(ride: BikeRideHistoryEntry): readonly RideHistoryCheckpoint[] {
  if (ride.checkpoints.length > 0) {
    return ride.checkpoints;
  }

  const start = ride.route[0];
  const end = ride.route[ride.route.length - 1];

  if (!start || !end) {
    return [];
  }

  return [
    {
      id: `${ride.id}-route-start`,
      label: "Start",
      description: `Ride started at ${ride.startLocation}.`,
      coordinates: start,
      elapsedSec: 0
    },
    {
      id: `${ride.id}-route-end`,
      label: "End",
      description: `Ride ended at ${ride.endLocation}.`,
      coordinates: end,
      elapsedSec: ride.durationSec
    }
  ];
}

function findRouteIndex(route: readonly Coordinates[], coordinates: Coordinates) {
  return route.findIndex(
    (point) =>
      Math.abs(point.latitude - coordinates.latitude) < coordinateEpsilon &&
      Math.abs(point.longitude - coordinates.longitude) < coordinateEpsilon
  );
}

function getCurrentCheckpoint(
  route: readonly Coordinates[],
  checkpoints: readonly RideHistoryCheckpoint[],
  currentPointIndex: number
) {
  return (
    checkpoints
      .map((checkpoint) => ({
        checkpoint,
        routeIndex: findRouteIndex(route, checkpoint.coordinates)
      }))
      .filter((entry) => entry.routeIndex >= 0 && entry.routeIndex <= currentPointIndex)
      .at(-1)?.checkpoint ?? checkpoints[0] ?? null
  );
}

function RouteUnavailable() {
  return (
    <div className="clay-inset mt-4 px-4 py-5 text-sm text-[var(--foreground-muted)]">
      <p className="font-semibold text-[var(--foreground)]">Route unavailable</p>
      <p className="mt-1 leading-6">This ride record does not include coordinate telemetry yet.</p>
    </div>
  );
}

function createMarkerIcon(
  leaflet: typeof import("leaflet"),
  tone: "start" | "checkpoint" | "finish" | "current",
  isActive = false
) {
  return leaflet.divIcon({
    className: "glide-route-marker",
    html: `<span class="glide-route-marker__pin glide-route-marker__pin--${tone}${isActive ? " glide-route-marker__pin--active" : ""}"></span>`,
    iconAnchor: [12, 12],
    iconSize: [24, 24]
  });
}

export function RideRouteMap({ ride }: { readonly ride: BikeRideHistoryEntry }) {
  const checkpoints = useMemo(() => getSyntheticCheckpoints(ride), [ride]);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const currentPointRef = useRef<Coordinates | null>(null);
  const replayMarkerRef = useRef<LeafletMarker | null>(null);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentPoint = ride.route[currentPointIndex] ?? ride.route[0] ?? null;
  const currentCheckpoint = useMemo(
    () => getCurrentCheckpoint(ride.route, checkpoints, currentPointIndex),
    [checkpoints, currentPointIndex, ride.route]
  );
  const progressPercent =
    ride.route.length <= 1 ? 100 : Math.round((currentPointIndex / (ride.route.length - 1)) * 100);

  useEffect(() => {
    setCurrentPointIndex(0);
    setIsPlaying(false);
  }, [ride.id]);

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    if (currentPointIndex >= ride.route.length - 1) {
      setIsPlaying(false);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCurrentPointIndex((index) => (index >= ride.route.length - 1 ? index : index + 1));
    }, routeReplayIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [currentPointIndex, isPlaying, ride.route.length]);

  useEffect(() => {
    currentPointRef.current = currentPoint;
  }, [currentPoint]);

  useEffect(() => {
    const mapElement = mapElementRef.current;

    if (!mapElement || ride.route.length === 0) {
      return undefined;
    }

    let cancelled = false;

    async function renderMap() {
      const leaflet = await import("leaflet");

      if (cancelled || !mapElementRef.current) {
        return;
      }

      mapRef.current?.remove();
      replayMarkerRef.current = null;

      const routeCoordinates = ride.route.map(
        (point) => [point.latitude, point.longitude] as [number, number]
      );
      const map = leaflet.map(mapElementRef.current, {
        attributionControl: true,
        scrollWheelZoom: true,
        zoomControl: true
      });
      mapRef.current = map;

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        })
        .addTo(map);

      leaflet
        .polyline(routeCoordinates, {
          color: "#1f9d7a",
          lineCap: "round",
          lineJoin: "round",
          opacity: 0.92,
          weight: 5
        })
        .addTo(map);

      const startPoint = ride.route[0];
      const endPoint = ride.route[ride.route.length - 1] ?? startPoint;

      if (startPoint) {
        leaflet
          .marker([startPoint.latitude, startPoint.longitude], {
            icon: createMarkerIcon(leaflet, "start")
          })
          .bindTooltip("Start")
          .addTo(map);
      }

      if (endPoint) {
        leaflet
          .marker([endPoint.latitude, endPoint.longitude], {
            icon: createMarkerIcon(leaflet, "finish")
          })
          .bindTooltip("Finish")
          .addTo(map);
      }

      checkpoints.forEach((checkpoint) => {
        const routeIndex = findRouteIndex(ride.route, checkpoint.coordinates);

        leaflet
          .marker([checkpoint.coordinates.latitude, checkpoint.coordinates.longitude], {
            icon: createMarkerIcon(leaflet, "checkpoint")
          })
          .bindTooltip(`${checkpoint.label} · ${getElapsedLabel(checkpoint.elapsedSec)}`)
          .on("click", () => {
            setIsPlaying(false);
            setCurrentPointIndex(routeIndex >= 0 ? routeIndex : 0);
          })
          .addTo(map);
      });

      if (startPoint) {
        const replayPoint = currentPointRef.current ?? startPoint;

        replayMarkerRef.current = leaflet
          .marker([replayPoint.latitude, replayPoint.longitude], {
            icon: createMarkerIcon(leaflet, "current", true)
          })
          .bindTooltip("Replay position")
          .addTo(map);
      }

      map.fitBounds(leaflet.latLngBounds(routeCoordinates).pad(0.2), {
        maxZoom: 16
      });
    }

    void renderMap();

    return () => {
      cancelled = true;
      replayMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [checkpoints, ride.id, ride.route]);

  useEffect(() => {
    const replayMarker = replayMarkerRef.current;
    const replayPoint = currentPoint;

    if (!replayMarker || !replayPoint) {
      return undefined;
    }

    let cancelled = false;

    async function updateReplayMarker(marker: LeafletMarker, point: Coordinates) {
      const leaflet = await import("leaflet");

      if (cancelled) {
        return;
      }

      marker.setLatLng([point.latitude, point.longitude]);
      marker.setIcon(createMarkerIcon(leaflet, "current", currentPointIndex >= 0));
    }

    void updateReplayMarker(replayMarker, replayPoint);

    return () => {
      cancelled = true;
    };
  }, [currentPoint, currentPointIndex]);

  if (ride.route.length === 0) {
    return <RouteUnavailable />;
  }

  const controlLabel =
    isPlaying ? "Pause replay" : currentPointIndex >= ride.route.length - 1 ? "Replay route" : "Play replay";

  function handleTogglePlayback() {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (currentPointIndex >= ride.route.length - 1) {
      setCurrentPointIndex(0);
    }

    setIsPlaying(true);
  }

  function handleSelectCheckpoint(checkpoint: RideHistoryCheckpoint) {
    const routeIndex = findRouteIndex(ride.route, checkpoint.coordinates);
    setIsPlaying(false);
    setCurrentPointIndex(routeIndex >= 0 ? routeIndex : 0);
  }

  return (
    <div className="mt-4 grid gap-4">
      <div className="clay-inset overflow-hidden p-3">
        <div
          aria-label={`Route map for ${ride.routeLabel}`}
          className="glide-route-map"
          data-map-provider="leaflet"
          data-testid="leaflet-route-map"
          ref={mapElementRef}
          role="img"
        />
      </div>

      {checkpoints.length > 0 ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--foreground-muted)]">
              Replay progress: {progressPercent}%
            </p>
            <button
              className="clay-button clay-button-primary px-4 py-2 text-sm font-semibold"
              onClick={handleTogglePlayback}
              type="button">
              {controlLabel}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {checkpoints.map((checkpoint) => {
              const isSelected = checkpoint.id === currentCheckpoint?.id;

              return (
                <button
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? "clay-button clay-button-primary px-3 py-2 text-xs font-semibold"
                      : "clay-button px-3 py-2 text-xs font-semibold text-[var(--foreground)]"
                  }
                  key={checkpoint.id}
                  onClick={() => handleSelectCheckpoint(checkpoint)}
                  type="button">
                  <span className="sr-only">
                    {checkpoint.label} checkpoint, {getElapsedLabel(checkpoint.elapsedSec)}
                  </span>
                  <span aria-hidden="true">{checkpoint.label}</span>
                </button>
              );
            })}
          </div>

          {currentCheckpoint ? (
            <div className="rounded-[var(--clay-radius-sm)] border border-[var(--clay-border-subtle)] bg-white/50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">{currentCheckpoint.label}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--clay-accent-strong)]">
                  {getElapsedLabel(currentCheckpoint.elapsedSec)}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                {currentCheckpoint.description}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BikeStatusBadge({ status }: { readonly status: ManagedBike["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function passthroughImageLoader({ src }: ImageLoaderProps) {
  return src;
}

function BikeImageFallback({
  model,
  message
}: {
  readonly model: string;
  readonly message: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        aria-hidden="true"
        className="grid h-14 w-14 place-items-center rounded-[1rem] bg-[var(--clay-accent-soft)] text-base font-black text-[var(--clay-accent-strong)] shadow-[inset_1px_1px_0_rgba(255,255,255,0.7)]">
        GL
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">{message}</p>
        <p className="text-xs leading-5 text-[var(--foreground-muted)]">{model} media preview</p>
      </div>
    </div>
  );
}

function BikeImageFrame({
  className,
  imageUrl,
  model,
  sizes
}: {
  readonly className: string;
  readonly imageUrl: string | null;
  readonly model: string;
  readonly sizes: string;
}) {
  return (
    <div className={`clay-inset relative overflow-hidden ${className}`}>
      <BikeImageContent
        imageUrl={imageUrl}
        key={imageUrl ?? "empty-image"}
        model={model}
        sizes={sizes}
      />
    </div>
  );
}

function BikeImageContent({
  imageUrl,
  model,
  sizes
}: {
  readonly imageUrl: string | null;
  readonly model: string;
  readonly sizes: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <>
      {showImage ? (
        <>
          {!imageLoaded ? <div aria-hidden="true" className="dashboard-skeleton absolute inset-0" /> : null}
          <Image
            alt={model}
            className={`object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            fill
            loader={passthroughImageLoader}
            onError={() => {
              setImageFailed(true);
              setImageLoaded(false);
            }}
            onLoad={() => {
              setImageLoaded(true);
            }}
            sizes={sizes}
            src={imageUrl!}
            unoptimized
          />
        </>
      ) : (
        <BikeImageFallback
          message={imageUrl ? "Image unavailable" : "No image uploaded"}
          model={model}
        />
      )}
    </>
  );
}

export function BicycleManagementList({
  bikes,
  rideCounts
}: {
  readonly bikes: readonly ManagedBike[];
  readonly rideCounts: Readonly<Record<string, number>>;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="clay-card-raised flex flex-col gap-4 p-8 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--clay-accent-strong)]">
            Bicycle Management
          </p>
          <h2 className="text-4xl font-black tracking-[-0.04em] text-[var(--foreground)]">
            Manage the fleet, publish images, and review each bicycle&apos;s history.
          </h2>
          <p className="text-base leading-7 text-[var(--foreground-muted)]">
            This tab is wired to the live `bikes` table and bike image storage so admin changes
            can feed the rider-facing mobile experience.
          </p>
        </div>

        <Link
          className="clay-button clay-button-primary inline-flex px-5 py-3 text-sm font-semibold"
          href="/bicycles/new">
          Add Bicycle
        </Link>
      </div>

      {bikes.length === 0 ? (
        <div className="clay-card grid min-h-64 place-items-center p-8 text-center">
          <div className="flex max-w-md flex-col items-center gap-3">
            <div
              aria-hidden="true"
              className="grid h-16 w-16 place-items-center rounded-[1.25rem] bg-[var(--clay-accent-soft)] text-lg font-black text-[var(--clay-accent-strong)] shadow-[inset_1px_1px_0_rgba(255,255,255,0.7)]">
              GL
            </div>
            <h3 className="text-2xl font-black tracking-[-0.03em] text-[var(--foreground)]">
              No bicycles yet
            </h3>
            <p className="text-sm leading-6 text-[var(--foreground-muted)]">
              Add a fleet record to publish the first bicycle into the admin inventory.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {bikes.map((bike) => (
            <article
              className="clay-card grid gap-5 p-6 md:grid-cols-[180px_minmax(0,1fr)_auto]"
              key={bike.id}>
              <BikeImageFrame
                className="min-h-44 rounded-[1.5rem]"
                imageUrl={bike.imageUrl}
                model={bike.model}
                sizes="(max-width: 768px) 100vw, 180px"
              />

              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-black tracking-[-0.03em] text-[var(--foreground)]">
                        {bike.model}
                      </h3>
                      <BikeStatusBadge status={bike.status} />
                    </div>
                    <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                      {bike.id}
                      {bike.rideClass ? ` · ${bike.rideClass}` : ""}
                      {` · ${bike.location}`}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground-muted)]">
                      {bike.status === "in_use"
                        ? getActiveRiderText(bike)
                        : bike.status === "maintenance"
                          ? "Currently offline for maintenance"
                          : bike.status === "reserved"
                            ? "Reserved and awaiting unlock"
                            : "Available for riders"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-[var(--foreground-muted)] sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{bike.pricingLabel}</p>
                    <p>Pricing</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{bike.topSpeedKmh} km/h</p>
                    <p>Top speed</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{rideCounts[bike.id] ?? 0}</p>
                    <p>Ride history records</p>
                  </div>
                </div>

                <p className="text-sm text-[var(--foreground-muted)]">
                  Last reported {formatAdminDate(bike.lastReportedAt)} · Updated{" "}
                  {formatAdminDate(bike.updatedAt)}
                </p>
              </div>

              <div className="flex items-start justify-start md:justify-end">
                <Link
                  className="clay-button inline-flex px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
                  href={`/bicycles/${bike.id}`}
                  scroll={false}>
                  View Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({
  children,
  label
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...inputProps } = props;

  return <input {...inputProps} className={`clay-inset px-4 py-3 text-sm outline-none ${className ?? ""}`} />;
}

function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...selectProps } = props;

  return (
    <select
      {...selectProps}
      className={`clay-inset px-4 py-3 text-sm outline-none ${className ?? ""}`}
    />
  );
}

interface BicycleEditorFormState {
  readonly message: string | null;
  readonly status: "idle" | "success" | "error";
}

function getActionFailureMessage(result: unknown) {
  if (typeof result !== "object" || result === null) {
    return null;
  }

  const typedResult = result as {
    error?: unknown;
    success?: boolean;
  };

  if (typedResult.success === false) {
    return typeof typedResult.error === "string"
      ? typedResult.error
      : "Unable to save bicycle changes.";
  }

  if (typedResult.error) {
    return typeof typedResult.error === "string"
      ? typedResult.error
      : "Unable to save bicycle changes.";
  }

  return null;
}

const initialBicycleEditorFormState: BicycleEditorFormState = {
  message: null,
  status: "idle"
};

export function BicycleEditor({
  action,
  bike,
  deleteAction,
  mode,
  rideHistory,
  variant = "page"
}: {
  readonly action: (formData: FormData) => void | Promise<void>;
  readonly bike: ManagedBike;
  readonly deleteAction?: (formData: FormData) => void | Promise<void>;
  readonly mode: "create" | "edit";
  readonly rideHistory: readonly BikeRideHistoryEntry[];
  readonly variant?: "page" | "drawer";
}) {
  const isCreate = mode === "create";
  const isDrawer = variant === "drawer";
  const [isEditing, setIsEditing] = useState(isCreate);
  const [showSubmitMessage, setShowSubmitMessage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<BicycleEditorFormState>(initialBicycleEditorFormState);
  const [isPending, setIsPending] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const deleteConfirmationTitleId = useId();
  const deleteConfirmationDescriptionId = useId();
  const deleteConfirmationTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteConfirmationCancelRef = useRef<HTMLButtonElement>(null);
  const previousDeleteFocusRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);

    try {
      const result = await action(formData);
      const failureMessage = getActionFailureMessage(result);

      if (failureMessage) {
        setSubmitState({
          message: failureMessage,
          status: "error"
        });
        setShowSubmitMessage(true);
        return;
      }

      setSubmitState({
        message: null,
        status: "success"
      });

      if (!isCreate) {
        setIsEditing(false);
        setShowSubmitMessage(false);
        setToastMessage("Bicycle saved successfully.");
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      setSubmitState({
        message: error instanceof Error ? error.message : "Unable to save bicycle changes.",
        status: "error"
      });
      setShowSubmitMessage(true);
    } finally {
      setIsPending(false);
    }
  }

  function handleCancelEditing() {
    formRef.current?.reset();
    setIsEditing(false);
    setIsDeleteConfirmationOpen(false);
    setShowSubmitMessage(false);
    setSubmitState(initialBicycleEditorFormState);
  }

  function handleStartEditing() {
    setIsDeleteConfirmationOpen(false);
    setShowSubmitMessage(false);
    setSubmitState(initialBicycleEditorFormState);
    setIsEditing(true);
  }

  function handleOpenDeleteConfirmation() {
    previousDeleteFocusRef.current = deleteConfirmationTriggerRef.current;
    setIsDeleteConfirmationOpen(true);
  }

  function handleCancelDeleteConfirmation() {
    setIsDeleteConfirmationOpen(false);
  }

  useEffect(() => {
    if (!isDeleteConfirmationOpen) {
      previousDeleteFocusRef.current?.focus();
      previousDeleteFocusRef.current = null;
      return undefined;
    }

    previousDeleteFocusRef.current =
      deleteConfirmationTriggerRef.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    deleteConfirmationCancelRef.current?.focus();

    return undefined;
  }, [isDeleteConfirmationOpen]);

  function handleDeleteConfirmationKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handleCancelDeleteConfirmation();
  }

  return (
    <section
      className={
        isDrawer ? "grid gap-6 p-6" : "grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]"
      }>
      {toastMessage ? <StatusToast message={toastMessage} /> : null}

      <div className="clay-card-raised p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--clay-accent-strong)]">
              {isCreate ? "New Bicycle" : "Edit Bicycle"}
            </p>
            <h2 className="text-4xl font-black tracking-[-0.04em] text-[var(--foreground)]">
              {isCreate ? "Create a fleet record." : `Update ${bike.model}.`}
            </h2>
            <p className="max-w-2xl text-base leading-7 text-[var(--foreground-muted)]">
              {isCreate
                ? "Add a new bicycle to the fleet inventory and publish it into the admin system."
                : "Edit the bicycle details, upload a new image, and review the recorded ride history for this unit."}
            </p>
          </div>

          {isDrawer ? (
            <DrawerCloseButton
              className="clay-button px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
              label={`Close editor for ${bike.model}`}>
              Close
            </DrawerCloseButton>
          ) : null}
        </div>

        <form action={handleSubmit} className="mt-8 grid gap-5" ref={formRef}>
          {isCreate ? (
            <Field label="Bike ID">
              <TextInput
                defaultValue={bike.id}
                name="bikeId"
                placeholder="G-701"
                required
                type="text"
              />
            </Field>
          ) : (
            <>
              <input name="bikeId" type="hidden" value={bike.id} />
              <Field label="Bike ID">
                <TextInput defaultValue={bike.id} disabled type="text" />
              </Field>
            </>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Model">
              <TextInput
                defaultValue={bike.model}
                disabled={!isEditing}
                name="model"
                required
                type="text"
              />
            </Field>

            <Field label="Ride Class">
              <TextInput
                defaultValue={bike.rideClass ?? ""}
                disabled={!isEditing}
                name="rideClass"
                type="text"
              />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Pricing Label">
              <TextInput
                defaultValue={bike.pricingLabel}
                disabled={!isEditing}
                name="pricingLabel"
                required
                type="text"
              />
            </Field>

            <Field label="Rate per Minute">
              <TextInput
                defaultValue={bike.ratePerMinute.toString()}
                disabled={!isEditing}
                min="0"
                name="ratePerMinute"
                required
                step="0.0001"
                type="number"
              />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Status">
              <SelectInput defaultValue={bike.status} disabled={!isEditing} name="status">
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
              </SelectInput>
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Active Rider">
              <TextInput
                defaultValue={getActiveRiderText(bike)}
                disabled
                name="activeRiderLabel"
                type="text"
              />
            </Field>

            <Field label="Active Rider ID">
              <TextInput
                defaultValue={bike.activeRiderId ?? "None"}
                disabled
                name="activeRiderId"
                type="text"
              />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Top Speed (km/h)">
              <TextInput
                defaultValue={bike.topSpeedKmh}
                disabled={!isEditing}
                min={1}
                name="topSpeedKmh"
                required
                step="1"
                type="number"
              />
            </Field>
          </div>

          <Field label="Location">
            <TextInput
              defaultValue={bike.location}
              disabled={!isEditing}
              name="location"
              required
              type="text"
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Latitude">
              <TextInput
                defaultValue={bike.latitude}
                disabled={!isEditing}
                max={90}
                min={-90}
                name="latitude"
                required
                step="0.0001"
                type="number"
              />
            </Field>

            <Field label="Longitude">
              <TextInput
                defaultValue={bike.longitude}
                disabled={!isEditing}
                max={180}
                min={-180}
                name="longitude"
                required
                step="0.0001"
                type="number"
              />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <BikeImageFrame
              className="min-h-52 rounded-[1.75rem]"
              imageUrl={bike.imageUrl}
              model={bike.model}
              sizes="(max-width: 768px) 100vw, 220px"
            />

            <Field label="Upload Bicycle Image">
              <input
                accept="image/png,image/jpeg,image/webp"
                className="clay-inset border border-dashed border-[var(--clay-border-subtle)] px-4 py-3 text-sm"
                disabled={!isEditing}
                name="image"
                type="file"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {isCreate ? (
              <button
                className="clay-button clay-button-primary inline-flex px-5 py-3 text-sm font-semibold"
                disabled={isPending}
                type="submit">
                {isPending ? "Creating..." : "Create Bicycle"}
              </button>
            ) : isEditing ? (
              <>
                <button
                  className="clay-button clay-button-primary inline-flex px-5 py-3 text-sm font-semibold"
                  disabled={isPending}
                  type="submit">
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
                <button
                  className="clay-button inline-flex px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
                  disabled={isPending}
                  onClick={handleCancelEditing}
                  type="button">
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="clay-button clay-button-primary inline-flex px-5 py-3 text-sm font-semibold"
                onClick={() => {
                  handleStartEditing();
                }}
                type="button">
                Edit Bicycle
              </button>
            )}
            {!isDrawer && (!isEditing || isCreate) ? (
              <Link
                className="clay-button inline-flex px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
                href="/bicycles">
                Back to Fleet
              </Link>
            ) : null}
          </div>

          {showSubmitMessage && submitState.message ? (
            <p className="text-sm font-medium text-[var(--clay-danger)]" role="status">
              {submitState.message}
            </p>
          ) : null}
        </form>

        {deleteAction && !isCreate && isEditing ? (
          <div className="mt-6 flex justify-end">
            <button
              className="clay-button inline-flex border-[var(--clay-danger-soft)] bg-[var(--clay-danger-soft)] px-5 py-3 text-sm font-semibold text-[var(--clay-danger)]"
              disabled={isPending}
              onClick={handleOpenDeleteConfirmation}
              ref={deleteConfirmationTriggerRef}
              type="button">
              Delete Bicycle
            </button>
          </div>
        ) : null}
      </div>

      {deleteAction && isDeleteConfirmationOpen ? (
        <div
          aria-describedby={deleteConfirmationDescriptionId}
          aria-labelledby={deleteConfirmationTitleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
          onClick={handleCancelDeleteConfirmation}
          onKeyDown={handleDeleteConfirmationKeyDown}
          role="alertdialog">
          <div className="clay-card-raised grid w-full max-w-md gap-5 p-6" onClick={(event) => event.stopPropagation()}>
            <div className="grid gap-2">
              <h3
                className="text-2xl font-black tracking-[-0.03em] text-[var(--foreground)]"
                id={deleteConfirmationTitleId}>
                Delete {bike.model}?
              </h3>
              <p
                className="text-sm leading-6 text-[var(--foreground-muted)]"
                id={deleteConfirmationDescriptionId}>
                This permanently removes bicycle {bike.id} from the fleet. This action cannot be undone.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                className="clay-button inline-flex px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
                ref={deleteConfirmationCancelRef}
                onClick={handleCancelDeleteConfirmation}
                type="button">
                Cancel deletion
              </button>
              <form action={deleteAction}>
                <input name="bikeId" type="hidden" value={bike.id} />
                <button
                  className="clay-button inline-flex border-[var(--clay-danger-soft)] bg-[var(--clay-danger-soft)] px-5 py-3 text-sm font-semibold text-[var(--clay-danger)]"
                  disabled={isPending}
                  type="submit">
                  Delete {bike.model}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="flex flex-col gap-6">
        <section className="clay-card p-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-black tracking-[-0.03em] text-[var(--foreground)]">
              Ride History
            </h3>
            <p className="text-sm leading-6 text-[var(--foreground-muted)]">
              Historical trips associated with this bicycle.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {rideHistory.length === 0 ? (
              <div className="clay-inset px-5 py-6 text-sm text-[var(--foreground-muted)]">
                No rides have been recorded for this bicycle yet.
              </div>
            ) : (
              rideHistory.map((ride) => {
                const isExpanded = expandedRideId === ride.id;

                return (
                  <article className="clay-inset px-5 py-4" key={ride.id}>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-base font-semibold text-[var(--foreground)]">
                            {ride.routeLabel}
                          </h4>
                          <p className="text-sm text-[var(--foreground-muted)]">
                            {ride.startLocation} to {ride.endLocation}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold text-[var(--foreground)]">
                            {formatMoney(ride.totalCost, ride.currencyCode)}
                          </p>
                          <p className="text-sm text-[var(--foreground-muted)]">
                            {formatAdminDate(ride.completedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm text-[var(--foreground-muted)]">
                        <span>{formatDuration(ride.durationSec)}</span>
                        <span>•</span>
                        <span>{formatDistance(ride.distanceKm)}</span>
                        <span>•</span>
                        <span>{ride.billableMinutes} billable min</span>
                        <span>•</span>
                        <span>{formatMoney(ride.ratePerMinute, ride.currencyCode)}/min</span>
                        <span>•</span>
                        <span>{ride.co2SavedKg.toFixed(1)} kg CO2 saved</span>
                      </div>

                      <p className="text-sm text-[var(--foreground-muted)]">{ride.paymentLabel}</p>

                      <div className="flex justify-start">
                        <button
                          aria-expanded={isExpanded}
                          className="clay-button px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
                          onClick={() => setExpandedRideId(isExpanded ? null : ride.id)}
                          type="button">
                          {isExpanded ? "Hide" : "View"} route for {ride.routeLabel}
                        </button>
                      </div>

                      {isExpanded ? <RideRouteMap ride={ride} /> : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </aside>
    </section>
  );
}
