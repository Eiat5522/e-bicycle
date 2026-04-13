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
