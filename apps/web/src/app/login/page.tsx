import { redirect } from "next/navigation";

import { LoginHeroScene } from "./login-hero-scene";
import { LoginForm } from "./login-form";
import { getAuthContext } from "@/lib/auth";

export default async function LoginPage() {
  const context = await getAuthContext();

  if (context?.profile?.isAdmin) {
    redirect("/");
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center overflow-hidden px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(135,102,226,0.22),transparent_64%)]" />
      <div className="pointer-events-none absolute -left-14 bottom-8 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(255,157,136,0.38),transparent_72%)] blur-xl" />
      <section className="relative z-10 grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.82fr)] xl:gap-10">
        <div className="flex flex-col gap-5">
          <span className="clay-badge w-fit px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--clay-accent-strong)]">
            Glide Operations
          </span>

          <div className="max-w-2xl">
            <h1 className="text-balance text-4xl font-black tracking-[-0.06em] text-[var(--clay-text-primary)] md:text-6xl">
              Command your e-bike fleet with motion-first clarity.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-[var(--clay-text-secondary)] md:text-lg">
              A cinematic, real-time surface for dispatch, inventory, and uptime insights.
              Sign in to open the operator dashboard.
            </p>
          </div>

          <LoginHeroScene />

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Live telemetry", "Visual health signals across active bikes"],
              ["Route orchestration", "Coordinate moves in dense city zones"],
              ["Admin controls", "Guarded access with role-based authorization"]
            ].map(([label, detail]) => (
              <div className="clay-inset p-4" key={label}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--clay-text-tertiary)]">
                  {label}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--clay-text-primary)]">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
