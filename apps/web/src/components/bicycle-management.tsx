"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes
} from "react";
import { useEffect, useRef, useState } from "react";

import Image from "next/image";
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
  available: "bg-[var(--clay-success-soft)] text-[var(--clay-success)]",
  reserved: "bg-[var(--clay-warning-soft)] text-[var(--clay-warning)]",
  in_use: "bg-[var(--clay-accent-soft)] text-[var(--clay-accent)]",
  maintenance: "bg-[var(--clay-danger-soft)] text-[var(--clay-danger)]"
};

function formatDistance(distanceKm: number) {
  return `${distanceKm.toFixed(1)} km`;
}

function formatDuration(durationSec: number) {
  return `${Math.round(durationSec / 60)} min`;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
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

      <div className="grid gap-4">
        {bikes.map((bike) => (
          <article
            className="clay-card grid gap-5 p-6 md:grid-cols-[180px_minmax(0,1fr)_auto]"
            key={bike.id}>
            <div className="clay-inset relative min-h-44 overflow-hidden rounded-[1.5rem]">
              {bike.imageUrl ? (
                <Image
                  alt={bike.model}
                  fill
                  className="object-cover"
                  src={bike.imageUrl}
                  sizes="(max-width: 768px) 100vw, 180px"
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
    setShowSubmitMessage(false);
    setSubmitState(initialBicycleEditorFormState);
  }

  function handleStartEditing() {
    setShowSubmitMessage(false);
    setSubmitState(initialBicycleEditorFormState);
    setIsEditing(true);
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
            <div className="clay-inset relative min-h-52 overflow-hidden rounded-[1.75rem]">
              {bike.imageUrl ? (
                <Image
                  alt={bike.model}
                  fill
                  className="object-cover"
                  src={bike.imageUrl}
                  sizes="(max-width: 768px) 100vw, 220px"
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
          <form action={deleteAction} className="mt-6 flex justify-end">
            <input name="bikeId" type="hidden" value={bike.id} />
            <button
              className="clay-button inline-flex border-[var(--clay-danger-soft)] bg-[var(--clay-danger-soft)] px-5 py-3 text-sm font-semibold text-[var(--clay-danger)]"
              disabled={isPending}
              type="submit">
              Delete Bicycle
            </button>
          </form>
        ) : null}
      </div>

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
              rideHistory.map((ride) => (
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
