import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  Text,
  View
} from "react-native";

import { formatCurrency } from "@glide/shared";
import type { Wallet } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { configuredWalletService } from "@/lib/wallet-service";
import {
  borderWidths,
  colors,
  radii,
  shadows,
  spacing,
  typography
} from "@/theme/tokens";
import { getBankLogo, type SupportedBankLogo } from "./bank-logo-map";

const isTestEnvironment = process.env.NODE_ENV === "test";

type PaymentMethod = "card" | "mobile_pay" | "voucher" | "mobile_banking";

type BankOption = {
  id: SupportedBankLogo;
  name: string;
  color: string;
};

const BANK_OPTIONS: BankOption[] = [
  { id: "KBANK", name: "KBank", color: "#138f2d" },
  { id: "SCB", name: "SCB", color: "#4e2d83" },
  { id: "BBL", name: "BBL", color: "#1b4f91" },
  { id: "KTB", name: "KTB", color: "#00a3e0" },
  { id: "TMB", name: "TMB", color: "#0081bb" },
  { id: "TrueMoney", name: "TrueMoney", color: "#ff6700" },
  { id: "PromptPay", name: "PromptPay", color: "#007bff" }
];

type TopUpState =
  | { status: "idle"; amount: number | null; method: PaymentMethod | null }
  | { status: "processing"; amount: number; method: PaymentMethod; stepIndex: number }
  | { status: "success"; amount: number; method: PaymentMethod }
  | { status: "failed"; amount: number; method: PaymentMethod; error: string };

type ModalState =
  | { visible: false; type: null }
  | { visible: true; type: "topup_confirm"; amount: number; method: PaymentMethod }
  | { visible: true; type: "payment_success"; amount: number; method: PaymentMethod }
  | { visible: true; type: "voucher_redeem"; code: string }
  | { visible: true; type: "bank_select"; amount: number };

const PAYMENT_STEPS = [
  { label: "Verifying payment method", description: "Checking your selected payment source..." },
  { label: "Processing payment", description: "Contacting payment gateway securely..." },
  { label: "Confirming transaction", description: "Finalizing your top-up..." },
  { label: "Updating balance", description: "Adding funds to your wallet..." }
];

const VOUCHER_STEPS = [
  { label: "Validating voucher code", description: "Checking code format and expiry..." },
  { label: "Verifying eligibility", description: "Confirming voucher hasn't been used..." },
  { label: "Applying credit", description: "Adding voucher value to your balance..." }
];

const MOBILE_BANKING_STEPS = [
  { label: "Connecting to bank", description: "Establishing secure connection to your bank..." },
  { label: "Verifying account", description: "Confirming your bank account details..." },
  { label: "Processing transfer", description: "Completing the fund transfer..." },
  { label: "Updating balance", description: "Adding funds to your wallet..." }
];

const methodLabels: Record<PaymentMethod, string> = {
  card: "Credit/Debit Card",
  mobile_pay: "Mobile Pay",
  voucher: "Gift Voucher",
  mobile_banking: "Mobile Banking"
};

const TOP_UP_AMOUNTS = [5, 10, 20, 50] as const;

const pressedStyle = {
  transform: [{ translateX: 2 }, { translateY: 2 }]
} as const;

const amountButtonBaseStyle = {
  flex: 1,
  alignItems: "center",
  borderColor: colors.shadow,
  borderRadius: radii.medium,
  borderWidth: borderWidths.thick,
  padding: spacing.md
} as const;

const paymentMethodButtonBaseStyle = {
  alignItems: "center",
  borderColor: colors.shadow,
  borderRadius: radii.large,
  borderWidth: borderWidths.thick,
  flexDirection: "row",
  gap: spacing.md,
  padding: spacing.lg
} as const;

const unlockButtonBaseStyle = {
  alignItems: "center",
  backgroundColor: colors.surfaceMuted,
  borderColor: colors.shadow,
  borderRadius: radii.medium,
  borderWidth: borderWidths.thick,
  flexDirection: "row",
  gap: spacing.md,
  justifyContent: "center",
  padding: spacing.md
} as const;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function PaymentMethodIcon({ method }: { readonly method: PaymentMethod }) {
  if (method === "card") {
    return <MaterialCommunityIcons color={colors.text} name="credit-card-outline" size={24} />;
  }

  if (method === "mobile_pay") {
    return <MaterialCommunityIcons color={colors.text} name="cellphone-nfc" size={24} />;
  }

  if (method === "mobile_banking") {
    return <MaterialCommunityIcons color={colors.text} name="bank-outline" size={24} />;
  }

  return <MaterialCommunityIcons color={colors.text} name="ticket-percent-outline" size={24} />;
}

