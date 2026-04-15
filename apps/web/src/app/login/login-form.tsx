"use client";

import { useActionState } from "react";

import { GlideBrand } from "@/components/glide-brand";

import { signInAction } from "./actions";
import { initialLoginFormState, type LoginFormState } from "./login-form-state";

function LoginButton({ pending }: { readonly pending: boolean }) {
  return (
    <button
      className="clay-button clay-button-primary px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit">
      {pending ? "Checking access..." : "Log in"}
    </button>
  );
}

export function LoginFormCard({
  formAction,
  pending,
  state
}: {
  readonly formAction: (payload: FormData) => void;
  readonly pending: boolean;
  readonly state: LoginFormState;
}) {
  return (
    <section className="clay-card-raised w-full max-w-md p-8">
      <div className="flex flex-col gap-3">
        <GlideBrand variant="login" />
        <h1 className="text-4xl font-black tracking-[-0.05em] text-[var(--foreground)]">
          Admin sign in
        </h1>
        <p className="text-sm leading-6 text-[var(--foreground-muted)]">
          This panel only accepts accounts with admin rights in Supabase.
        </p>
      </div>

      <form action={formAction} className="mt-8 flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
          <span>Email</span>
          <input
            autoComplete="email"
            className="clay-inset px-4 py-3 outline-none ring-0"
            defaultValue={state.values.email}
            name="email"
            placeholder="admin@rideglide.app"
            type="email"
          />
          {state.errors.email ? (
            <span className="text-xs font-medium text-[var(--danger)]">{state.errors.email}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
          <span>Password</span>
          <input
            autoComplete="current-password"
            className="clay-inset px-4 py-3 outline-none ring-0"
            defaultValue={state.values.password}
            name="password"
            placeholder="Enter your password"
            type="password"
          />
          {state.errors.password ? (
            <span className="text-xs font-medium text-[var(--danger)]">{state.errors.password}</span>
          ) : null}
        </label>

        {state.message ? (
          <p
            aria-live="polite"
            className="clay-inset px-4 py-3 text-sm text-[var(--foreground)]">
            {state.message}
          </p>
        ) : null}

        <LoginButton pending={pending} />
      </form>
    </section>
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialLoginFormState);

  return <LoginFormCard formAction={formAction} pending={pending} state={state} />;
}
