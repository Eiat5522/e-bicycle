import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { UnlockResult } from "@glide/shared";

import { configuredUnlockService } from "@/lib/unlock-service";

import { UnlockScreen } from "./unlock-screen";

jest.mock("@/lib/unlock-service", () => ({
  configuredUnlockService: {
    startUnlock: jest.fn()
  }
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn()
}));

jest.setTimeout(20000);

describe("UnlockScreen", () => {
  const startUnlock = jest.mocked(configuredUnlockService.startUnlock);
  const push = jest.fn();

  function createResult(
    method: "qr" | "bluetooth",
    attempt: number,
    finalStatus: "success" | "failed"
  ): UnlockResult {
    const result: UnlockResult = {
      bikeId: "G-205",
      method,
      attempt,
      phases:
        method === "qr"
          ? [
              {
                status: "scanning",
                label: "Align QR code",
                description: "Point your camera at the bike code."
              },
              {
                status: "authorizing",
                label: "Authorizing unlock",
                description: "Checking your rental session."
              },
              {
                status: "unlocking",
                label: "Releasing lock",
                description: "Sending the unlock command."
              }
            ]
          : [
              {
                status: "connecting",
                label: "Searching for bike",
                description: "Looking for the bike over Bluetooth."
              },
              {
                status: "authorizing",
                label: "Pairing securely",
                description: "Creating a secure Bluetooth session."
              },
              {
                status: "unlocking",
                label: "Releasing lock",
                description: "Sending the unlock command."
              }
            ],
      finalStatus,
      successMessage: "Bike unlocked."
    };

    if (finalStatus === "failed") {
      return {
        ...result,
        failureMessage: "Unlock could not be completed."
      };
    }

    return result;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "G-205" });
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  async function flushTimers(ms = 6000) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ms);
    });
  }

  it("renders QR and Bluetooth choices without a direct success shortcut", () => {
    render(<UnlockScreen />);

    expect(screen.getByText("Scan QR")).toBeTruthy();
    expect(screen.getByText("Unlock via Bluetooth")).toBeTruthy();
    expect(screen.queryByText("Simulate Successful Unlock")).toBeNull();
  });

  it("opens directly into the QR simulation when route params request scan mode", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({
      id: "DEMO-BIKE",
      method: "qr",
      autostart: "true"
    });

    render(<UnlockScreen />);

    expect(screen.getByText("QR scanner simulation")).toBeTruthy();
    expect(screen.getByText("Preparing QR pass...")).toBeTruthy();

    await flushTimers(900);

    expect(screen.getByText("QR pass ready")).toBeTruthy();
    expect(screen.getByText("Unlock bike now")).toBeTruthy();
  });

  it("fails the first QR attempt, then retries to a successful ride transition", async () => {
    startUnlock
      .mockResolvedValueOnce(createResult("qr", 1, "failed"))
      .mockResolvedValueOnce(createResult("qr", 2, "success"));

    render(<UnlockScreen />);

    fireEvent.press(screen.getByLabelText("Choose QR unlock"));
    fireEvent.press(screen.getByText("Generate ride QR pass"));
    await flushTimers(900);
    fireEvent.press(screen.getByText("Unlock bike now"));

    await flushTimers();
    expect(screen.getByText("Unlock failed")).toBeTruthy();
    expect(screen.queryByText("Generate ride QR pass")).toBeNull();

    expect(startUnlock).toHaveBeenNthCalledWith(1, {
      bikeId: "G-205",
      method: "qr",
      attempt: 1
    });

    fireEvent.press(screen.getByText("Retry QR"));
    await flushTimers(900);
    fireEvent.press(screen.getByText("Unlock bike now"));

    await flushTimers();
    expect(screen.getByText("Bike unlocked")).toBeTruthy();

    await flushTimers(1300);

    expect(startUnlock).toHaveBeenNthCalledWith(2, {
      bikeId: "G-205",
      method: "qr",
      attempt: 2
    });
    expect(push).toHaveBeenCalledWith({
      pathname: "/ride/active",
      params: {
        bikeId: "G-205",
        entry: "unlock"
      }
    });
  });

  it("fails the first Bluetooth attempt, then retries to a successful ride transition", async () => {
    startUnlock
      .mockResolvedValueOnce(createResult("bluetooth", 1, "failed"))
      .mockResolvedValueOnce(createResult("bluetooth", 2, "success"));

    render(<UnlockScreen />);

    fireEvent.press(screen.getByLabelText("Choose Bluetooth unlock"));
    fireEvent.press(screen.getByText("Connect to bike"));
    await flushTimers(1600);
    fireEvent.press(screen.getByText("Send unlock command"));

    await flushTimers();
    expect(screen.getByText("Unlock failed")).toBeTruthy();

    expect(startUnlock).toHaveBeenNthCalledWith(1, {
      bikeId: "G-205",
      method: "bluetooth",
      attempt: 1
    });

    fireEvent.press(screen.getByText("Retry Bluetooth"));
    await flushTimers(1600);
    fireEvent.press(screen.getByText("Send unlock command"));

    await flushTimers();
    expect(screen.getByText("Bike unlocked")).toBeTruthy();

    await flushTimers(1300);

    expect(startUnlock).toHaveBeenNthCalledWith(2, {
      bikeId: "G-205",
      method: "bluetooth",
      attempt: 2
    });
    expect(push).toHaveBeenCalledWith({
      pathname: "/ride/active",
      params: {
        bikeId: "G-205",
        entry: "unlock"
      }
    });
  });

  it("clears the failure state when switching methods", async () => {
    startUnlock.mockResolvedValueOnce(createResult("qr", 1, "failed"));

    render(<UnlockScreen />);

    fireEvent.press(screen.getByLabelText("Choose QR unlock"));
    fireEvent.press(screen.getByText("Generate ride QR pass"));
    await flushTimers(900);
    fireEvent.press(screen.getByText("Unlock bike now"));

    await flushTimers();
    expect(screen.getByText("Unlock failed")).toBeTruthy();

    fireEvent.press(screen.getByText("Try Bluetooth Instead"));

    expect(screen.queryByText("Unlock failed")).toBeNull();
    expect(screen.getByText("Bluetooth unlock simulation")).toBeTruthy();
    expect(screen.getByText("Connect to bike")).toBeTruthy();
  });

  it("shows a failed transaction when unlock startup rejects", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    startUnlock.mockRejectedValueOnce(new Error("Service unavailable."));

    render(<UnlockScreen />);

    fireEvent.press(screen.getByLabelText("Choose QR unlock"));
    fireEvent.press(screen.getByText("Generate ride QR pass"));
    await flushTimers(900);
    fireEvent.press(screen.getByText("Unlock bike now"));
    await act(async () => {});

    expect(screen.getByText("Unlock failed")).toBeTruthy();
    expect(screen.getByText("Unlock could not start. Service unavailable.")).toBeTruthy();
    expect(screen.getByText("Error: Service unavailable.")).toBeTruthy();
    expect(screen.getByText("Retry QR")).toBeTruthy();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("shows a failed transaction when unlock phases are missing", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    startUnlock.mockResolvedValueOnce({
      ...createResult("qr", 1, "failed"),
      phases: []
    });

    render(<UnlockScreen />);

    fireEvent.press(screen.getByLabelText("Choose QR unlock"));
    fireEvent.press(screen.getByText("Generate ride QR pass"));
    await flushTimers(900);
    fireEvent.press(screen.getByText("Unlock bike now"));
    await act(async () => {});

    expect(screen.getByText("Unlock failed")).toBeTruthy();
    expect(
      screen.getByText("Unlock could not start because the transaction details were incomplete.")
    ).toBeTruthy();
    expect(screen.getByText("Error: Unlock transaction phases are required.")).toBeTruthy();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
