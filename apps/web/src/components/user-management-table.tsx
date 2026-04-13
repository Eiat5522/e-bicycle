"use client";

import { useMemo, useState } from "react";

import type { RideHistoryItem } from "@glide/shared";
import { formatAdminDate } from "@/lib/formatting";

export interface ManagedUser {
  readonly id: string;
  readonly firstName: string;
  readonly isAdmin: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly rideHistory: readonly RideHistoryItem[];
  readonly transactions: readonly UserTransaction[];
}

export interface UserTransaction {
  readonly id: string;
  readonly type: "ride" | "top_up" | "reward";
  readonly title: string;
  readonly subtitle: string;
  readonly amount: number;
  readonly timestamp: string;
}

function formatTransactionAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
    signDisplay: "always",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDistance(distanceKm: number) {
  return `${distanceKm.toFixed(1)} km`;
}

function formatRideDuration(durationSec: number) {
  const minutes = Math.round(durationSec / 60);

  return `${minutes} min`;
}

export function UserDetailDrawerContent({
  activeTab,
  onClose,
  onSelectTab,
  onUpdateUser,
  user
}: {
  readonly activeTab: "transactions" | "rides";
  readonly onClose: () => void;
  readonly onSelectTab: (tab: "transactions" | "rides") => void;
  readonly onUpdateUser: (formData: FormData) => void | Promise<void>;
  readonly user: ManagedUser;
}) {
  return (
    <div
      aria-label={`User details for ${user.firstName}`}
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]"
      role="dialog">
      <button
        aria-label="Close user details"
        className="flex-1"
        onClick={onClose}
        type="button"
      />

      <aside className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-[var(--surface)] shadow-[-20px_0_60px_rgba(45,47,47,0.16)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 px-6 py-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--coral-dark)]">
              User Detail
            </p>
            <h3 className="text-3xl font-black tracking-[-0.04em] text-[var(--foreground)]">
              {user.firstName}
            </h3>
            <p className="text-sm text-[var(--foreground-muted)]">
              {user.isAdmin ? "Admin account" : "Standard account"} · {user.id}
            </p>
          </div>

          <button
            className="rounded-full border border-black/10 bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
            onClick={onClose}
            type="button">
            Close
          </button>
        </div>

        <div className="border-b border-black/5 px-6 py-5">
          <form action={onUpdateUser} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <input name="userId" type="hidden" value={user.id} />
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              <span>Display name</span>
              <input
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
                defaultValue={user.firstName}
                name="firstName"
                required
                type="text"
              />
            </label>
            <div className="flex items-end gap-3">
              <label className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)]">
                <input defaultChecked={user.isAdmin} name="isAdmin" type="checkbox" />
                <span>Admin access</span>
              </label>
              <button
                className="rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white"
                type="submit">
                Save
              </button>
            </div>
          </form>
        </div>

        <div className="border-b border-black/5 px-6 pt-5">
          <div className="flex gap-3">
            <button
              aria-pressed={activeTab === "transactions"}
              className={[
                "rounded-t-2xl px-4 py-3 text-sm font-semibold",
                activeTab === "transactions"
                  ? "bg-[var(--foreground)] text-white"
                  : "bg-[var(--surface-muted)] text-[var(--foreground)]"
              ].join(" ")}
              onClick={() => onSelectTab("transactions")}
              type="button">
              Transaction History
            </button>
            <button
              aria-pressed={activeTab === "rides"}
              className={[
                "rounded-t-2xl px-4 py-3 text-sm font-semibold",
                activeTab === "rides"
                  ? "bg-[var(--foreground)] text-white"
                  : "bg-[var(--surface-muted)] text-[var(--foreground)]"
              ].join(" ")}
              onClick={() => onSelectTab("rides")}
              type="button">
              Ride History
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-6 py-6">
          {activeTab === "transactions" ? (
            <>
              <div className="flex flex-col gap-2">
                <h4 className="text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
                  Transaction History
                </h4>
                <p className="text-sm leading-6 text-[var(--foreground-muted)]">
                  Real wallet transactions from Supabase for this user.
                </p>
              </div>

              {user.transactions.length === 0 ? (
                <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-6 text-sm text-[var(--foreground-muted)]">
                  No transaction history is available for this account yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {user.transactions.map((transaction) => (
                    <article
                      className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-4"
                      key={transaction.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--coral-dark)]">
                            {transaction.type}
                          </p>
                          <h5 className="text-base font-semibold text-[var(--foreground)]">
                            {transaction.title}
                          </h5>
                          <p className="text-sm text-[var(--foreground-muted)]">{transaction.subtitle}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold text-[var(--foreground)]">
                            {formatTransactionAmount(transaction.amount)}
                          </p>
                          <p className="text-sm text-[var(--foreground-muted)]">
                            {formatAdminDate(transaction.timestamp)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h4 className="text-xl font-black tracking-[-0.03em] text-[var(--foreground)]">
                  Ride History
                </h4>
                <p className="text-sm leading-6 text-[var(--foreground-muted)]">
                  Sample ride history wired from shared mock data until the admin panel has a real
                  rides backend.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-[var(--surface-muted)] px-5 py-4 text-sm text-[var(--foreground-muted)]">
                Sample data
              </div>

              {user.rideHistory.length === 0 ? (
                <div className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-6 text-sm text-[var(--foreground-muted)]">
                  No sample rides are assigned to this account yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {user.rideHistory.map((ride) => (
                    <article className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-4" key={ride.id}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--coral-dark)]">
                              {ride.bikeModel}
                            </p>
                            <h5 className="text-base font-semibold text-[var(--foreground)]">
                              {ride.routeLabel}
                            </h5>
                            <p className="text-sm text-[var(--foreground-muted)]">
                              {ride.startLocation} to {ride.endLocation}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-semibold text-[var(--foreground)]">
                              {formatTransactionAmount(-ride.totalCost)}
                            </p>
                            <p className="text-sm text-[var(--foreground-muted)]">
                              {formatAdminDate(ride.completedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-[var(--foreground-muted)]">
                          <span>{formatRideDuration(ride.durationSec)}</span>
                          <span>•</span>
                          <span>{formatDistance(ride.distanceKm)}</span>
                          <span>•</span>
                          <span>{ride.paymentLabel}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function UserDetailDrawer({
  onClose,
  onUpdateUser,
  user
}: {
  readonly onClose: () => void;
  readonly onUpdateUser: (formData: FormData) => void | Promise<void>;
  readonly user: ManagedUser;
}) {
  const [activeTab, setActiveTab] = useState<"transactions" | "rides">("transactions");

  return (
    <UserDetailDrawerContent
      activeTab={activeTab}
      onClose={onClose}
      onSelectTab={setActiveTab}
      onUpdateUser={onUpdateUser}
      user={user}
    />
  );
}

export function UserManagementTable({
  onUpdateUser,
  users
}: {
  readonly onUpdateUser: (formData: FormData) => void | Promise<void>;
  readonly users: ManagedUser[];
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  return (
    <>
      <section className="rounded-[2rem] bg-[var(--surface)] p-6 shadow-[0_16px_40px_rgba(45,47,47,0.06)]">
        <div className="flex flex-col gap-2 border-b border-black/5 pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--coral-dark)]">
            User Management
          </p>
          <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
            Select a user to inspect wallet and ride history.
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">
            User edits now live in the detail drawer so the main list stays focused on scanning and
            selection.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--foreground-muted)]">
                <th className="px-3 pb-2">User</th>
                <th className="px-3 pb-2">Admin</th>
                <th className="px-3 pb-2">Transactions</th>
                <th className="px-3 pb-2">Rides</th>
                <th className="px-3 pb-2">Updated</th>
                <th className="px-3 pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className="rounded-3xl bg-[var(--surface-muted)]" key={user.id}>
                  <td className="rounded-l-3xl px-3 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{user.firstName}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{user.id}</p>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm font-semibold text-[var(--foreground)]">
                    {user.isAdmin ? "Admin" : "Standard"}
                  </td>
                  <td className="px-3 py-4 text-sm text-[var(--foreground-muted)]">
                    {user.transactions.length}
                  </td>
                  <td className="px-3 py-4 text-sm text-[var(--foreground-muted)]">
                    {user.rideHistory.length}
                  </td>
                  <td className="px-3 py-4 text-sm text-[var(--foreground-muted)]">
                    {formatAdminDate(user.updatedAt)}
                  </td>
                  <td className="rounded-r-3xl px-3 py-4">
                    <button
                      className="rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white"
                      onClick={() => setSelectedUserId(user.id)}
                      type="button">
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedUser ? (
        <UserDetailDrawer
          onClose={() => setSelectedUserId(null)}
          onUpdateUser={onUpdateUser}
          user={selectedUser}
        />
      ) : null}
    </>
  );
}
