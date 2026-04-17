import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { getAuthContext } from "@/lib/auth";

export default async function LoginPage() {
  const context = await getAuthContext();

  if (context?.profile?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
      <section className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="hidden flex-col gap-5 lg:flex">
          <span className="clay-badge w-fit px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--clay-accent-strong)]">
            Clay Admin
          </span>
          <div className="clay-card-raised max-w-2xl p-8">
            <h1 className="text-5xl font-black tracking-[-0.06em] text-[var(--clay-text-primary)]">
              Soft surfaces, sharper operational focus.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--clay-text-secondary)]">
              The admin workspace now leans into a tactile clay system: layered cards, cushioned
              controls, and softer telemetry blocks that keep dense operational data readable.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ["Surface depth", "Raised cards and inset controls"],
                ["Signal color", "Lilac primary with coral support"],
                ["Typography", "Display-led hierarchy for dashboards"]
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
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
