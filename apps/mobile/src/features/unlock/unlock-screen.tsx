import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Text,
  View
} from "react-native";

import type { UnlockMethod, UnlockResult, UnlockStatus } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { configuredUnlockService } from "@/lib/unlock-service";
import { colors, radii, spacing } from "@/theme/tokens";

const PHASE_DELAY_MS = 900;
const COMPLETION_DELAY_MS = 900;
const REDIRECT_DELAY_MS = 1200;
const QR_PREP_DELAY_MS = 850;
const BLUETOOTH_PREP_DELAY_MS = 1500;
const isTestEnvironment = process.env.NODE_ENV === "test";

type TransactionState =
  | {
      readonly status: "idle";
      readonly method?: UnlockMethod;
      readonly result?: undefined;
      readonly phaseIndex?: undefined;
      readonly errorDetails?: undefined;
    }
  | {
      readonly status: "running";
      readonly method: UnlockMethod;
      readonly result: UnlockResult;
      readonly phaseIndex: number;
      readonly errorDetails?: undefined;
    }
  | {
      readonly status: "failed";
      readonly method: UnlockMethod;
      readonly result: UnlockResult;
      readonly phaseIndex?: undefined;
      readonly errorDetails?: string;
    }
  | {
      readonly status: "success";
      readonly method: UnlockMethod;
      readonly result: UnlockResult;
      readonly phaseIndex?: undefined;
      readonly errorDetails?: undefined;
    };

type PrepState =
  | {
      readonly status: "idle";
      readonly method: UnlockMethod | null;
      readonly modalVisible: false;
      readonly mockCode: string | null;
    }
  | {
      readonly status: "previewing";
      readonly method: UnlockMethod;
      readonly modalVisible: false;
      readonly mockCode: string | null;
    }
  | {
      readonly status: "ready";
      readonly method: UnlockMethod;
      readonly modalVisible: boolean;
      readonly mockCode: string | null;
    };

const methodLabels: Record<UnlockMethod, string> = {
  qr: "QR",
  bluetooth: "Bluetooth"
};

const qrPattern = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 1, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1]
] as const;

function getMethodIntro(method: UnlockMethod, bikeId: string) {
  if (method === "qr") {
    return {
      title: "QR scanner simulation",
      description: `Generate a temporary ride pass for ${bikeId}, then explicitly send the unlock command.`
    };
  }

  return {
    title: "Bluetooth unlock simulation",
    description: `Search for ${bikeId}, animate the connection, then confirm the unlock command from the modal popup.`
  };
}

function getPhaseVisualLabel(status: UnlockStatus) {
  if (status === "scanning") {
    return "QR scanning in progress";
  }

  if (status === "connecting") {
    return "Bluetooth connection in progress";
  }

  if (status === "authorizing") {
    return "Rental authorization in progress";
  }

  if (status === "unlocking") {
    return "Sending unlock command";
  }

  return "Unlock transaction";
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createMockQrPayload(bikeId: string, attempt: number) {
  return `GLIDE-${bikeId.replace(/[^A-Z0-9]/gi, "").toUpperCase()}-${String(attempt).padStart(2, "0")}`;
}

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getRequestedUnlockMethod(value: string | undefined): UnlockMethod | undefined {
  if (value === "qr" || value === "bluetooth") {
    return value;
  }

  return undefined;
}

function getUnlockErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Unlock could not be started.";
}

function createUnlockFailureResult({
  bikeId,
  method,
  attempt,
  failureMessage
}: {
  readonly bikeId: string;
  readonly method: UnlockMethod;
  readonly attempt: number;
  readonly failureMessage: string;
}): UnlockResult {
  return {
    bikeId,
    method,
    attempt,
    phases: [],
    finalStatus: "failed",
    successMessage: "",
    failureMessage
  };
}

