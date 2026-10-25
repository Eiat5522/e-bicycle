import {
  validateBikeForm,
  validateLoginForm,
  validateProfileUpdateForm,
  validateUserCreateForm
} from "./validation";

function createLoginFormData(overrides?: Record<string, string>) {
  const formData = new FormData();

  formData.set("email", "Admin@RideGlide.App ");
  formData.set("password", "super-secret");

  Object.entries(overrides ?? {}).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

function createProfileUpdateFormData(overrides?: Record<string, string>) {
  const formData = new FormData();

  formData.set("userId", "28f0f4fe-58d4-4ac7-9934-1746e91f8f02");
  formData.set("firstName", "Taylor");
  formData.set("isAdmin", "on");

  Object.entries(overrides ?? {}).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

function createBikeFormData(overrides?: Record<string, string>) {
  const formData = new FormData();

  formData.set("bikeId", "g-701");
  formData.set("model", "Glide Sprint");
  formData.set("rideClass", "Urban");
  formData.set("pricingLabel", "฿1.10 / 10 min");
  formData.set("ratePerMinute", "0.11");
  formData.set("status", "ready_to_rent");
  formData.set("location", "Central World");
  formData.set("topSpeedKmh", "25");
  formData.set("latitude", "13.7466");
  formData.set("longitude", "100.5393");

  Object.entries(overrides ?? {}).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

function createUserCreateFormData(overrides?: Record<string, string>) {
  const formData = new FormData();

  formData.set("email", "NewRider@RideGlide.App ");
  formData.set("firstName", "Jordan");
  formData.set("password", "super-secret");
  formData.set("isAdmin", "on");

  Object.entries(overrides ?? {}).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

describe("validateBikeForm", () => {
  it("normalizes and validates valid bicycle input", () => {
    expect(validateBikeForm(createBikeFormData())).toEqual({
      bikeId: "G-701",
      latitude: 13.7466,
      location: "Central World",
      longitude: 100.5393,
      model: "Glide Sprint",
      pricingLabel: "฿1.10 / 10 min",
      ratePerMinute: 0.11,
      rideClass: "Urban",
      status: "ready_to_rent",
      topSpeedKmh: 25
    });
  });

  it("rejects invalid bike status values", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          status: "offline"
        })
      )
    ).toThrow("Bike status is invalid.");
  });

  it("allows an empty ride class and normalizes it to null", () => {
    expect(
      validateBikeForm(
        createBikeFormData({
          rideClass: ""
        })
      ).rideClass
    ).toBeNull();
  });

  it("rejects invalid bike identifiers", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          bikeId: "!"
        })
      )
    ).toThrow("Bike ID must be 2-32 characters using letters, numbers, or dashes.");
  });

  it("rejects missing bike model values", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          model: ""
        })
      )
    ).toThrow("Bike model is required.");
  });

  it("rejects missing pricing labels", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          pricingLabel: ""
        })
      )
    ).toThrow("Pricing label is required.");
  });

  it("rejects invalid rate per minute values", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          ratePerMinute: "-0.01"
        })
      )
    ).toThrow("Rate per minute must be zero or greater.");
  });

  it("rejects missing bike locations", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          location: ""
        })
      )
    ).toThrow("Bike location is required.");
  });

  it("rejects non-positive top speeds", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          topSpeedKmh: "-1"
        })
      )
    ).toThrow("Top speed must be greater than zero.");
  });

  it("rejects out-of-range latitudes", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          latitude: "91"
        })
      )
    ).toThrow("Latitude must be between -90 and 90.");
  });

  it("rejects out-of-range longitudes", () => {
    expect(() =>
      validateBikeForm(
        createBikeFormData({
          longitude: "-181"
        })
      )
    ).toThrow("Longitude must be between -180 and 180.");
  });
});

describe("validateLoginForm", () => {
  it("normalizes valid admin credentials", () => {
    expect(validateLoginForm(createLoginFormData())).toEqual({
      errors: {},
      values: {
        email: "admin@rideglide.app",
        password: "super-secret"
      }
    });
  });

  it("reports a missing email", () => {
    expect(validateLoginForm(createLoginFormData({ email: "" })).errors.email).toBe(
      "Enter your admin email."
    );
  });

  it("reports an invalid email", () => {
    expect(validateLoginForm(createLoginFormData({ email: "not-an-email" })).errors.email).toBe(
      "Enter a valid email address."
    );
  });

  it("reports a missing password", () => {
    expect(validateLoginForm(createLoginFormData({ password: "" })).errors.password).toBe(
      "Enter your password."
    );
  });
});

describe("validateProfileUpdateForm", () => {
  it("parses a valid profile payload", () => {
    expect(validateProfileUpdateForm(createProfileUpdateFormData())).toEqual({
      firstName: "Taylor",
      isAdmin: true,
      userId: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02"
    });
  });

  it("treats an unchecked admin box as false", () => {
    const formData = createProfileUpdateFormData();

    formData.delete("isAdmin");

    expect(validateProfileUpdateForm(formData).isAdmin).toBe(false);
  });

  it("rejects invalid user identifiers", () => {
    expect(() =>
      validateProfileUpdateForm(
        createProfileUpdateFormData({
          userId: "not-a-uuid"
        })
      )
    ).toThrow("Invalid user identifier.");
  });

  it("rejects missing first names", () => {
    expect(() =>
      validateProfileUpdateForm(
        createProfileUpdateFormData({
          firstName: " "
        })
      )
    ).toThrow("First name is required.");
  });

  it("rejects first names longer than 80 characters", () => {
    expect(() =>
      validateProfileUpdateForm(
        createProfileUpdateFormData({
          firstName: "a".repeat(81)
        })
      )
    ).toThrow("First name must be 80 characters or fewer.");
  });
});

describe("validateUserCreateForm", () => {
  it("parses a valid create user payload", () => {
    expect(validateUserCreateForm(createUserCreateFormData())).toEqual({
      email: "newrider@rideglide.app",
      firstName: "Jordan",
      isAdmin: true,
      password: "super-secret"
    });
  });

  it("treats an unchecked admin box as false", () => {
    const formData = createUserCreateFormData();

    formData.delete("isAdmin");

    expect(validateUserCreateForm(formData).isAdmin).toBe(false);
  });

  it("rejects missing emails", () => {
    expect(() =>
      validateUserCreateForm(
        createUserCreateFormData({
          email: " "
        })
      )
    ).toThrow("Email is required.");
  });

  it("rejects invalid emails", () => {
    expect(() =>
      validateUserCreateForm(
        createUserCreateFormData({
          email: "not-an-email"
        })
      )
    ).toThrow("Enter a valid email address.");
  });

  it("rejects missing first names", () => {
    expect(() =>
      validateUserCreateForm(
        createUserCreateFormData({
          firstName: " "
        })
      )
    ).toThrow("First name is required.");
  });

  it("rejects short passwords", () => {
    expect(() =>
      validateUserCreateForm(
        createUserCreateFormData({
          password: "short"
        })
      )
    ).toThrow("Password must be at least 8 characters long.");
  });
});
