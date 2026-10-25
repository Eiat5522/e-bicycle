import type { Metadata } from "next";

const launchStations = ["Lamphun Tourism Center", "Lamphun Railway Station", "Storage / operations center"];

const timeline = [
  {
    phase: "Foundation",
    target: "Jul-Aug 2026",
    focus: "Shared contracts, sync tables, staff tablet shell, station model"
  },
  {
    phase: "MVP Build",
    target: "Aug-Sep 2026",
    focus: "Rental start, return, payment references, inspections, incident capture"
  },
  {
    phase: "Launch Readiness",
    target: "Oct 2026",
    focus: "Station testing, staff training, reconciliation reports, backup workflow"
  },
  {
    phase: "Enhancement",
    target: "After MVP",
    focus: "GPS, smart locks, Green Passport, predictive operations, tourism rewards"
  }
];

const mvpFeatures = [
  {
    title: "Rider App",
    copy: "Register, consent, discover bikes, scan, ride, return, review history, manage payment reference, and get support."
  },
  {
    title: "Staff Tablet",
    copy: "Run offline station operations: start rental, return vehicle, inspect bikes, capture payments, record incidents, and sync later."
  },
  {
    title: "Admin Dashboard",
    copy: "Track fleet availability, rentals, payments, incidents, maintenance, users, reports, reconciliation, and audit history."
  },
  {
    title: "Backup Workflow",
    copy: "Use Google Forms, Sheets, and Drive as fallback records for rental, return, incident, payment evidence, photos, and daily closeout."
  }
];

const enhancements = [
  "GPS trip maps and geofencing",
  "Smart lock integration",
  "Real-time battery telemetry",
  "Green Passport and visitor rewards",
  "Predictive maintenance",
  "Demand forecasting and fleet rebalancing",
  "Carbon dashboards and government reports",
  "Dynamic pricing and partner packages"
];

const readinessTracks = [
  ["Backend/API", "Staff tablet sync, idempotent offline records, evidence upload, conflict handling"],
  ["Staff Tablet", "Offline rental start, return, inspection, payment reference, incident, queue"],
  ["Rider App", "Lamphun registration, payment, rental, return, bilingual support copy"],
  ["Admin Web", "Fleet, rentals, payments, incidents, maintenance, reports, reconciliation"],
  ["Operations", "Staff training, station SOP, backup workflow, daily closeout, acceptance tests"]
];

export const metadata: Metadata = {
  title: "Lamphun Smart Green Mobility",
  description: "Project site for the Lamphun public e-bike rental MVP."
};