function CardVisual({
  isAnimating,
  method,
  selectedBankId
}: {
  readonly isAnimating: boolean;
  readonly method: PaymentMethod;
  readonly selectedBankId?: SupportedBankLogo | null;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTestEnvironment || !isAnimating) {
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        })
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse, isAnimating]);

  if (method === "card") {
    const shimmerLeft = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [-120, 280]
    });

    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#1a1a2e",
          borderRadius: radii.large,
          minHeight: 160,
          overflow: "hidden",
          padding: spacing.lg,
          position: "relative"
        }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <View style={{ backgroundColor: colors.coral, borderRadius: 4, height: 16, width: 24 }} />
            <View style={{ backgroundColor: colors.yellow, borderRadius: 4, height: 16, width: 24 }} />
          </View>
          <Text selectable style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
            VISA
          </Text>
        </View>

        <Text
          selectable
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 18,
            fontWeight: "600",
            letterSpacing: 3,
            marginTop: spacing.xl
          }}>
          •••• •••• •••• 4242
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg, width: "100%" }}>
          <Text selectable style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
            CARD HOLDER
          </Text>
          <Text selectable style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
            EXPIRES
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
          <Text selectable style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" }}>
            DEMO USER
          </Text>
          <Text selectable style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" }}>
            12/28
          </Text>
        </View>

        {isAnimating && (
          <Animated.View
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: radii.medium,
              height: 40,
              left: shimmerLeft,
              position: "absolute",
              top: 0,
              width: 80
            }}
          />
        )}
      </View>
    );
  }

  if (method === "mobile_pay") {
    const ringScale = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1.3]
    });
    const ringOpacity = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 0]
    });

    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#f0f4ff",
          borderRadius: radii.large,
          justifyContent: "center",
          minHeight: 160,
          overflow: "hidden",
          padding: spacing.lg,
          position: "relative"
        }}>
        {[0, 1, 2].map((ring) => (
          <Animated.View
            key={`ring-${ring}`}
            style={{
              borderColor: colors.teal,
              borderRadius: radii.pill,
              borderWidth: 2,
              height: 60 + ring * 30,
              opacity: isAnimating ? ringOpacity : 0,
              position: "absolute",
              transform: [{ scale: ringScale }],
              width: 60 + ring * 30
            }}
          />
        ))}
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.teal,
            borderRadius: radii.pill,
            height: 64,
            justifyContent: "center",
            width: 64
          }}>
          <MaterialCommunityIcons color={colors.surface} name="cellphone-nfc" size={28} />
        </View>
        <Text
          selectable
          style={{
            color: colors.textMuted,
            fontSize: 13,
            marginTop: spacing.md,
            textAlign: "center"
          }}>
          {isAnimating ? "Connecting to mobile wallet..." : "Tap to pay with your mobile wallet"}
        </Text>
      </View>
    );
  }

  if (method === "mobile_banking") {
    const bank = selectedBankId ? BANK_OPTIONS.find((b) => b.id === selectedBankId) : null;
    const bankColor = bank?.color ?? colors.teal;

    const ringScale = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1.25]
    });
    const ringOpacity = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0]
    });
    const arrowOpacity = pulse.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 1, 0]
    });
    const arrowTranslate = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 16]
    });

    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#f0f7ff",
          borderRadius: radii.large,
          justifyContent: "center",
          minHeight: 160,
          overflow: "hidden",
          padding: spacing.lg,
          position: "relative"
        }}>
        {[0, 1, 2].map((ring) => (
          <Animated.View
            key={`bank-ring-${ring}`}
            style={{
              borderColor: bankColor,
              borderRadius: radii.pill,
              borderWidth: 2,
              height: 64 + ring * 28,
              opacity: isAnimating ? ringOpacity : 0,
              position: "absolute",
              transform: [{ scale: ringScale }],
              width: 64 + ring * 28
            }}
          />
        ))}
        <View
          style={{
            alignItems: "center",
            backgroundColor: bankColor,
            borderRadius: radii.pill,
            height: 64,
            justifyContent: "center",
            overflow: "hidden",
            width: 64
          }}>
          {bank ? (
            <Image
              source={getBankLogo(bank.id)}
              style={{ height: 48, width: 48 }}
              resizeMode="contain"
            />
          ) : (
            <MaterialCommunityIcons color={colors.surface} name="bank-outline" size={28} />
          )}
        </View>
        {isAnimating && (
          <Animated.View
            style={{
              marginTop: spacing.sm,
              opacity: arrowOpacity,
              transform: [{ translateX: arrowTranslate }]
            }}>
            <MaterialCommunityIcons color={bankColor} name="arrow-right-bold" size={22} />
          </Animated.View>
        )}
        <Text
          selectable
          style={{
            color: colors.textMuted,
            fontSize: 13,
            marginTop: spacing.md,
            textAlign: "center"
          }}>
          {isAnimating
            ? `Transferring via ${bank?.name ?? "bank"}...`
            : bank
              ? `Pay via ${bank.name} internet banking`
              : "Select your bank to proceed"}
        </Text>
      </View>
    );
  }

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6]
  });

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: "#fff8f0",
        borderRadius: radii.large,
        justifyContent: "center",
        minHeight: 160,
        overflow: "hidden",
        padding: spacing.lg,
        position: "relative"
      }}>
      {isAnimating && (
        <Animated.View
          style={{
            backgroundColor: colors.coral,
            borderRadius: radii.pill,
            height: 120,
            opacity: glowOpacity,
            position: "absolute",
            width: 200
          }}
        />
      )}
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.coral,
          borderRadius: radii.medium,
          height: 80,
          justifyContent: "center",
          width: 140
        }}>
        <MaterialCommunityIcons color={colors.surface} name="ticket-percent-outline" size={32} />
      </View>
      <Text
        selectable
        style={{
          color: colors.textMuted,
          fontSize: 13,
          marginTop: spacing.md,
          textAlign: "center"
        }}>
        {isAnimating ? "Validating voucher code..." : "Enter your gift voucher code"}
      </Text>
    </View>
  );
}

