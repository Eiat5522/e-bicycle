export interface UserUpdateFormState {
  readonly message: string | null;
  readonly status: "idle" | "error" | "success";
}

export const initialUserUpdateFormState: UserUpdateFormState = {
  message: null,
  status: "idle"
};
