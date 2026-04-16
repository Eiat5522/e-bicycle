import Image from "next/image";
import Link from "next/link";

import { getAuthContext } from "@/lib/auth";

const tabs = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "See fleet health, booking activity, and key operational metrics at a glance.",
    imageSrc: "/home/dashboard-illustration.svg",
    imageAlt: "Illustration of analytics panels representing the dashboard"
  },
  {
    href: "/users",
    label: "Users",
    description: "Manage riders, update profiles, and keep account details in sync.",
    imageSrc: "/home/users-illustration.svg",
    imageAlt: "Illustration of user avatars representing rider management"
  },
  {
    href: "/bicycles",
    label: "Bicycles",
    description: "Track availability, inspect statuses, and maintain your e-bike inventory.",
    imageSrc: "/home/bicycles-illustration.svg",
    imageAlt: "Illustration of bicycles representing fleet management"
  }
];

export default async function HomePage() {
  const context = await getAuthContext();
  const isAdmin = Boolean(context?.profile?.isAdmin);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-10 md:px-10 md:pt-16">
      <section className="clay-card-raised relative overflow-hidden px-7 py-9 md:px-12 md:py-12">
        <div className="absolute -right-18 -top-24 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute -bottom-24 left-8 h-64 w-64 rounded-full bg-rose-300/20 blur-3xl" />

        <div className="relative z-10 flex max-w-3xl flex-col gap-6">
          <span className="clay-badge inline-flex w-fit px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
            Glide Admin
          </span>

          <h1 className="text-balance text-4xl leading-tight font-bold text-violet-950 md:text-5xl">
            Manage your e-bike operations from one calm, focused home base.
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-violet-900/80 md:text-lg">
            Use the sections below to jump directly into the tools you need most. From daily metrics to rider and fleet upkeep, everything is one click away.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link className="clay-button clay-button-primary px-6 py-3 text-sm font-semibold" href={isAdmin ? "/dashboard" : "/login"}>
              {isAdmin ? "Go to dashboard" : "Sign in"}
            </Link>
            <Link className="clay-button px-6 py-3 text-sm font-semibold text-violet-900" href="/bicycles">
              Browse bicycles
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Quick links" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tabs.map((tab) => (
          <Link className="clay-card group flex h-full flex-col overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-1" href={tab.href} key={tab.href}>
            <div className="clay-inset relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl border border-white/55 p-3">
              <Image alt={tab.imageAlt} className="h-full w-full object-cover" fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 44vw, 100vw" src={tab.imageSrc} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-violet-950">{tab.label}</h2>
              <p className="text-sm leading-relaxed text-violet-900/80">{tab.description}</p>
            </div>

            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-800 transition-transform duration-200 group-hover:translate-x-1">
              Open {tab.label}
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
