"use client";

import { useActionState } from "react";

import { signInAction } from "./actions";
import { initialLoginFormState, type LoginFormState } from "./login-form-state";

function LoginButton({ pending }: { readonly pending: boolean }) {
  return (
    <button
      className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
    <section className="w-full max-w-md rounded-[2rem] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(45,47,47,0.08)]">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--coral-dark)]">
          Glide Admin
        </p>
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
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none ring-0"
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
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none ring-0"
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
            className="rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground)]">
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
