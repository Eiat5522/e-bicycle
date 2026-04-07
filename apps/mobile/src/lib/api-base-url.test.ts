import { getApiBaseUrl } from "./api-base-url";

const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

describe("getApiBaseUrl", () => {
  afterEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  });

  it("uses the Expo LAN host for iOS when it is available", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000/api/";

    expect(getApiBaseUrl({ hostUri: "192.168.1.20:8081", platformOS: "ios" })).toBe(
      "http://192.168.1.20:3000/api"
    );
  });

  it("keeps localhost reachable from the iOS simulator without a LAN host", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000/api/";

    expect(getApiBaseUrl({ hostUri: "", platformOS: "ios" })).toBe("http://127.0.0.1:3000/api");
  });

  it("maps localhost to the Android emulator host gateway", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000/api/";

    expect(getApiBaseUrl({ hostUri: "", platformOS: "android" })).toBe(
      "http://10.0.2.2:3000/api"
    );
  });

  it("uses the Expo LAN host for Android when it is available", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000/api/";

    expect(getApiBaseUrl({ hostUri: "192.168.1.20:8081", platformOS: "android" })).toBe(
      "http://192.168.1.20:3000/api"
    );
  });

  it("uses the Expo LAN host from an Expo Go URL", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000/api/";

    expect(getApiBaseUrl({ hostUri: "exp://192.168.1.20:8081/--/", platformOS: "ios" })).toBe(
      "http://192.168.1.20:3000/api"
    );
  });

  it("leaves non-localhost API URLs unchanged", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.example.com/api/";

    expect(getApiBaseUrl({ hostUri: "192.168.1.20:8081", platformOS: "ios" })).toBe(
      "https://api.example.com/api"
    );
  });
});