export default function ProjectSitePage() {
  return (
    <main className="min-h-screen bg-[#f6f7f1] text-[#14211c]">
      <section className="relative overflow-hidden bg-[#143c32] text-white">
        <div className="absolute inset-0 opacity-[0.26]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Public bicycle rental station"
            className="h-full w-full object-cover"
            src="https://commons.wikimedia.org/wiki/Special:FilePath/Bicycle%20rental%20station%20in%20Singapore.jpg"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f2f28] via-[#12382f]/88 to-[#143c32]/54" />

        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl content-end gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
          <div className="pb-8">
            <a
              className="inline-flex items-center gap-3 border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold backdrop-blur"
              href="#readiness">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Glide mark" className="h-7 w-7" src="/glide-mark.png" />
              MVP launch target: October 31, 2026
            </a>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Lamphun Smart Green Mobility
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
              A public e-bike rental operating system for residents, visitors, station teams, and government
              stakeholders.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="bg-[#bfe660] px-5 py-3 text-sm font-bold text-[#13251d]" href="#mvp">
                View MVP scope
              </a>
              <a className="border border-white/24 px-5 py-3 text-sm font-bold text-white" href="#timeline">
                See timeline
              </a>
            </div>
          </div>

          <div className="mb-8 grid gap-3 self-end sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["100", "FreeDare e-bikes planned for MVP"],
              ["3", "launch operating locations"],
              ["4", "core surfaces: rider, staff, admin, backup"]
            ].map(([value, label]) => (
              <div className="border border-white/18 bg-white/12 p-5 backdrop-blur" key={label}>
                <p className="text-4xl font-semibold text-[#d8ff78]">{value}</p>
                <p className="mt-2 text-sm leading-6 text-white/76">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#d9ded2] bg-white" id="overview">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#3d765f]">Project overview</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#16241f]">
              Built for real station operations, not only app screens.
            </h2>
          </div>
          <div className="grid gap-6 text-base leading-8 text-[#4d5b55]">
            <p>
              The service must let riders register, rent, pay, ride, and return with confidence. It must also let station
              staff keep the service moving when the rider app, internet, or payment gateway fails.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {launchStations.map((station) => (
                <div className="border border-[#d9ded2] bg-[#f7f9f0] p-4" key={station}>
                  <p className="text-sm font-bold text-[#1d352d]">{station}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#eef3e4] px-5 py-16 sm:px-8 lg:px-10" id="timeline">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#3d765f]">Timeline and phasing</p>
              <h2 className="mt-4 text-4xl font-semibold text-[#16241f]">Reliable operating core first.</h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-[#53615b]">
              The MVP phase proves safe rentals, returns, evidence, payment reconciliation, and outage recovery before
              the platform expands into advanced mobility services.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {timeline.map((item, index) => (
              <article className="border border-[#d1dac8] bg-white p-5" key={item.phase}>
                <p className="text-sm font-bold text-[#5b6a2d]">0{index + 1}</p>
                <h3 className="mt-3 text-2xl font-semibold text-[#16241f]">{item.phase}</h3>
                <p className="mt-2 text-sm font-bold text-[#3d765f]">{item.target}</p>
                <p className="mt-5 text-sm leading-6 text-[#53615b]">{item.focus}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8f3] px-5 py-16 sm:px-8 lg:px-10" id="mvp">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#3d765f]">MVP phase features</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#16241f]">
                Four connected surfaces for launch.
              </h2>
              <ul className="mt-8 grid gap-3 text-sm font-semibold text-[#26362f]">
                {[
                  "No bike release without Rental ID.",
                  "No release without pre-use inspection.",
                  "Returned bikes stay pending inspection until cleared.",
                  "Failed inspection blocks rental.",
                  "Offline records sync later and remain auditable."
                ].map((rule) => (
                  <li className="border-l-4 border-[#8fb33f] bg-white px-4 py-3" key={rule}>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {mvpFeatures.map((feature) => (
                <article className="border border-[#d9ded2] bg-white p-5" key={feature.title}>
                  <h3 className="text-xl font-semibold text-[#16241f]">{feature.title}</h3>
                  <p className="mt-4 text-sm leading-6 text-[#53615b]">{feature.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid bg-[#173e35] text-white lg:grid-cols-2" id="enhancements">
        <div className="relative min-h-[460px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Wat Phra That Hariphunchai in Lamphun"
            className="h-full w-full object-cover"
            src="https://commons.wikimedia.org/wiki/Special:FilePath/Wat%20Phra%20That%20Hariphunchai.jpg"
          />
        </div>
        <div className="px-5 py-16 sm:px-8 lg:px-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d8ff78]">Enhancement phase</p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight">Expand once station operations are stable.</h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/76">
            Future phases add richer automation, tourism engagement, and sustainability reporting on top of reliable
            live operating data.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {enhancements.map((item) => (
              <div className="border border-white/[0.14] bg-white/[0.08] px-4 py-3 text-sm font-semibold" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 lg:px-10" id="readiness">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#3d765f]">Launch readiness</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#16241f]">
                Move from design into station validation.
              </h2>
              <p className="mt-5 text-base leading-8 text-[#53615b]">
                Launch readiness depends on reliable sync, trained station staff, daily reconciliation, and clear bike
                safety states.
              </p>
            </div>
            <div className="grid gap-3">
              {readinessTracks.map(([track, need]) => (
                <div className="grid gap-2 border border-[#d9ded2] bg-[#f7f9f0] p-4 sm:grid-cols-[160px_1fr]" key={track}>
                  <p className="text-sm font-bold text-[#1d352d]">{track}</p>
                  <p className="text-sm leading-6 text-[#53615b]">{need}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 border border-[#cfd9c5] bg-[#eef3e4] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#3d765f]">Success measures</p>
            <div className="mt-5 grid gap-4 md:grid-cols-5">
              {[
                "Service continues during outage",
                "Unsafe bikes cannot be rented",
                "Payments link to Rental ID",
                "Managers reconcile conflicts",
                "Government reports stay transparent"
              ].map((measure) => (
                <p className="text-sm font-semibold leading-6 text-[#1d352d]" key={measure}>
                  {measure}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
