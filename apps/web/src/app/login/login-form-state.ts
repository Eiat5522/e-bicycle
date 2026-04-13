import type { LoginFormErrors, LoginFormValues } from "@/lib/validation";

export interface LoginFormState {
  readonly errors: LoginFormErrors;
  readonly message: string | null;
  readonly values: LoginFormValues;
}

export const initialLoginFormState: LoginFormState = {
  errors: {},
  message: null,
  values: {
    email: "",
    password: ""
  }
};
