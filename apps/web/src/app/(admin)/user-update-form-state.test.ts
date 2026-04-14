import {
  initialUserUpdateFormState,
  type UserUpdateFormState
} from "./user-update-form-state";

describe("initialUserUpdateFormState", () => {
  it("starts in the idle state without a message", () => {
    const state: UserUpdateFormState = initialUserUpdateFormState;

    expect(state).toEqual({
      status: "idle",
      message: null
    });
  });
});
