"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type { RideHistoryItem } from "@glide/shared";
import {
  initialUserCreateFormState,
  type UserCreateFormState
} from "@/app/(admin)/user-create-form-state";
import {
  initialUserUpdateFormState,
  type UserUpdateFormState
} from "@/app/(admin)/user-update-form-state";
import { formatAdminDate } from "@/lib/formatting";
import { StatusToast } from "@/components/status-toast";

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
  return new Intl.NumberFormat("th-TH", {
    currency: "THB",
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

function ClaymorphicInset({
  children,
  className = ""
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={`clay-inset px-5 py-4 ${className}`}>{children}</div>
  );
}

interface UserEditorControls {
  readonly firstNameRef?: RefObject<HTMLInputElement | null>;
  readonly hasChanges?: boolean;
  readonly isAdminRef?: RefObject<HTMLInputElement | null>;
  readonly isEditing?: boolean;
  readonly isPending?: boolean;
  readonly submitMessage?: string | null;
  readonly onCancelEditing?: () => void;
  readonly onCheckForChanges?: () => void;
  readonly onStartEditing?: () => void;
}

export function UserDetailDrawerContent({
  activeTab,
  editorControls,
  onClose,
  onSelectTab,
  onUpdateUser,
  user
}: {
  readonly activeTab: "transactions" | "rides";
  readonly editorControls?: UserEditorControls;
  readonly onClose: () => void;
  readonly onSelectTab: (tab: "transactions" | "rides") => void;
  readonly onUpdateUser: (payload: FormData) => void;
  readonly user: ManagedUser;
}) {
  const isEditing = editorControls?.isEditing ?? false;
  const hasChanges = editorControls?.hasChanges ?? false;
  const isPending = editorControls?.isPending ?? false;
  const submitMessage = editorControls?.submitMessage ?? null;
  const firstNameRef = editorControls?.firstNameRef;
  const isAdminRef = editorControls?.isAdminRef;
  const onCheckForChanges = editorControls?.onCheckForChanges;
  const onStartEditing = editorControls?.onStartEditing;
  const onCancelEditing = editorControls?.onCancelEditing;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isEditing && onCancelEditing) {
          onCancelEditing();
        } else {
          onClose();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, onCancelEditing, onClose]);

  return (
    <div
      aria-label={`User details for ${user.firstName}`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]"
      role="dialog">
      <button
        aria-label="Close user details"
        className="flex-1"
        onClick={onClose}
        type="button"
      />

      <aside className="flex h-full w-full max-w-2xl flex-col overflow-y-auto clay-card-raised">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--clay-border-subtle)] px-6 py-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--clay-accent)]">
              User Detail
            </p>
            <h3 className="text-3xl font-black tracking-[-0.04em] text-[var(--clay-text-primary)]">
              {user.firstName}
            </h3>
            <p className="text-sm text-[var(--clay-text-secondary)]">
              {user.isAdmin ? "Admin account" : "Standard account"} · {user.id}
            </p>
          </div>

          <button
            className="clay-badge px-4 py-2 text-sm font-semibold text-[var(--clay-text-primary)]"
            onClick={onClose}
            type="button">
            Close
          </button>
        </div>

        <div className="border-b border-[var(--clay-border-subtle)] px-6 py-5">
          <form action={onUpdateUser} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <input name="userId" type="hidden" value={user.id} />
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--clay-text-primary)]">
              <span>Display name</span>
              <input
                className="clay-inset px-4 py-3 text-sm outline-none transition-colors disabled:opacity-50"
                defaultValue={user.firstName}
                disabled={!isEditing || isPending}
                name="firstName"
                onChange={onCheckForChanges}
                ref={firstNameRef}
                required
                type="text"
              />
            </label>
            <div className="flex items-end gap-3">
              <label className="inline-flex items-center gap-2 clay-inset px-4 py-3 text-sm font-medium text-[var(--clay-text-primary)] disabled:opacity-50">
                <input
                  defaultChecked={user.isAdmin}
                  disabled={!isEditing || isPending}
                  name="isAdmin"
                  onChange={onCheckForChanges}
                  ref={isAdminRef}
                  type="checkbox"
                />
                <span>Admin access</span>
              </label>
              {!isEditing ? (
                <button
                  className="clay-button clay-button-primary px-4 py-3 text-sm font-semibold"
                  onClick={onStartEditing}
                  type="button">
                  Edit
                </button>
              ) : (
                <>
                  <button
                    className="clay-button px-4 py-3 text-sm font-semibold text-[var(--clay-text-primary)]"
                    disabled={isPending}
                    onClick={onCancelEditing}
                    type="button">
                    Cancel
                  </button>
                  <button
                    className="clay-button clay-button-primary px-4 py-3 text-sm font-semibold disabled:opacity-50"
                    disabled={!hasChanges || isPending}
                    type="submit">
                    {isPending ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
            {submitMessage ? (
              <p
                aria-live="polite"
                className="md:col-span-2 clay-inset px-4 py-3 text-sm text-[var(--clay-text-primary)]">
                {submitMessage}
              </p>
            ) : null}
          </form>
        </div>

        <div className="border-b border-[var(--clay-border-subtle)] px-6 pt-5">
          <div className="flex gap-3">
            <button
              aria-pressed={activeTab === "transactions"}
              className={[
                "rounded-t-[var(--clay-radius-md)] px-4 py-3 text-sm font-semibold",
                activeTab === "transactions"
                  ? "clay-button clay-button-primary"
                  : "clay-inset text-[var(--clay-text-secondary)]"
              ].join(" ")}
              onClick={() => onSelectTab("transactions")}
              type="button">
              Transaction History
            </button>
            <button
              aria-pressed={activeTab === "rides"}
              className={[
                "rounded-t-[var(--clay-radius-md)] px-4 py-3 text-sm font-semibold",
                activeTab === "rides"
                  ? "clay-button clay-button-primary"
                  : "clay-inset text-[var(--clay-text-secondary)]"
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
                <h4 className="text-xl font-black tracking-[-0.03em] text-[var(--clay-text-primary)]">
                  Transaction History
                </h4>
                <p className="text-sm leading-6 text-[var(--clay-text-secondary)]">
                  Real wallet transactions from Supabase for this user.
                </p>
              </div>

              {user.transactions.length === 0 ? (
                <ClaymorphicInset className="text-sm text-[var(--clay-text-secondary)]">
                  No transaction history is available for this account yet.
                </ClaymorphicInset>
              ) : (
                <div className="grid gap-3">
                  {user.transactions.map((transaction) => (
                    <ClaymorphicInset key={transaction.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--clay-accent)]">
                            {transaction.type}
                          </p>
                          <h5 className="text-base font-semibold text-[var(--clay-text-primary)]">
                            {transaction.title}
                          </h5>
                          <p className="text-sm text-[var(--clay-text-secondary)]">{transaction.subtitle}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold text-[var(--clay-text-primary)]">
                            {formatTransactionAmount(transaction.amount)}
                          </p>
                          <p className="text-sm text-[var(--clay-text-secondary)]">
                            {formatAdminDate(transaction.timestamp)}
                          </p>
                        </div>
                      </div>
                    </ClaymorphicInset>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h4 className="text-xl font-black tracking-[-0.03em] text-[var(--clay-text-primary)]">
                  Ride History
                </h4>
                <p className="text-sm leading-6 text-[var(--clay-text-secondary)]">
                  Sample ride history wired from shared mock data until the admin panel has a real
                  rides backend.
                </p>
              </div>

              <ClaymorphicInset className="text-sm text-[var(--clay-text-secondary)]">
                Sample data
              </ClaymorphicInset>

              {user.rideHistory.length === 0 ? (
                <ClaymorphicInset className="text-sm text-[var(--clay-text-secondary)]">
                  No sample rides are assigned to this account yet.
                </ClaymorphicInset>
              ) : (
                <div className="grid gap-3">
                  {user.rideHistory.map((ride) => (
                    <ClaymorphicInset key={ride.id}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--clay-accent)]">
                              {ride.bikeModel}
                            </p>
                            <h5 className="text-base font-semibold text-[var(--clay-text-primary)]">
                              {ride.routeLabel}
                            </h5>
                            <p className="text-sm text-[var(--clay-text-secondary)]">
                              {ride.startLocation} to {ride.endLocation}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-semibold text-[var(--clay-text-primary)]">
                              {formatTransactionAmount(-ride.totalCost)}
                            </p>
                            <p className="text-sm text-[var(--clay-text-secondary)]">
                              {formatAdminDate(ride.completedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-[var(--clay-text-secondary)]">
                          <span>{formatRideDuration(ride.durationSec)}</span>
                          <span>•</span>
                          <span>{formatDistance(ride.distanceKm)}</span>
                          <span>•</span>
                          <span>{ride.paymentLabel}</span>
                        </div>
                      </div>
                    </ClaymorphicInset>
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
  readonly onUpdateUser: (
    previousState: UserUpdateFormState,
    formData: FormData
  ) => Promise<UserUpdateFormState>;
  readonly user: ManagedUser;
}) {
  const [activeTab, setActiveTab] = useState<"transactions" | "rides">("transactions");
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const isAdminRef = useRef<HTMLInputElement>(null);
  const [submitState, submitAction, isPending] = useActionState(
    async (previousState: UserUpdateFormState, formData: FormData) => {
      const nextState = await onUpdateUser(previousState, formData);

      if (nextState.status === "success") {
        setIsEditing(false);
        setHasChanges(false);
        setToastMessage("User saved successfully.");
      }

      return nextState;
    },
    initialUserUpdateFormState
  );

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  function checkForChanges() {
    const currentFirstName = firstNameRef.current?.value ?? user.firstName;
    const currentIsAdmin = isAdminRef.current?.checked ?? user.isAdmin;
    setHasChanges(currentFirstName !== user.firstName || currentIsAdmin !== user.isAdmin);
  }

  return (
    <>
      {toastMessage ? <StatusToast message={toastMessage} /> : null}
      <UserDetailDrawerContent
        activeTab={activeTab}
        editorControls={{
          firstNameRef,
          hasChanges,
          isAdminRef,
          isEditing,
          isPending,
          submitMessage: submitState.status === "error" ? submitState.message : null,
          onCancelEditing: () => {
            if (firstNameRef.current) {
              firstNameRef.current.value = user.firstName;
            }
            if (isAdminRef.current) {
              isAdminRef.current.checked = user.isAdmin;
            }
            setIsEditing(false);
            setHasChanges(false);
          },
          onCheckForChanges: checkForChanges,
          onStartEditing: () => setIsEditing(true),
        }}
        onClose={onClose}
        onSelectTab={setActiveTab}
        onUpdateUser={submitAction}
        user={user}
      />
    </>
  );
}

function CreateUserDrawer({
  onClose,
  onCreateUser
}: {
  readonly onClose: () => void;
  readonly onCreateUser: (
    previousState: UserCreateFormState,
    formData: FormData
  ) => Promise<UserCreateFormState>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const isAdminRef = useRef<HTMLInputElement>(null);
  const [isReadyToCreate, setIsReadyToCreate] = useState(false);
  const [submitState, submitAction, isPending] = useActionState(onCreateUser, initialUserCreateFormState);

  useEffect(() => {
    if (submitState.status === "success") {
      formRef.current?.reset();
      onClose();
    }
  }, [onClose, submitState.status]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function checkCreateFormReadiness() {
    const email = emailRef.current?.value.trim() ?? "";
    const firstName = firstNameRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";

    setIsReadyToCreate(Boolean(email && firstName && password));
  }

  return (
    <div
      aria-label="Create user"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]"
      role="dialog">
      <button
        aria-label="Close create user drawer"
        className="flex-1"
        onClick={onClose}
        type="button"
      />

      <aside className="flex h-full w-full max-w-2xl flex-col overflow-y-auto clay-card-raised">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--clay-border-subtle)] px-6 py-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--clay-accent)]">
              New User
            </p>
            <h3 className="text-3xl font-black tracking-[-0.04em] text-[var(--clay-text-primary)]">
              Create account
            </h3>
            <p className="text-sm text-[var(--clay-text-secondary)]">
              Create a Supabase auth user and matching rider profile from the same panel used for
              user details.
            </p>
          </div>

          <button
            className="clay-badge px-4 py-2 text-sm font-semibold text-[var(--clay-text-primary)]"
            onClick={onClose}
            type="button">
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div className="flex flex-col gap-2">
            <h4 className="text-xl font-black tracking-[-0.03em] text-[var(--clay-text-primary)]">
              Account setup
            </h4>
            <p className="text-sm leading-6 text-[var(--clay-text-secondary)]">
              New accounts receive a profile and wallet automatically through the existing database
              trigger.
            </p>
          </div>

          <form action={submitAction} className="grid gap-4" ref={formRef}>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--clay-text-primary)]">
              <span>Email address</span>
              <input
                className="clay-inset px-4 py-3 text-sm outline-none transition-colors disabled:opacity-50"
                disabled={isPending}
                name="email"
                onChange={checkCreateFormReadiness}
                placeholder="rider@rideglide.app"
                ref={emailRef}
                required
                type="email"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--clay-text-primary)]">
              <span>First name</span>
              <input
                className="clay-inset px-4 py-3 text-sm outline-none transition-colors disabled:opacity-50"
                disabled={isPending}
                name="firstName"
                onChange={checkCreateFormReadiness}
                placeholder="Rider name"
                ref={firstNameRef}
                required
                type="text"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--clay-text-primary)]">
              <span>Temporary password</span>
              <input
                className="clay-inset px-4 py-3 text-sm outline-none transition-colors disabled:opacity-50"
                disabled={isPending}
                minLength={8}
                name="password"
                onChange={checkCreateFormReadiness}
                placeholder="At least 8 characters"
                ref={passwordRef}
                required
                type="password"
              />
            </label>
            <label className="inline-flex items-center gap-2 clay-inset px-4 py-3 text-sm font-medium text-[var(--clay-text-primary)]">
              <input disabled={isPending} name="isAdmin" ref={isAdminRef} type="checkbox" />
              <span>Admin access</span>
            </label>
            {submitState.message ? (
              <p
                aria-live="polite"
                className="clay-inset px-4 py-3 text-sm text-[var(--clay-text-primary)]">
                {submitState.message}
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                className="clay-button px-4 py-3 text-sm font-semibold text-[var(--clay-text-primary)]"
                disabled={isPending}
                onClick={onClose}
                type="button">
                Cancel
              </button>
              <button
                className="clay-button clay-button-primary px-4 py-3 text-sm font-semibold disabled:opacity-50"
                disabled={!isReadyToCreate || isPending}
                type="submit">
                {isPending ? "Creating..." : "Create user"}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}

export function UserManagementTable({
  onCreateUser,
  onUpdateUser,
  users
}: {
  readonly onCreateUser: (
    previousState: UserCreateFormState,
    formData: FormData
  ) => Promise<UserCreateFormState>;
  readonly onUpdateUser: (
    previousState: UserUpdateFormState,
    formData: FormData
  ) => Promise<UserUpdateFormState>;
  readonly users: ManagedUser[];
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  return (
    <>
      <section className="clay-card p-6">
        <div className="flex flex-col gap-2 border-b border-[var(--clay-border-subtle)] pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--clay-accent)]">
            User Management
          </p>
          <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--clay-text-primary)]">
            Select a user to inspect wallet and ride history.
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[var(--clay-text-secondary)]">
            User edits now live in the detail drawer so the main list stays focused on scanning and
            selection.
          </p>
          <div className="pt-2">
            <button
              className="clay-button clay-button-primary px-4 py-3 text-sm font-semibold"
              onClick={() => setIsCreatingUser(true)}
              type="button">
              Add user
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--clay-text-tertiary)]">
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
                <tr className="rounded-3xl clay-inset" key={user.id}>
                  <td className="rounded-l-3xl px-3 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-[var(--clay-text-primary)]">{user.firstName}</p>
                      <p className="text-xs text-[var(--clay-text-tertiary)]">{user.id}</p>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm font-semibold text-[var(--clay-text-primary)]">
                    {user.isAdmin ? "Admin" : "Standard"}
                  </td>
                  <td className="px-3 py-4 text-sm text-[var(--clay-text-secondary)]">
                    {user.transactions.length}
                  </td>
                  <td className="px-3 py-4 text-sm text-[var(--clay-text-secondary)]">
                    {user.rideHistory.length}
                  </td>
                  <td className="px-3 py-4 text-sm text-[var(--clay-text-secondary)]">
                    {formatAdminDate(user.updatedAt)}
                  </td>
                  <td className="rounded-r-3xl px-3 py-4">
                    <button
                      className="clay-button clay-button-primary px-4 py-3 text-sm font-semibold"
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

      {isCreatingUser ? (
        <CreateUserDrawer onClose={() => setIsCreatingUser(false)} onCreateUser={onCreateUser} />
      ) : null}
    </>
  );
}
