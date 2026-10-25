import { getTabBarStyle } from "./tab-bar-style";

describe("getTabBarStyle", () => {
  it("keeps the existing compact tab bar on devices without a bottom inset", () => {
    expect(getTabBarStyle(0)).toMatchObject({
      height: 52,
      marginBottom: 8,
      paddingBottom: 0,
      paddingTop: 1
    });
  });

  it("grows the tab bar to fully clear the home indicator area", () => {
    expect(getTabBarStyle(34)).toMatchObject({
      height: 86,
      marginBottom: 8,
      paddingBottom: 34,
      paddingTop: 1
    });
  });
});