function TransactionIcon({ type }: { readonly type: string }) {
  const iconName =
    type === "top_up"
      ? "wallet-plus-outline"
      : type === "ride"
        ? "bike-fast"
        : type === "refund"
          ? "backup-restore"
          : "star-four-points-outline";

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.shadow,
        borderRadius: radii.medium,
        borderWidth: borderWidths.thin,
        height: 40,
        justifyContent: "center",
        width: 40
      }}>
      <MaterialCommunityIcons color={colors.text} name={iconName} size={20} />
    </View>
  );
}

function getStepsForMethod(method: PaymentMethod) {
  if (method === "voucher") return VOUCHER_STEPS;
  if (method === "mobile_banking") return MOBILE_BANKING_STEPS;
  return PAYMENT_STEPS;
}

export function WalletScreen() {
  const router = useRouter();
  const runIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(12)).current;
  const modalScale = useRef(new Animated.Value(0.92)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const balanceScale = useRef(new Animated.Value(1)).current;

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [topUp, setTopUp] = useState<TopUpState>({ status: "idle", amount: null, method: null });
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedBank, setSelectedBank] = useState<SupportedBankLogo | null>(null);
  const [modal, setModal] = useState<ModalState>({ visible: false, type: null });
  const [voucherCode, setVoucherCode] = useState("");

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadWallet() {
      try {
        setIsWalletLoading(true);
        const nextWallet = await configuredWalletService.getWallet();

        if (!isActive) {
          return;
        }

        setWallet(nextWallet);
        setWalletError(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setWalletError(error instanceof Error ? error.message : "Unable to load wallet.");
      } finally {
        if (isActive) {
          setIsWalletLoading(false);
        }
      }
    }

    void loadWallet();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (topUp.status === "idle") {
      panelOpacity.setValue(0);
      panelTranslateY.setValue(12);
      return;
    }

    if (isTestEnvironment) {
      panelOpacity.setValue(1);
      panelTranslateY.setValue(0);
      return;
    }

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
  }, [topUp.status, panelOpacity, panelTranslateY]);

  useEffect(() => {
    if (!modal.visible) {
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
  }, [modal.visible, modalOpacity, modalScale]);

  function animateBalance() {
    if (isTestEnvironment) {
      balanceScale.setValue(1.15);
      return;
    }
    Animated.sequence([
      Animated.timing(balanceScale, {
        toValue: 1.15,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.spring(balanceScale, {
        toValue: 1,
        damping: 12,
        stiffness: 150,
        useNativeDriver: true
      })
    ]).start();
  }

  async function processTopUp(amount: number, method: PaymentMethod) {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    const steps = getStepsForMethod(method);

    setTopUp({ status: "processing", amount, method, stepIndex: 0 });

    for (let i = 0; i < steps.length; i++) {
      await wait(1000);
      if (!isMountedRef.current || runIdRef.current !== runId) return;
      setTopUp({ status: "processing", amount, method, stepIndex: i });
    }

    await wait(600);
    if (!isMountedRef.current || runIdRef.current !== runId) return;

    const isSuccess = method !== "voucher" || voucherCode.length >= 6;

    if (isSuccess) {
      try {
        const nextWallet = await configuredWalletService.applyTopUp({
          amount,
          methodLabel: methodLabels[method],
          title: method === "voucher" ? "Voucher Credit" : "Wallet Top-up"
        });

        if (!isMountedRef.current || runIdRef.current !== runId) return;

        setWallet(nextWallet);
        setWalletError(null);
        setTopUp({ status: "success", amount, method });
      } catch (error) {
        if (!isMountedRef.current || runIdRef.current !== runId) return;

        setTopUp({
          status: "failed",
          amount,
          method,
          error: error instanceof Error ? error.message : "Unable to process your top-up."
        });

        return;
      }

      animateBalance();

      setModal({ visible: true, type: "payment_success", amount, method });
    } else {
      setTopUp({
        status: "failed",
        amount,
        method,
        error: "Invalid voucher code. Please enter a code with at least 6 characters."
      });
    }
  }

  function startTopUpFlow() {
    if (selectedAmount === null || selectedMethod === null) return;

    if (selectedMethod === "voucher") {
      setModal({ visible: true, type: "voucher_redeem", code: "" });
      return;
    }

    if (selectedMethod === "mobile_banking") {
      setModal({ visible: true, type: "bank_select", amount: selectedAmount });
      return;
    }

    setModal({ visible: true, type: "topup_confirm", amount: selectedAmount, method: selectedMethod });
  }

  function confirmTopUp() {
    if (modal.type !== "topup_confirm" && modal.type !== "voucher_redeem") return;

    const amount = modal.type === "topup_confirm" ? modal.amount : selectedAmount ?? 0;
    const method = modal.type === "topup_confirm" ? modal.method : "voucher";

    setModal({ visible: false, type: null });
    void processTopUp(amount, method);
  }

  function proceedToTopUpConfirmation() {
    if (modal.type !== "bank_select" || selectedBank === null) return;
    setModal({ visible: true, type: "topup_confirm", amount: modal.amount, method: "mobile_banking" });
  }

  function closeModal() {
    setModal({ visible: false, type: null });
  }

  function resetTopUp() {
    runIdRef.current += 1;
    setTopUp({ status: "idle", amount: null, method: null });
    setSelectedAmount(null);
    setSelectedMethod(null);
    setSelectedBank(null);
    setVoucherCode("");
  }

  const isProcessing = topUp.status === "processing";
  const progressWidth = useMemo(() => {
    if (topUp.status !== "processing") return "0%";
    const steps = getStepsForMethod(topUp.method);
    return `${((topUp.stepIndex + 1) / steps.length) * 100}%`;
  }, [topUp]);

  const currentStep =
    topUp.status === "processing"
      ? getStepsForMethod(topUp.method)[topUp.stepIndex]
      : null;
  const balance = wallet?.balance ?? 0;
  const points = wallet?.points ?? 0;
  const transactions = wallet?.transactions ?? [];

  return (
    <>
      <ScreenShell
        title="Wallet"
        description="Top up your balance, redeem vouchers, and track your ride spending — all in one place.">
        {isWalletLoading ? (
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              Loading wallet
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              Fetching your latest balance and wallet activity.
            </Text>
          </SurfaceCard>
        ) : null}

        {walletError ? (
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              Wallet unavailable
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              {walletError}
            </Text>
          </SurfaceCard>
        ) : null}

        <Animated.View style={{ transform: [{ scale: balanceScale }] }}>
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
              Current balance
            </Text>
            <Text
              selectable
              style={{
                color: colors.text,
                fontSize: 36,
                fontWeight: "800",
                marginVertical: spacing.xs
              }}>
              {formatCurrency(balance)}
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
              {points} loyalty points
            </Text>
          </SurfaceCard>
        </Animated.View>

        <View style={{ gap: spacing.md }}>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            Top up your wallet
          </Text>

          <View>
            <Text selectable style={{ color: colors.textMuted, fontSize: 14, marginBottom: spacing.sm }}>
              Select amount
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {TOP_UP_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${formatCurrency(amount)}`}
                  disabled={isProcessing}
                  onPress={() => setSelectedAmount(amount)}
                  style={({ pressed }) => [
                    amountButtonBaseStyle,
                    {
                      backgroundColor:
                        selectedAmount === amount ? colors.coral : colors.surface,
                      opacity: isProcessing ? 0.5 : 1
                    },
                    pressed ? pressedStyle : shadows.floating,
                    pressed ? shadows.pressed : undefined
                  ]}>
                  <Text
                    selectable
                    style={{
                       ...typography.bodyStrong,
                       color: colors.text,
                       fontFamily: typography.button.fontFamily
                     }}>
                     {formatCurrency(amount)}
                   </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text selectable style={{ color: colors.textMuted, fontSize: 14, marginBottom: spacing.sm }}>
              Payment method
            </Text>
            <View style={{ gap: spacing.sm }}>
              {(["card", "mobile_pay", "mobile_banking", "voucher"] as PaymentMethod[]).map((method) => (
                <Pressable
                  key={method}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${methodLabels[method]}`}
                  disabled={isProcessing}
                  onPress={() => setSelectedMethod(method)}
                  style={({ pressed }) => [
                    paymentMethodButtonBaseStyle,
                    {
                      backgroundColor:
                        selectedMethod === method ? colors.yellow : colors.surface,
                      opacity: isProcessing ? 0.5 : 1
                    },
                    pressed ? pressedStyle : shadows.floating,
                    pressed ? shadows.pressed : undefined
                  ]}>
                   <PaymentMethodIcon method={method} />
                   <View style={{ flex: 1 }}>
                     <Text
                       selectable
                      style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                      {methodLabels[method]}
                    </Text>
                    <Text
                      selectable
                      style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
                      {method === "card" && "Pay with your saved card ending in 4242"}
                      {method === "mobile_pay" && "Use Apple Pay or Google Pay"}
                      {method === "mobile_banking" && "Transfer directly from your bank account"}
                      {method === "voucher" && "Redeem a gift voucher or promo code"}
                    </Text>
                  </View>
                  <View
                     style={{
                       borderColor: colors.shadow,
                       borderRadius: radii.pill,
                       borderWidth: borderWidths.thin,
                       height: 22,
                       width: 22
                     }}>
                    {selectedMethod === method && (
                      <View
                        style={{
                          backgroundColor: colors.coralDark,
                          borderRadius: radii.pill,
                          height: 14,
                          margin: 2,
                          width: 14
                        }}
                      />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {selectedAmount !== null && selectedMethod !== null && (
            <CardVisual isAnimating={isProcessing} method={selectedMethod} selectedBankId={selectedBank} />
          )}

          {topUp.status === "processing" && currentStep && (
            <SurfaceCard tone="accent">
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                {currentStep.label}
              </Text>
                <View
                  style={{
                    backgroundColor: "rgba(23, 23, 23, 0.12)",
                    borderRadius: radii.pill,
                    height: 10,
                    marginVertical: spacing.sm,
                  overflow: "hidden"
                }}>
                <View
                  style={{
                    backgroundColor: colors.teal,
                    borderRadius: radii.pill,
                    height: "100%",
                    width: progressWidth as `${number}%`
                  }}
                />
              </View>
              <Text selectable style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>
                {currentStep.description}
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 13, marginTop: spacing.xs }}>
                {`Method: ${methodLabels[topUp.method]} · ${formatCurrency(topUp.amount)}`}
              </Text>
            </SurfaceCard>
          )}

          {topUp.status === "success" && (
            <SurfaceCard tone="accent">
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Top-up successful!
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                {formatCurrency(topUp.amount)} has been added to your wallet via {methodLabels[topUp.method]}.
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
                You earned {Math.floor(topUp.amount * 10)} loyalty points!
              </Text>
            </SurfaceCard>
          )}

          {topUp.status === "failed" && (
            <SurfaceCard tone="accent">
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Top-up failed
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                {topUp.error}
              </Text>
            </SurfaceCard>
          )}

          <View style={{ gap: spacing.sm }}>
            <PrimaryButton
              label="Top up now"
              onPress={startTopUpFlow}
              disabled={
                isWalletLoading ||
                walletError !== null ||
                isProcessing ||
                selectedAmount === null ||
                selectedMethod === null
              }
            />
            {topUp.status !== "idle" && (
              <PrimaryButton
                label="Start over"
                onPress={resetTopUp}
                variant="secondary"
              />
            )}
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            Transaction history
          </Text>

          {transactions.map((transaction) => (
            <SurfaceCard key={transaction.id}>
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}>
                <TransactionIcon type={transaction.type} />
                <View style={{ flex: 1 }}>
                  <Text
                    selectable
                    style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                    {transaction.title}
                  </Text>
                  <Text
                    selectable
                    style={{ color: colors.textMuted, fontSize: 13 }}>
                    {transaction.subtitle}
                  </Text>
                </View>
                <Text
                  selectable
                  style={{
                    color: transaction.amount >= 0 ? colors.teal : colors.coral,
                    fontSize: 16,
                    fontWeight: "700"
                  }}>
                  {transaction.amount >= 0 ? "+" : ""}
                  {formatCurrency(transaction.amount)}
                </Text>
              </View>
            </SurfaceCard>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/unlock/[id]", params: { id: "DEMO-BIKE" } })}
          style={({ pressed }) => [
            unlockButtonBaseStyle,
            pressed ? pressedStyle : shadows.floating,
            pressed ? shadows.pressed : undefined
          ]}>
          <MaterialCommunityIcons color={colors.text} name="bike-fast" size={20} />
          <Text
            selectable
            style={{ color: colors.teal, fontSize: 15, fontWeight: "600" }}>
            Unlock a bike to start riding
          </Text>
        </Pressable>
      </ScreenShell>

      <Modal
        animationType="none"
        onRequestClose={closeModal}
        transparent
        visible={modal.visible}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "rgba(45, 47, 47, 0.55)",
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
              {modal.type === "topup_confirm" && (
                <>
                  <Text
                    selectable
                    style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
                    Confirm top-up
                  </Text>
                  <Text
                    selectable
                    style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                    You are about to add {formatCurrency(modal.amount)} to your wallet using {methodLabels[modal.method]}.
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.surfaceMuted,
                      borderCurve: "continuous",
                      borderRadius: radii.medium,
                      gap: spacing.xs,
                      padding: spacing.md
                    }}>
                    <Text
                      selectable
                      style={{ color: colors.textMuted, fontSize: 13 }}>
                      Amount
                    </Text>
                    <Text
                      selectable
                      style={{
                        color: colors.teal,
                        fontSize: 24,
                        fontWeight: "800"
                      }}>
                      {formatCurrency(modal.amount)}
                    </Text>
                    {modal.method === "mobile_banking" && selectedBank && (
                      <>
                        <Text
                          selectable
                          style={{ color: colors.textMuted, fontSize: 13, marginTop: spacing.xs }}>
                          Bank
                        </Text>
                        <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                          <Image
                            source={getBankLogo(selectedBank)}
                            style={{ height: 24, width: 24 }}
                            resizeMode="contain"
                          />
                          <Text
                            selectable
                            style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                            {BANK_OPTIONS.find((b) => b.id === selectedBank)?.name}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                  <View style={{ gap: spacing.sm }}>
                    <PrimaryButton
                      label="Confirm & pay"
                      onPress={confirmTopUp}
                    />
                    <PrimaryButton
                      label="Cancel"
                      onPress={closeModal}
                      variant="secondary"
                    />
                  </View>
                </>
              )}

              {modal.type === "payment_success" && (
                <>
                  <Text
                    selectable
                    style={{
                      color: colors.text,
                      fontSize: 20,
                      fontWeight: "800",
                      textAlign: "center"
                    }}>
                    Payment successful!
                  </Text>
                  <Text
                    selectable
                    style={{
                      color: colors.textMuted,
                      fontSize: 15,
                      lineHeight: 22,
                      textAlign: "center"
                    }}>
                    {formatCurrency(modal.amount)} has been added to your wallet. Your new balance is {formatCurrency(balance)}.
                  </Text>
                  <View style={{ gap: spacing.sm }}>
                    <PrimaryButton
                      label="Done"
                      onPress={closeModal}
                    />
                  </View>
                </>
              )}

              {modal.type === "bank_select" && (
                <>
                  <Text
                    selectable
                    style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
                    Select your bank
                  </Text>
                  <Text
                    selectable
                    style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                    Choose the bank you want to transfer from to top up {formatCurrency(modal.amount)}.
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: spacing.sm,
                      justifyContent: "space-between"
                    }}>
                    {BANK_OPTIONS.map((bank) => {
                      const isSelected = selectedBank === bank.id;
                      return (
                        <Pressable
                          key={bank.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${bank.name}`}
                          onPress={() => setSelectedBank(bank.id)}
                          style={({ pressed }) => [
                            {
                              alignItems: "center",
                              backgroundColor: isSelected ? bank.color : colors.surfaceMuted,
                              borderColor: isSelected ? bank.color : colors.shadow,
                              borderRadius: radii.medium,
                              borderWidth: borderWidths.thin,
                              gap: spacing.xs,
                              paddingHorizontal: spacing.sm,
                              paddingVertical: spacing.md,
                              width: "30%"
                            },
                            pressed ? { opacity: 0.75 } : undefined
                          ]}>
                          <View
                            style={{
                              alignItems: "center",
                              backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : colors.surface,
                              borderRadius: radii.pill,
                              height: 44,
                              justifyContent: "center",
                              overflow: "hidden",
                              width: 44
                            }}>
                            <Image
                              source={getBankLogo(bank.id)}
                              style={{ height: 36, width: 36 }}
                              resizeMode="contain"
                            />
                          </View>
                          <Text
                            selectable
                            style={{
                              color: isSelected ? colors.surface : colors.text,
                              fontSize: 12,
                              fontWeight: "700",
                              textAlign: "center"
                            }}>
                            {bank.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={{ gap: spacing.sm }}>
                    <PrimaryButton
                      label="Continue"
                      onPress={proceedToTopUpConfirmation}
                      disabled={selectedBank === null}
                    />
                    <PrimaryButton
                      label="Cancel"
                      onPress={closeModal}
                      variant="secondary"
                    />
                  </View>
                </>
              )}

              {modal.type === "voucher_redeem" && (
                <>
                  <Text
                    selectable
                    style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
                    Redeem voucher
                  </Text>
                  <Text
                    selectable
                    style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                    Enter your voucher code below. Demo: use any code with 6+ characters.
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.surfaceMuted,
                      borderCurve: "continuous",
                      borderRadius: radii.medium,
                      padding: spacing.md
                    }}>
                    <Pressable
                      onPress={() => {
                        const codes = ["RIDE2026", "GLIDE50", "FREERIDE", "DEMO123"];
                        const code = codes[Math.floor(Math.random() * codes.length)] ?? "DEMO123";
                        setVoucherCode(code);
                      }}
                      style={{
                        alignItems: "center",
                        flexDirection: "row",
                        gap: spacing.sm
                      }}>
                      <Text
                        selectable
                        style={{
                          color: voucherCode ? colors.teal : colors.textMuted,
                          fontSize: 18,
                          fontWeight: "700",
                          flex: 1
                        }}>
                        {voucherCode || "Tap to generate a code"}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={{ gap: spacing.sm }}>
                    <PrimaryButton
                      label="Redeem voucher"
                      onPress={confirmTopUp}
                      disabled={voucherCode.length < 6}
                    />
                    <PrimaryButton
                      label="Cancel"
                      onPress={closeModal}
                      variant="secondary"
                    />
                  </View>
                </>
              )}
            </SurfaceCard>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