function MethodVisual({
  method,
  bikeId,
  isPreviewing
}: {
  readonly method: UnlockMethod;
  readonly bikeId: string;
  readonly isPreviewing: boolean;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTestEnvironment) {
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        })
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      pulse.stopAnimation();
    };
  }, [pulse]);

  if (method === "qr") {
    const scanLineTop = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [10, 130]
    });

    return (
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.background,
            borderRadius: radii.large,
            minHeight: 180,
          overflow: "hidden",
          padding: spacing.md,
          position: "relative"
        }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.surface,
            borderColor: colors.teal,
            borderRadius: radii.medium,
            borderWidth: 2,
            gap: 2,
            padding: spacing.sm
          }}>
          {qrPattern.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: 2 }}>
              {row.map((cell, cellIndex) => {
                const highlighted = (rowIndex + cellIndex) % 3 === 0;

                return (
                  <View
                    key={`cell-${rowIndex}-${cellIndex}`}
                    style={{
                      backgroundColor:
                        cell === 1 ? (highlighted && isPreviewing ? colors.coral : colors.text) : "transparent",
                      borderRadius: 4,
                      height: 16,
                      width: 16
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>

        <Animated.View
          style={{
            backgroundColor: "rgba(93, 179, 153, 0.35)",
            borderRadius: radii.pill,
            height: 8,
            left: spacing.md,
            position: "absolute",
            right: spacing.md,
            top: scanLineTop
          }}
        />

        <Text
          selectable
          style={{
            color: colors.textMuted,
            fontSize: 13,
            marginTop: spacing.md,
            textAlign: "center"
          }}>
          {isPreviewing ? `Generating rider pass for ${bikeId}...` : `Ready to generate a fresh QR pass for ${bikeId}.`}
        </Text>
      </View>
    );
  }

  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.25]
  });
  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0]
  });

  return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.large,
          justifyContent: "center",
        minHeight: 180,
        overflow: "hidden",
        padding: spacing.md,
        position: "relative"
      }}>
      {[0, 1, 2].map((ring) => (
        <Animated.View
          key={`ring-${ring}`}
          style={{
            borderColor: colors.teal,
            borderRadius: radii.pill,
            borderWidth: 2,
            height: 70 + ring * 28,
            opacity: ringOpacity,
            position: "absolute",
            transform: [{ scale: ringScale }],
            width: 70 + ring * 28
          }}
        />
      ))}
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.teal,
          borderRadius: radii.pill,
          height: 72,
          justifyContent: "center",
          width: 72
        }}>
        <MaterialCommunityIcons color={colors.surface} name="bluetooth" size={34} />
      </View>
      <Text
        selectable
        style={{
          color: colors.textMuted,
          fontSize: 13,
          marginTop: spacing.md,
          textAlign: "center"
        }}>
        {isPreviewing ? `Searching nearby and pairing with ${bikeId}...` : `Ready to scan nearby bikes and connect to ${bikeId}.`}
      </Text>
    </View>
  );
}

