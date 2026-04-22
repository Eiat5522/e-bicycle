import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

type EntryDelayStyle = CSSProperties & Record<`--${string}`, string>;

const navigationCards = [
  {
    href: "/dashboard",
    label: "Dashboard",
    eyebrow: "Live operations",
    description: "Track fleet health, ride activity, revenue movement, and support pressure.",
    stat: "Executive view",
    className: "md:col-span-2 xl:row-span-2"
  },
  {
    href: "/users",
    label: "Users",
    eyebrow: "Account controls",
    description: "Review rider profiles, wallet activity, and account health from one table.",
    stat: "Rider directory",
    className: ""
  },
  {
    href: "/bicycles",
    label: "Bicycles",
    eyebrow: "Fleet inventory",
    description: "Manage bike status, condition notes, range estimates, and service workflows.",
    stat: "Bike operations",
    className: ""
  }
] as const;

export const metadata: Metadata = {
  title: "Home | Glide Admin",
  description: "Quick navigation home for Glide admin operations."
};

function getEntryDelayStyle(index: number): EntryDelayStyle {
  return { "--entry-delay": `${80 + index * 70}ms` };
}

export default function HomePage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="clay-card-raised dashboard-entrance-item overflow-hidden p-6 sm:p-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.42fr)] lg:items-end">
          <div className="min-w-0">
            <span className="clay-badge inline-flex px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--clay-accent-strong)]">
              Glide admin home
            </span>
            <h1 className="mt-5 max-w-3xl text-3xl font-black text-[var(--foreground)] sm:text-4xl md:text-5xl">
              Choose an admin workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--foreground-muted)]">
              The home grid mirrors the navigation tabs so the main admin workflows stay one
              click away.
            </p>
          </div>

          <div className="clay-inset min-w-0 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--clay-text-tertiary)]">
              Navigation order
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground-muted)]">
              Home, Dashboard, Users, and Bicycles are aligned across the header and this grid.
            </p>
          </div>
        </div>
      </div>

      <section
        aria-label="Admin workspace shortcuts"
        className="grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-3">
        {navigationCards.map((card, index) => (
          <Link
            className={[
              "clay-card dashboard-entrance-item dashboard-interactive-card flex min-h-64 flex-col justify-between p-6 sm:p-7",
              card.className
            ].join(" ")}
            href={card.href}
            key={card.href}
            style={getEntryDelayStyle(index)}>
            <div>
              <span className="clay-badge inline-flex px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--clay-accent-strong)]">
                {card.eyebrow}
              </span>
              <h2 className="mt-5 text-2xl font-black text-[var(--foreground)] sm:text-3xl">
                {card.label}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--foreground-muted)]">
                {card.description}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--clay-border-subtle)] pt-5">
              <span className="font-mono text-sm font-semibold text-[var(--foreground)]">
                {card.stat}
              </span>
              <span
                aria-hidden="true"
                className="clay-button inline-flex h-11 w-11 items-center justify-center rounded-full text-lg font-black text-[var(--clay-accent-strong)]">
                {"->"}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </section>
  );
}
