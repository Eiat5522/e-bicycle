# ARI: Session & Logistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Adaptive Ride Intelligence (ARI) copilot for standard bicycles, focusing on session timing and hub-based return guidance.

**Architecture:** Client-side session tracking with threshold-based coaching and dynamic map visibility for docking hubs.

**Tech Stack:** React Native (Expo), TypeScript, Shared Packages (Monorepo).

---

## File Mapping
- `packages/shared/src/models/ari.ts`: Shared domain types for sessions and hubs.
- `packages/api/src/services/ari.ts`: Mocked API contracts for ride telemetry and session status.
- `apps/mobile/src/features/ari/hooks/useSessionTimer.ts`: Core hook for countdown and threshold detection.
- `apps/mobile/src/features/ari/services/CoachingService.ts`: Manager for haptics and toast notifications.
- `apps/mobile/src/features/ari/components/ActiveRideTimer.tsx`: UI component for the prominent countdown.
- `apps/mobile/src/features/ari/components/HubMarker.tsx`: Enhanced map marker with dynamic prominence.

---

### Task 1: Shared Domain Models

**Files:**
- Create: `packages/shared/src/models/ari.ts`
- Test: `packages/shared/tests/models/ari.test.ts`

- [ ] **Step 1: Write the failing test**
```typescript
import { AriSessionSchema } from '../../src/models/ari';

describe('AriSessionSchema', () => {
  it('should validate a correct session object', () => {
    const validSession = {
      id: 'ride_123',
      startTime: new Date().toISOString(),
      durationLimitMs: 1800000, // 30 mins
      status: 'active'
    };
    expect(AriSessionSchema.parse(validSession)).toEqual(validSession);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter shared test`
Expected: FAIL (Module not found)

- [ ] **Step 3: Define Zod schemas and types**
```typescript
import { z } from 'zod';

export const AriSessionSchema = z.object({
  id: z.string(),
  startTime: z.string().datetime(),
  durationLimitMs: z.number().positive(),
  status: z.enum(['active', 'completed', 'paused']),
});

export type AriSession = z.infer<typeof AriSessionSchema>;

export const HubSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  capacity: z.number(),
  availableSlots: z.number(),
});

export type Hub = z.infer<typeof HubSchema>;
```

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter shared test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add packages/shared/
git commit -m "feat(shared): add ARI domain models"
```

---

### Task 2: Mobile Session Timer Hook

**Files:**
- Create: `apps/mobile/src/features/ari/hooks/useSessionTimer.ts`
- Test: `apps/mobile/src/features/ari/hooks/__tests__/useSessionTimer.test.ts`

- [ ] **Step 1: Write the failing test**
```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useSessionTimer } from '../useSessionTimer';

describe('useSessionTimer', () => {
  it('should countdown from the limit', () => {
    const { result } = renderHook(() => useSessionTimer({ 
      startTime: new Date().toISOString(), 
      durationLimitMs: 10000 // 10 seconds 
    }));
    expect(result.current.timeLeftMs).toBeLessThanOrEqual(10000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm --filter mobile test`
Expected: FAIL

- [ ] **Step 3: Implement the hook**
```typescript
import { useState, useEffect } from 'react';

interface TimerProps {
  startTime: string;
  durationLimitMs: number;
}

export function useSessionTimer({ startTime, durationLimitMs }: TimerProps) {
  const [timeLeftMs, setTimeLeftMs] = useState(durationLimitMs);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, durationLimitMs - elapsed);
      setTimeLeftMs(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, durationLimitMs]);

  return { timeLeftMs };
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm --filter mobile test`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/features/ari/hooks/
git commit -m "feat(mobile): implement useSessionTimer hook"
```

---

### Task 3: Coaching Threshold Logic

**Files:**
- Modify: `apps/mobile/src/features/ari/hooks/useSessionTimer.ts`
- Create: `apps/mobile/src/features/ari/services/CoachingService.ts`

- [ ] **Step 1: Update hook to emit threshold events**
```typescript
// Add to useSessionTimer.ts
const THRESHOLDS = [900000, 600000, 300000]; // 15, 10, 5 mins in MS

interface TimerProps {
  startTime: string;
  durationLimitMs: number;
  onThresholdReached?: (thresholdMs: number) => void;
}

export function useSessionTimer({ startTime, durationLimitMs, onThresholdReached }: TimerProps) {
  const [timeLeftMs, setTimeLeftMs] = useState(durationLimitMs);

  useEffect(() => {
    const crossed = THRESHOLDS.find(t => timeLeftMs <= t && timeLeftMs > t - 2000);
    if (crossed && onThresholdReached) {
      onThresholdReached(crossed);
    }
  }, [timeLeftMs]);

  // ... rest of hook
```

- [ ] **Step 2: Create CoachingService for UI feedback**
```typescript
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export const CoachingService = {
  notify: (thresholdMs: number) => {
    const mins = thresholdMs / 60000;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('ARI Coach', `You have ${mins} minutes remaining in your session.`);
  }
};
```

- [ ] **Step 3: Commit**
```bash
git add apps/mobile/src/features/ari/
git commit -m "feat(mobile): add coaching thresholds and service"
```

---

### Task 4: Active Ride UI Component

**Files:**
- Create: `apps/mobile/src/features/ari/components/ActiveRideDashboard.tsx`

- [ ] **Step 1: Implement Dashboard with Timer**
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { CoachingService } from '../services/CoachingService';

export function ActiveRideDashboard({ session }) {
  const { timeLeftMs } = useSessionTimer({
    ...session,
    onThresholdReached: CoachingService.notify
  });
  
  const minutes = Math.floor(timeLeftMs / 60000);
  const seconds = Math.floor((timeLeftMs % 60000) / 1000);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>TIME REMAINING</Text>
      <Text style={styles.timer}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', borderRadius: 16 },
  label: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  timer: { fontSize: 32, fontWeight: 'bold', color: '#333' }
});
```

- [ ] **Step 2: Commit**
```bash
git add apps/mobile/src/features/ari/components/
git commit -m "feat(mobile): add ActiveRideDashboard component"
```

---

### Task 5: Smart Hub Visibility

**Files:**
- Create: `apps/mobile/src/features/ari/components/HubMarker.tsx`

- [ ] **Step 1: Implement HubMarker with dynamic scaling**
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSessionTimer } from '../hooks/useSessionTimer';

export function HubMarker({ hub, session }) {
  const { timeLeftMs } = useSessionTimer(session);
  const isTimeLow = timeLeftMs < 600000; // 10 minutes

  return (
    <View style={[
      styles.marker,
      isTimeLow && styles.urgentMarker
    ]}>
      {/* Icon for Hub */}
    </View>
  );
}

const styles = StyleSheet.create({
  marker: { width: 24, height: 24, backgroundColor: '#4CAF50', borderRadius: 12 },
  urgentMarker: { transform: [{ scale: 1.5 }], backgroundColor: '#FF5722' }
});
```

- [ ] **Step 2: Commit**
```bash
git add apps/mobile/src/features/ari/components/
git commit -m "feat(mobile): add Smart HubMarker component"
```
