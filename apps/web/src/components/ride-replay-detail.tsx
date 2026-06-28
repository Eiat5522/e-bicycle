"use client";

import type { Coordinates, RideHistoryCheckpoint } from "@glide/shared";

import { formatAdminDate } from "@/lib/formatting";
import { DrawerCloseButton } from "@/components/side-drawer";
import { RideRouteMap, type BikeRideHistoryEntry } from "@/components/bicycle-management";

export interface RideReplayDetailViewModel extends BikeRideHistoryEntry {
  readonly bikeId: string;
  readonly bikeModel: string;
  readonly profileId: string | null;
  readonly riderLabel: string | null;
  readonly dropOffContext: string;
  readonly route: readonly Coordinates[];
  readonly checkpoints: readonly RideHistoryCheckpoint[];
}

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("th-TH", {
    currency: currencyCode,
    style: "currency",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatMinutes(durationSec: number) {
  return `${Math.round(durationSec / 60)} min`;
}

function DetailMetric({
  label,
  value,
  helper
}: {
  readonly label: string;
  readonly value: string;
  readonly helper?: string;
}) {
  return (
    <div className="clay-inset min-w-0 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black tracking-[-0.03em] text-[var(--foreground)]">
        {value}
      </p>
      {helper ? <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">{helper}</p> : null}
    </div>
  );
}

export function RideReplayDetail({
  replay,
  variant = "page"
}: {
  readonly replay: RideReplayDetailViewModel;
  readonly variant?: "page" | "drawer";
}) {
  return (
    <section className={variant === "drawer" ? "p-5 sm:p-7" : "p-5 sm:p-8"}>
      <header className="flex flex-col gap-4 border-b border-[var(--clay-border-subtle)] pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--clay-accent-strong)]">
            Ride replay
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl">
            {replay.routeLabel}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
            {replay.startLocation} to {replay.endLocation} · completed{" "}
            {formatAdminDate(replay.completedAt)}
          </p>
        </div>

        {variant === "drawer" ? (
          <DrawerCloseButton
            className="clay-button w-fit px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
            label={`Close replay for ${replay.routeLabel}`}>
            Close
          </DrawerCloseButton>
        ) : null}
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetric label="Bicycle" value={`${replay.bikeId} · ${replay.bikeModel}`} />
        <DetailMetric label="Rider" value={replay.riderLabel ?? replay.profileId ?? "Unknown rider"} />
        <DetailMetric label="Drop-off" value={replay.dropOffContext} helper="End-of-ride context persisted by mobile." />
        <DetailMetric
          label="Fare"
          value={formatMoney(replay.totalCost, replay.currencyCode)}
          helper={`${replay.billableMinutes} billable min`}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
        <article className="clay-card p-5 sm:p-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--clay-accent-strong)]">
              Route
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
              Telemetry replay
            </h2>
            <p className="text-sm leading-6 text-[var(--foreground-muted)]">
              {replay.route.length} route points with {replay.checkpoints.length} persisted checkpoints.
            </p>
          </div>
          <RideRouteMap ride={replay} />
        </article>

        <aside className="grid gap-6">
          <section className="clay-card p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--clay-accent-strong)]">
                Fare details
              </p>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                Billing audit
              </h2>
            </div>

            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--foreground-muted)]">Duration</dt>
                <dd className="font-semibold text-[var(--foreground)]">{formatMinutes(replay.durationSec)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--foreground-muted)]">Distance</dt>
                <dd className="font-semibold text-[var(--foreground)]">{replay.distanceKm.toFixed(1)} km</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--foreground-muted)]">Rate</dt>
                <dd className="font-semibold text-[var(--foreground)]">
                  {formatMoney(replay.ratePerMinute, replay.currencyCode)}/min
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--foreground-muted)]">Method</dt>
                <dd className="font-semibold text-[var(--foreground)]">{replay.fareCalculationMethod}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--foreground-muted)]">Wallet transaction</dt>
                <dd className="font-semibold text-[var(--foreground)]">
                  {replay.walletTransactionId ?? "No transaction id"}
                </dd>
              </div>
            </dl>

            <p className="mt-5 rounded-[var(--clay-radius-sm)] border border-[var(--clay-border-subtle)] bg-white/50 px-4 py-3 text-sm leading-6 text-[var(--foreground-muted)]">
              {replay.paymentLabel}
            </p>
          </section>

          <section className="clay-card p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--clay-accent-strong)]">
                Checkpoints
              </p>
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                Ride timeline
              </h2>
            </div>

            <ol className="mt-5 grid gap-3">
              {replay.checkpoints.length > 0 ? (
                replay.checkpoints.map((checkpoint) => (
                  <li
                    className="rounded-[var(--clay-radius-sm)] border border-[var(--clay-border-subtle)] bg-white/50 px-4 py-3"
                    key={checkpoint.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{checkpoint.label}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--clay-accent-strong)]">
                        {formatMinutes(checkpoint.elapsedSec)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                      {checkpoint.description}
                    </p>
                  </li>
                ))
              ) : (
                <li className="clay-inset px-4 py-5 text-sm text-[var(--foreground-muted)]">
                  No checkpoints were persisted for this ride.
                </li>
              )}
            </ol>
          </section>
        </aside>
      </section>
    </section>
  );
}
