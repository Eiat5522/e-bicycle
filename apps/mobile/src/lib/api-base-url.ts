import Constants from "expo-constants";
import { Platform } from "react-native";

const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

interface ApiBaseUrlOptions {
  readonly hostUri?: string;
  readonly platformOS?: typeof Platform.OS;
}

export function getApiBaseUrl({
  hostUri = getDefaultHostUri(),
  platformOS = Platform.OS
}: ApiBaseUrlOptions = {}) {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    return undefined;
  }

  try {
    const url = new URL(apiBaseUrl);

    if (platformOS !== "web" && localHostnames.has(url.hostname)) {
      url.hostname = getNativeLoopbackHostname(platformOS, hostUri) ?? url.hostname;
    }

    return removeTrailingSlash(url.toString());
  } catch {
    return removeTrailingSlash(apiBaseUrl);
  }
}

function getDefaultHostUri() {
  return (
    Constants.expoConfig?.hostUri ??
    Constants.platform?.hostUri ??
    Constants.linkingUri ??
    Constants.experienceUrl
  );
}

function getNativeLoopbackHostname(platformOS: typeof Platform.OS, hostUri?: string) {
  const nativeDevServerHost = getNativeDevServerHost(hostUri);

  if (nativeDevServerHost) {
    return nativeDevServerHost;
  }

  if (platformOS === "android") {
    return "10.0.2.2";
  }

  if (platformOS === "ios") {
    return undefined;
  }

  return undefined;
}

function getNativeDevServerHost(hostUri?: string) {
  const hostname = hostUri ? parseHostname(hostUri) : undefined;

  return hostname && !localHostnames.has(hostname) ? hostname : undefined;
}

function parseHostname(hostUri: string) {
  try {
    return new URL(hostUri.includes("://") ? hostUri : `http://${hostUri}`).hostname;
  } catch {
    return undefined;
  }
}

function removeTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}
