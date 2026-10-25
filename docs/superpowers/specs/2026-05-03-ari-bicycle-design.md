# Design Spec: Adaptive Ride Intelligence (ARI) for Standard Bicycles

**Status:** Draft
**Date:** 2026-05-03
**Topic:** Session & Logistics Optimization for non-electric fleet.

---

## 1. Goal & Context
The ARI feature is an intelligent copilot designed to improve rider compliance and satisfaction. For standard bicycles, the focus shifts from battery management to **Session Lifecycle Management**—ensuring riders return bikes to designated physical hubs within their allotted time window.

## 2. Core Requirements
- **Session Tracking:** Real-time countdown of the current rental period (e.g., 30-minute free tier).
- **Fixed Threshold Coaching:** Proactive "nudges" at 15, 10, and 5 minutes remaining.
- **Hub-Centric Logistics:** Guidance to designated physical docking points.
- **Smart Map Visibility:** Dynamic UI adjustments to highlight return hubs as the session limit approaches.

## 3. Architecture & Data Flow
- **Mobile Client:** Primary engine for session timing and UI state.
- **Shared Models (`packages/shared`):** Canonical definitions for `RideSession`, `Hub`, and `RideTelemetry`.
- **API (`packages/api`):** Typed contracts for session start/end and telemetry batching.

### Components
- `SessionTimer`: High-precision hook/service for tracking elapsed/remaining time.
- `CoachingEngine`: Logic for triggering haptic/toast notifications at specific thresholds.
- `MapOverlayController`: Manages the prominence of Hub markers based on `SessionTimer` state.

## 4. User Experience
- **Active Ride Dashboard:** Displays a prominent countdown timer.
- **Coaching Toasts:**
    - "15 min: Enjoying the ride? 15 mins left."
    - "10 min: Time to find a hub? 10 mins left."
    - "5 min: Action required! Nearest hub: [Distance]."
- **Map Behavior:** At 10 minutes remaining, Hub icons scale up and non-essential map clutter is reduced.

## 5. Success Criteria
- Reduction in "overtime" fees for users.
- Improved compliance with hub-based parking.
- Positive user feedback on "helpful but not annoying" coaching.
