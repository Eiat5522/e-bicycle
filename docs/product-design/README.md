# Product Design Documentation

This folder translates the Lamphun Smart Green Mobility requirements into product design guidance for the customer mobile app, station/staff operations, admin dashboard, and backup operating model.

## Start Here

1. [Product Design Brief](product-design-brief.md) - the product promise, design principles, audiences, MVP boundaries, and success measures.
2. [MVP Launch Decisions](mvp-launch-decisions.md) - the confirmed launch constraints, PDPA design note, FreeDare fleet assumptions, status model, and source-backed inspection policy.
3. [Standalone Staff Tablet Wireflow And Offline Sync Spec](standalone-staff-tablet-wireflow.md) - the station tablet app flow, screens, offline data states, sync behavior, and conflict rules.
4. [Staff Tablet Low-Fidelity Wireframes](staff-tablet-low-fidelity-wireframes.md) - layout-level wireframes for the four MVP-critical tablet screens.
5. [Staff Tablet Implementation Spec](staff-tablet-implementation-spec.md) - the implementation-facing tablet app contracts, local storage tables, sync payloads, and API endpoints.
6. [Staff Tablet Implementation Tickets](staff-tablet-implementation-tickets.md) - the build backlog for shared contracts, backend sync APIs, the standalone tablet app, and admin conflict review.
7. [Lamphun Smart Green Mobility Gamma Deck](lamphun-smart-green-mobility-gamma-deck.md) - a five-slide Gamma-ready presentation outline for project overview, timeline, MVP scope, enhancements, and launch readiness.
8. [Personas And Journeys](personas-and-journeys.md) - the primary users, their goals, anxieties, and end-to-end journeys.
9. [MVP Flow And Screen Inventory](mvp-flow-and-screen-inventory.md) - the launch flows and screen-level design scope for mobile, standalone staff tablet, and admin surfaces.
10. [Operations And Fallback Design](operations-and-fallback-design.md) - the offline continuity, manual override, reconciliation, and evidence capture experience.
11. [Open Questions](open-questions.md) - remaining decisions needed before high-fidelity UI, prototypes, or implementation planning.

## Source Inputs

These docs were drafted from the current repository and the requirement extracts in `docs/documentation`, especially:

- `docs/documentation/requirements/Master Executive Summary.pdf.md`
- `docs/documentation/requirements/One-Page Strategy Map.pdf.md`
- `docs/documentation/requirements/E-Bike Rental MVP Phase Systems and Features.xlsx.md`
- `docs/documentation/requirements/Functional Specification.pdf.md`
- `docs/documentation/requirements/Lamphun_Green_Mobility_Blueprint.pptx.md`
- `docs/documentation/database/E-Bike Operation Database Tables.xlsx.md`
- `docs/documentation/e-bike-mvp-online-offline-architecture.html`
- `docs/documentation/transcription_Architecting_Resilient_E-Bike_Systems_for_Lamphun.csv`

The current app surfaces are also reflected: the mobile app already covers authentication, map, unlock, active ride, ride history, wallet, eco impact, profile, and support; the web app already covers admin access, dashboard metrics, bicycle management, users, wallet/ride context, ride replay, and status audit events.
