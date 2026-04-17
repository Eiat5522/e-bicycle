const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LoginFormValues {
  readonly email: string;
  readonly password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export interface UserCreateFormValues {
  readonly email: string;
  readonly firstName: string;
  readonly isAdmin: boolean;
  readonly password: string;
}

const bikeIdPattern = /^[A-Z0-9-]{2,32}$/;
const bikeStatuses = new Set(["available", "reserved", "in_use", "maintenance"]);

export function validateLoginForm(formData: FormData) {
  const values: LoginFormValues = {
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? "")
  };

  const errors: LoginFormErrors = {};

  if (!values.email) {
    errors.email = "Enter your admin email.";
  } else if (!emailPattern.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Enter your password.";
  }

  return {
    errors,
    values
  };
}

export function validateProfileUpdateForm(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const isAdmin = formData.get("isAdmin") === "on";

  if (!uuidPattern.test(userId)) {
    throw new Error("Invalid user identifier.");
  }

  if (!firstName) {
    throw new Error("First name is required.");
  }

  if (firstName.length > 80) {
    throw new Error("First name must be 80 characters or fewer.");
  }

  return {
    firstName,
    isAdmin,
    userId
  };
}

export function validateUserCreateForm(formData: FormData): UserCreateFormValues {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const isAdmin = formData.get("isAdmin") === "on";

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!emailPattern.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  if (!firstName) {
    throw new Error("First name is required.");
  }

  if (firstName.length > 80) {
    throw new Error("First name must be 80 characters or fewer.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  return {
    email,
    firstName,
    isAdmin,
    password
  };
}

export function validateBikeForm(formData: FormData) {
  const bikeId = String(formData.get("bikeId") ?? "")
    .trim()
    .toUpperCase();
  const model = String(formData.get("model") ?? "").trim();
  const rideClass = String(formData.get("rideClass") ?? "").trim();
  const pricingLabel = String(formData.get("pricingLabel") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const topSpeedKmh = Number(formData.get("topSpeedKmh") ?? "");
  const latitude = Number(formData.get("latitude") ?? "");
  const longitude = Number(formData.get("longitude") ?? "");

  if (!bikeIdPattern.test(bikeId)) {
    throw new Error("Bike ID must be 2-32 characters using letters, numbers, or dashes.");
  }

  if (!model) {
    throw new Error("Bike model is required.");
  }

  if (!pricingLabel) {
    throw new Error("Pricing label is required.");
  }

  if (!location) {
    throw new Error("Bike location is required.");
  }

  if (!bikeStatuses.has(status)) {
    throw new Error("Bike status is invalid.");
  }

  if (!Number.isFinite(topSpeedKmh) || topSpeedKmh <= 0) {
    throw new Error("Top speed must be greater than zero.");
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }

  return {
    bikeId,
    latitude,
    location,
    longitude,
    model,
    pricingLabel,
    rideClass: rideClass || null,
    status: status as "available" | "reserved" | "in_use" | "maintenance",
    topSpeedKmh
  };
}
