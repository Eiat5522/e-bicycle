import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes
} from "react";

import Link from "next/link";

import { formatAdminDate } from "@/lib/formatting";

export interface ManagedBike {
  readonly id: string;
  readonly model: string;
  readonly rideClass: string | null;
  readonly estimatedRangeKm: number;
  readonly topSpeedKmh: number;
  readonly pricingLabel: string;
  readonly status: "available" | "reserved" | "in_use" | "maintenance";
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
  readonly co2SavedKg: number;
  readonly startLocation: string;
  readonly endLocation: string;
  readonly routeLabel: string;
  readonly paymentLabel: string;
}

const statusClasses: Record<ManagedBike["status"], string> = {
  available: "bg-emerald-100 text-emerald-800",
  reserved: "bg-amber-100 text-amber-800",
  in_use: "bg-sky-100 text-sky-800",
  maintenance: "bg-rose-100 text-rose-800"
};

function formatDistance(distanceKm: number) {
  return `${distanceKm.toFixed(1)} km`;
}

function formatDuration(durationSec: number) {
  return `${Math.round(durationSec / 60)} min`;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function BikeStatusBadge({ status }: { readonly status: ManagedBike["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses[status]}`}>
      {status.replace("_", " ")}
    </span>
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
      <div className="flex flex-col gap-4 rounded-[2rem] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(45,47,47,0.08)] md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-3xl flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--coral-dark)]">
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
          className="inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
          href="/bicycles/new">
          Add Bicycle
        </Link>
      </div>

      <div className="grid gap-4">
        {bikes.map((bike) => (
          <article
            className="grid gap-5 rounded-[2rem] bg-[var(--surface)] p-6 shadow-[0_16px_40px_rgba(45,47,47,0.06)] md:grid-cols-[180px_minmax(0,1fr)_auto]"
            key={bike.id}>
            <div className="overflow-hidden rounded-[1.5rem] bg-[var(--surface-muted)]">
              {bike.imageUrl ? (
                <img
                  alt={bike.model}
                  className="h-full min-h-44 w-full object-cover"
                  src={bike.imageUrl}
                />
              ) : (
                <div className="flex h-full min-h-44 items-center justify-center px-6 text-center text-sm text-[var(--foreground-muted)]">
                  No image uploaded
                </div>
              )}
            </div>

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
                </div>
              </div>

              <div className="grid gap-3 text-sm text-[var(--foreground-muted)] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{bike.pricingLabel}</p>
                  <p>Pricing</p>
                </div>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{bike.estimatedRangeKm} km</p>
                  <p>Estimated range</p>
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
                className="inline-flex rounded-full border border-black/10 bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
                href={`/bicycles/${bike.id}`}>
                Edit Bicycle
              </Link>
            </div>
          </article>
        ))}
      </div>
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
  return (
    <input
      {...props}
      className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
    />
  );
}

function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
    />
  );
}

export function BicycleEditor({
  action,
  bike,
  mode,
  rideHistory
}: {
  readonly action: (formData: FormData) => void | Promise<void>;
  readonly bike: ManagedBike;
  readonly mode: "create" | "edit";
  readonly rideHistory: readonly BikeRideHistoryEntry[];
}) {
  const isCreate = mode === "create";

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
      <div className="rounded-[2rem] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(45,47,47,0.08)]">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--coral-dark)]">
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

        <form action={action} className="mt-8 grid gap-5" encType="multipart/form-data">
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
              <TextInput defaultValue={bike.model} name="model" required type="text" />
            </Field>

            <Field label="Ride Class">
              <TextInput defaultValue={bike.rideClass ?? ""} name="rideClass" type="text" />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Pricing Label">
              <TextInput
                defaultValue={bike.pricingLabel}
                name="pricingLabel"
                required
                type="text"
              />
            </Field>

            <Field label="Status">
              <SelectInput defaultValue={bike.status} name="status">
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
              </SelectInput>
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Estimated Range (km)">
              <TextInput
                defaultValue={bike.estimatedRangeKm}
                min={1}
                name="estimatedRangeKm"
                required
                step="0.1"
                type="number"
              />
            </Field>

            <Field label="Top Speed (km/h)">
              <TextInput
                defaultValue={bike.topSpeedKmh}
                min={1}
                name="topSpeedKmh"
                required
                step="1"
                type="number"
              />
            </Field>
          </div>

          <Field label="Location">
            <TextInput defaultValue={bike.location} name="location" required type="text" />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Latitude">
              <TextInput
                defaultValue={bike.latitude}
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
            <div className="overflow-hidden rounded-[1.75rem] bg-[var(--surface-muted)]">
              {bike.imageUrl ? (
                <img
                  alt={bike.model}
                  className="h-full min-h-52 w-full object-cover"
                  src={bike.imageUrl}
                />
              ) : (
                <div className="flex h-full min-h-52 items-center justify-center px-6 text-center text-sm text-[var(--foreground-muted)]">
                  No image uploaded
                </div>
              )}
            </div>

            <Field label="Upload Bicycle Image">
              <input
                accept="image/png,image/jpeg,image/webp"
                className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-3 text-sm"
                name="image"
                type="file"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
              type="submit">
              {isCreate ? "Create Bicycle" : "Save Changes"}
            </button>
            <Link
              className="inline-flex rounded-full border border-black/10 bg-[var(--surface-muted)] px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
              href="/bicycles">
              Back to Fleet
            </Link>
          </div>
        </form>
      </div>

      <aside className="flex flex-col gap-6">
        <section className="rounded-[2rem] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(45,47,47,0.08)]">
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
              <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-6 text-sm text-[var(--foreground-muted)]">
                No rides have been recorded for this bicycle yet.
              </div>
            ) : (
              rideHistory.map((ride) => (
                <article
                  className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-4"
                  key={ride.id}>
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
                          {formatMoney(ride.totalCost)}
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
                      <span>{ride.co2SavedKg.toFixed(1)} kg CO2 saved</span>
                    </div>

                    <p className="text-sm text-[var(--foreground-muted)]">{ride.paymentLabel}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </aside>
    </section>
  );
}
