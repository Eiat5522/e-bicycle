# Active Ride Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist an active ride locally, restore it after app relaunch, and load the bike's real metadata instead of mock fallback data.

**Architecture:** Keep `ActiveRideScreen` as the coordinator for recovery, metadata loading, and end-ride actions. Add a small local-storage session shape that stores the live ride snapshot plus enough bike metadata to render immediately after relaunch. On startup, rehydrate the session from `AsyncStorage`, fetch the bike with the real bike service, and fall back to the persisted session metadata only when the network or session is unavailable.

**Tech Stack:** React Native, Expo Router, `AsyncStorage`, `@glide/api` bike service, Jest, React Native Testing Library.

---

### Task 1: Define the recovery session contract and failing tests

**Files:**
- Modify: `apps/mobile/src/features/ride/active-ride-screen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("restores a persisted active ride after relaunch and fetches the real bike metadata", async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(configuredBikeService.getById).mockResolvedValue({
    id: "G-205",
    model: "Glide City Live",
    imageUrl: "https://cdn.example.com/bikes/G-205.webp",
    rideClass: "City",
    estimatedRangeKm: 31,
    topSpeedKmh: 22,
    pricingLabel: "฿0.90 / 10 min",
    ratePerMinute: 0.09,
    status: "in_use",
    activeRiderId: "user-1",
    location: "อโศก Interchange",
    coordinates: { latitude: 13.7372, longitude: 100.5606 },
    lastReportedAt: "2026-04-06T08:56:00Z"
  });

  await AsyncStorage.setItem(
    "active_ride_session",
    JSON.stringify({
      bikeId: "G-205",
      startedAtMs: 1712225700000,
      route: [
        { latitude: 13.7372, longitude: 100.5606 },
        { latitude: 13.7365, longitude: 100.5577 }
      ],
      bike: {
        id: "G-205",
        model: "Glide City",
        location: "อโศก Interchange",
        coordinates: { latitude: 13.7372, longitude: 100.5606 },
        ratePerMinute: 0.09
      }
    })
  );

  render(<ActiveRideScreen />);

  expect(await screen.findByText("G-205 is tracking live")).toBeTruthy();
  expect(screen.getByText("Glide City Live")).toBeTruthy();
  expect(configuredBikeService.getById).toHaveBeenCalledWith("G-205");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @glide/mobile test -- --runTestsByPath src/features/ride/active-ride-screen.test.tsx -t "restores a persisted active ride after relaunch and fetches the real bike metadata"`
Expected: FAIL because the screen still reads mock ride data and does not rehydrate from storage.

- [ ] **Step 3: Write minimal implementation**

```tsx
// Add a persisted session loader, a bike metadata fetch, and pass restored values
// into the tracker and UI instead of using mockActiveRide/mockBikes.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @glide/mobile test -- --runTestsByPath src/features/ride/active-ride-screen.test.tsx -t "restores a persisted active ride after relaunch and fetches the real bike metadata"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ride/active-ride-screen.test.tsx apps/mobile/src/features/ride/active-ride-screen.tsx
git commit -m "feat: restore active ride sessions"
```

### Task 2: Persist and rehydrate the active ride session

**Files:**
- Modify: `apps/mobile/src/features/ride/active-ride-screen.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("persists the active ride snapshot while it is running", async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ bikeId: "G-205" });
  jest.mocked(configuredBikeService.getById).mockResolvedValue({
    id: "G-205",
    model: "Glide City Live",
    imageUrl: "https://cdn.example.com/bikes/G-205.webp",
    rideClass: "City",
    estimatedRangeKm: 31,
    topSpeedKmh: 22,
    pricingLabel: "฿0.90 / 10 min",
    ratePerMinute: 0.09,
    status: "in_use",
    activeRiderId: "user-1",
    location: "อโศก Interchange",
    coordinates: { latitude: 13.7372, longitude: 100.5606 },
    lastReportedAt: "2026-04-06T08:56:00Z"
  });

  render(<ActiveRideScreen />);

  await waitFor(() => {
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "active_ride_session",
      expect.stringContaining("\"bikeId\":\"G-205\"")
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @glide/mobile test -- --runTestsByPath src/features/ride/active-ride-screen.test.tsx -t "persists the active ride snapshot while it is running"`
Expected: FAIL because the screen does not persist a ride session yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
// Save the live ride session when the ride snapshot changes and rehydrate it
// on mount so relaunches keep the same ride identity and route progress.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @glide/mobile test -- --runTestsByPath src/features/ride/active-ride-screen.test.tsx -t "persists the active ride snapshot while it is running"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ride/active-ride-screen.tsx
git commit -m "feat: persist active ride progress"
```

### Task 3: Cover missing-network and missing-session recovery

**Files:**
- Modify: `apps/mobile/src/features/ride/active-ride-screen.test.tsx`
- Modify: `apps/mobile/src/features/ride/active-ride-screen.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("keeps the restored ride visible when bike metadata cannot be refreshed", async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(configuredBikeService.getById).mockRejectedValue(new Error("Failed to fetch bike: network request failed"));

  await AsyncStorage.setItem(
    "active_ride_session",
    JSON.stringify({
      bikeId: "G-205",
      startedAtMs: 1712225700000,
      route: [],
      bike: {
        id: "G-205",
        model: "Glide City",
        location: "อโศก Interchange",
        coordinates: { latitude: 13.7372, longitude: 100.5606 },
        ratePerMinute: 0.09
      }
    })
  );

  render(<ActiveRideScreen />);

  expect(await screen.findByText("G-205 is tracking live")).toBeTruthy();
  expect(screen.getByText("Glide City")).toBeTruthy();
  expect(screen.getByText("Tracking fallback active")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @glide/mobile test -- --runTestsByPath src/features/ride/active-ride-screen.test.tsx -t "keeps the restored ride visible when bike metadata cannot be refreshed"`
Expected: FAIL because metadata fetch errors are not yet handled by the restored session path.

- [ ] **Step 3: Write minimal implementation**

```tsx
// If fetching bike metadata or session state fails, render from persisted
// session data and surface the existing tracking fallback card instead of
// dropping the ride state.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @glide/mobile test -- --runTestsByPath src/features/ride/active-ride-screen.test.tsx -t "keeps the restored ride visible when bike metadata cannot be refreshed"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/ride/active-ride-screen.test.tsx apps/mobile/src/features/ride/active-ride-screen.tsx
git commit -m "fix: recover active ride metadata"
```

