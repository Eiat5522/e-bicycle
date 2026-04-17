export interface UserCreateFormState {
  readonly message: string | null;
  readonly status: "idle" | "error" | "success";
}

export const initialUserCreateFormState: UserCreateFormState = {
  message: null,
  status: "idle"
};
