import { fireEvent, render } from "@testing-library/react-native";

import { PrimaryButton } from "./primary-button";

describe("PrimaryButton", () => {
  it("invokes the press handler", () => {
    const onPress = jest.fn();
    const screen = render(<PrimaryButton label="Continue" onPress={onPress} />);

    fireEvent.press(screen.getByText("Continue"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