export function UnlockScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    method?: string | string[];
    autostart?: string | string[];
  }>();
  const bikeId = readSingleParam(params.id) ?? "your bike";
  const requestedMethod = getRequestedUnlockMethod(readSingleParam(params.method));
  const shouldAutostart = readSingleParam(params.autostart) === "true";
  const runIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const initialMethodAppliedRef = useRef(false);
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(12)).current;
  const modalScale = useRef(new Animated.Value(0.92)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const [attemptCounts, setAttemptCounts] = useState<Record<UnlockMethod, number>>({
    qr: 0,
    bluetooth: 0
  });
  const [transaction, setTransaction] = useState<TransactionState>({ status: "idle" });
  const [prepState, setPrepState] = useState<PrepState>({
    status: "idle",
    method: null,
    modalVisible: false,
    mockCode: null
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!transaction.method) {
      return;
    }

    if (isTestEnvironment) {
      panelOpacity.setValue(1);
      panelTranslateY.setValue(0);
      return;
    }

    panelOpacity.setValue(0);
    panelTranslateY.setValue(12);

    Animated.parallel([
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(panelTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [panelOpacity, panelTranslateY, transaction.method]);

  useEffect(() => {
    if (!prepState.modalVisible) {
      modalOpacity.setValue(0);
      modalScale.setValue(0.92);
      return;
    }

    if (isTestEnvironment) {
      modalOpacity.setValue(1);
      modalScale.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.spring(modalScale, {
        damping: 18,
        mass: 0.8,
        stiffness: 180,
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();
  }, [modalOpacity, modalScale, prepState.modalVisible]);

  async function beginUnlock(method: UnlockMethod) {
    const nextAttempt = attemptCounts[method] + 1;
    const runId = runIdRef.current + 1;

    runIdRef.current = runId;

    setAttemptCounts((currentCounts) => ({
      ...currentCounts,
      [method]: nextAttempt
    }));
    setPrepState({ status: "idle", modalVisible: false, method: null, mockCode: null });

    try {
      const result = await configuredUnlockService.startUnlock({
        bikeId,
        method,
        attempt: nextAttempt
      });

      if (!isMountedRef.current || runIdRef.current !== runId) {
        return;
      }

      if (!result.phases[0]) {
        throw new Error("Unlock transaction phases are required.");
      }

      setTransaction({
        status: "running",
        method,
        result,
        phaseIndex: 0
      });

      for (let phaseIndex = 1; phaseIndex < result.phases.length; phaseIndex += 1) {
        await wait(PHASE_DELAY_MS);

        if (!isMountedRef.current || runIdRef.current !== runId) {
          return;
        }

        setTransaction({
          status: "running",
          method,
          result,
          phaseIndex
        });
      }

      await wait(COMPLETION_DELAY_MS);

      if (!isMountedRef.current || runIdRef.current !== runId) {
        return;
      }

      if (result.finalStatus === "success") {
        setTransaction({
          status: "success",
          method,
          result
        });

        await wait(REDIRECT_DELAY_MS);

        if (!isMountedRef.current || runIdRef.current !== runId) {
          return;
        }

        router.push({
          pathname: "/ride/active",
          params: {
            bikeId,
            entry: "unlock"
          }
        });
        return;
      }

      setTransaction({
        status: "failed",
        method,
        result
      });
    } catch (error) {
      if (!isMountedRef.current || runIdRef.current !== runId) {
        return;
      }

      const errorDetails =
        error instanceof Error ? `${error.name}: ${error.message}` : getUnlockErrorMessage(error);
      const failureMessage =
        error instanceof Error && error.message === "Unlock transaction phases are required."
          ? "Unlock could not start because the transaction details were incomplete."
          : `Unlock could not start. ${getUnlockErrorMessage(error)}`;

      console.error("Unlock flow failed to start.", {
        bikeId,
        method,
        attempt: nextAttempt,
        error
      });

      setTransaction({
        status: "failed",
        method,
        result: createUnlockFailureResult({
          bikeId,
          method,
          attempt: nextAttempt,
          failureMessage
        }),
        errorDetails
      });
    }
  }

  async function startMethodExperience(method: UnlockMethod) {
    const nextAttempt = attemptCounts[method] + 1;
    const runId = runIdRef.current + 1;

    runIdRef.current = runId;
    setTransaction({
      status: "idle",
      method
    });
    setPrepState({
      status: "previewing",
      method,
      modalVisible: false,
      mockCode: method === "qr" ? createMockQrPayload(bikeId, nextAttempt) : null
    });

    await wait(method === "qr" ? QR_PREP_DELAY_MS : BLUETOOTH_PREP_DELAY_MS);

    if (!isMountedRef.current || runIdRef.current !== runId) {
      return;
    }

    setPrepState({
      status: "ready",
      method,
      modalVisible: true,
      mockCode: method === "qr" ? createMockQrPayload(bikeId, nextAttempt) : null
    });
  }

  function closePrepModal() {
    setPrepState((currentState) => ({
      ...currentState,
      modalVisible: false
    }));
  }

  function resetToMethodChoice(nextMethod?: UnlockMethod) {
    runIdRef.current += 1;
    setPrepState({
      status: "idle",
      modalVisible: false,
      method: null,
      mockCode: null
    });

    if (nextMethod) {
      setTransaction({
        status: "idle",
        method: nextMethod
      });
      return;
    }

    setTransaction({ status: "idle" });
  }

  useEffect(() => {
    if (!requestedMethod || initialMethodAppliedRef.current) {
      return;
    }

    initialMethodAppliedRef.current = true;

    if (!shouldAutostart) {
      setTransaction({
        status: "idle",
        method: requestedMethod
      });
      return;
    }

    const nextAttempt = attemptCounts[requestedMethod] + 1;
    const runId = runIdRef.current + 1;

    runIdRef.current = runId;
    setTransaction({
      status: "idle",
      method: requestedMethod
    });
    setPrepState({
      status: "previewing",
      method: requestedMethod,
      modalVisible: false,
      mockCode: requestedMethod === "qr" ? createMockQrPayload(bikeId, nextAttempt) : null
    });

    const timer = setTimeout(() => {
      if (!isMountedRef.current || runIdRef.current !== runId) {
        return;
      }

      setPrepState({
        status: "ready",
        method: requestedMethod,
        modalVisible: true,
        mockCode: requestedMethod === "qr" ? createMockQrPayload(bikeId, nextAttempt) : null
      });
    }, requestedMethod === "qr" ? QR_PREP_DELAY_MS : BLUETOOTH_PREP_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [attemptCounts, bikeId, requestedMethod, shouldAutostart]);

  const activeMethod = transaction.method;
  const showMethodActions =
    transaction.status === "idle" || transaction.status === "failed" || transaction.status === "success";
  const isBusy = transaction.status === "running" || prepState.status === "previewing";
  const selectedMethodDetails = activeMethod ? getMethodIntro(activeMethod, bikeId) : undefined;
  const activePhase =
    transaction.status === "running" ? transaction.result.phases[transaction.phaseIndex] : undefined;

  const progressWidth = useMemo<`${number}%`>(() => {
    if (transaction.status !== "running") {
      return "0%";
    }

    return `${((transaction.phaseIndex + 1) / transaction.result.phases.length) * 100}%`;
  }, [transaction]);

  const modalPrimaryLabel =
    prepState.method === "qr" ? "Unlock bike now" : "Send unlock command";

  return (
    <>
      <ScreenShell
        title={`Unlock ${bikeId}`}
        description="Choose QR or Bluetooth, simulate the unlock transaction, and enter the ride only after the bike unlocks.">
        <SurfaceCard tone="accent">
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Unlock methods
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            This mock flow stays inside Expo Go. The visuals, modal checkpoint, and unlock steps are wired so real camera and BLE integrations can replace the mocks later.
          </Text>
        </SurfaceCard>

        <View style={{ gap: spacing.sm }}>
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Choose how to unlock
          </Text>

          <View style={{ gap: spacing.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose QR unlock"
              disabled={isBusy}
              onPress={() => resetToMethodChoice("qr")}
              style={({ pressed }) => ({
                backgroundColor: activeMethod === "qr" ? colors.surfaceStrong : colors.surface,
                borderColor: activeMethod === "qr" ? colors.coralDark : colors.outline,
                borderCurve: "continuous",
                borderRadius: radii.large,
                borderWidth: 1,
                opacity: isBusy ? 0.5 : pressed ? 0.75 : 1,
                padding: spacing.lg
              })}>
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Scan QR
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                Best when the bike code is visible and the camera has a clear line of sight.
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose Bluetooth unlock"
              disabled={isBusy}
              onPress={() => resetToMethodChoice("bluetooth")}
              style={({ pressed }) => ({
                backgroundColor: activeMethod === "bluetooth" ? colors.surfaceStrong : colors.surface,
                borderColor: activeMethod === "bluetooth" ? colors.coralDark : colors.outline,
                borderCurve: "continuous",
                borderRadius: radii.large,
                borderWidth: 1,
                opacity: isBusy ? 0.5 : pressed ? 0.75 : 1,
                padding: spacing.lg
              })}>
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Unlock via Bluetooth
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                Best when you are close to the bike and the QR sticker is damaged or hard to scan.
              </Text>
            </Pressable>
          </View>
        </View>

        {selectedMethodDetails ? (
          <Animated.View
            style={{
              opacity: panelOpacity,
              transform: [{ translateY: panelTranslateY }]
            }}>
            <SurfaceCard tone="muted">
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                {selectedMethodDetails.title}
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                {selectedMethodDetails.description}
              </Text>
              <MethodVisual
                bikeId={bikeId}
                isPreviewing={prepState.status === "previewing" && prepState.method === activeMethod}
                method={activeMethod as UnlockMethod}
              />
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: spacing.sm,
                  justifyContent: "space-between"
                }}>
                <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
                  {`Attempts: ${activeMethod ? attemptCounts[activeMethod] : 0}`}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
                  {prepState.status === "previewing" && prepState.method === activeMethod
                    ? activeMethod === "qr"
                      ? "Preparing QR pass..."
                      : "Connecting..."
                    : "Awaiting your action"}
                </Text>
              </View>
            </SurfaceCard>
          </Animated.View>
        ) : null}

        {transaction.status === "running" ? (
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              {activePhase ? getPhaseVisualLabel(activePhase.status) : "Unlock transaction"}
            </Text>
            <View
              style={{
                backgroundColor: "rgba(32, 69, 57, 0.12)",
                borderRadius: radii.pill,
                height: 10,
                overflow: "hidden"
              }}>
              <View
                style={{
                  backgroundColor: colors.teal,
                  borderRadius: radii.pill,
                  height: "100%",
                  width: progressWidth
                }}
              />
            </View>
            <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
              {activePhase?.label}
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              {activePhase?.description}
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
              {`Method: ${methodLabels[transaction.method]}`}
            </Text>
          </SurfaceCard>
        ) : null}

        {transaction.status === "failed" ? (
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              Unlock failed
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              {transaction.result.failureMessage ?? "Unlock could not be completed."}
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
              {`Method: ${methodLabels[transaction.method]} · Attempt ${transaction.result.attempt}`}
            </Text>
            {transaction.errorDetails ? (
              <Text selectable style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
                {transaction.errorDetails}
              </Text>
            ) : null}
          </SurfaceCard>
        ) : null}

        {transaction.status === "success" ? (
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              Bike unlocked
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              {transaction.result.successMessage}
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
              Redirecting to the active ride dashboard.
            </Text>
          </SurfaceCard>
        ) : null}

        {showMethodActions && transaction.status !== "failed" ? (
          <View style={{ gap: spacing.sm }}>
            <PrimaryButton
              label="Generate ride QR pass"
              onPress={() => void startMethodExperience("qr")}
              disabled={activeMethod !== "qr" || isBusy}
            />
            <PrimaryButton
              label="Connect to bike"
              onPress={() => void startMethodExperience("bluetooth")}
              disabled={activeMethod !== "bluetooth" || isBusy}
              variant="secondary"
            />
          </View>
        ) : null}

        {transaction.status === "failed" ? (
          <View style={{ gap: spacing.sm }}>
            <PrimaryButton
              label={`Retry ${methodLabels[transaction.method]}`}
              onPress={() => void startMethodExperience(transaction.method)}
            />
            <PrimaryButton
              label={`Try ${transaction.method === "qr" ? "Bluetooth" : "QR"} Instead`}
              onPress={() =>
                resetToMethodChoice(transaction.method === "qr" ? "bluetooth" : "qr")
              }
              variant="secondary"
            />
          </View>
        ) : null}
      </ScreenShell>

      <Modal
        animationType="none"
        onRequestClose={closePrepModal}
        transparent
        visible={prepState.modalVisible}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "rgba(32, 69, 57, 0.55)",
            flex: 1,
            justifyContent: "center",
            padding: spacing.lg
          }}>
          <Animated.View
            style={{
              opacity: modalOpacity,
              transform: [{ scale: modalScale }],
              width: "100%"
            }}>
            <SurfaceCard tone="default">
              <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
                {prepState.method === "qr" ? "QR pass ready" : "Bike connected"}
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                {prepState.method === "qr"
                  ? `A temporary pass was generated for ${bikeId}. Review the mock QR payload, then tap unlock when you want to release the lock.`
                  : `${bikeId} responded over Bluetooth. The mock connection is live, and you can now send the unlock command.`}
              </Text>

              {prepState.method === "qr" && prepState.mockCode ? (
                <View
                  style={{
                    backgroundColor: colors.surfaceMuted,
                    borderCurve: "continuous",
                    borderRadius: radii.medium,
                    gap: spacing.xs,
                    padding: spacing.md
                  }}>
                  <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
                    Generated payload
                  </Text>
                  <Text
                    selectable
                    style={{
                      color: colors.teal,
                      fontSize: 16,
                      fontVariant: ["tabular-nums"],
                      fontWeight: "800"
                    }}>
                    {prepState.mockCode}
                  </Text>
                </View>
              ) : null}

              <View style={{ gap: spacing.sm }}>
                <PrimaryButton
                  label={modalPrimaryLabel}
                  onPress={() => {
                    if (prepState.method) {
                      void beginUnlock(prepState.method);
                    }
                  }}
                />
                <PrimaryButton label="Close" onPress={closePrepModal} variant="secondary" />
              </View>
            </SurfaceCard>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
