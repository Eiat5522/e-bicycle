import { getTabBarStyle } from "./tab-bar-style";

describe("getTabBarStyle", () => {
  it("keeps the existing compact tab bar on devices without a bottom inset", () => {
    expect(getTabBarStyle(0)).toMatchObject({
      height: 56,
      marginBottom: 8,
      paddingBottom: 4,
      paddingTop: 2
    });
  });

  it("grows the tab bar to fully clear the home indicator area", () => {
    expect(getTabBarStyle(34)).toMatchObject({
      height: 90,
      marginBottom: 8,
      paddingBottom: 38,
      paddingTop: 2
    });
  });
});
