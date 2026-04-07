import Constants from "expo-constants";
import { Platform } from "react-native";

const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function getApiBaseUrl() {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!apiBaseUrl) {
    return undefined;
  }

  try {
    const url = new URL(apiBaseUrl);

    if (Platform.OS !== "web" && localHostnames.has(url.hostname)) {
      url.hostname = getNativeDevServerHost() ?? (Platform.OS === "android" ? "10.0.2.2" : "localhost");
    }

    return removeTrailingSlash(url.toString());
  } catch {
    return removeTrailingSlash(apiBaseUrl);
  }
}

function getNativeDevServerHost() {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.platform?.hostUri;
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
