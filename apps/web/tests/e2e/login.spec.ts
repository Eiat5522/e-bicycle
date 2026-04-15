import { test } from "@playwright/test";

import { expectLoginScreen } from "../helpers/auth";

test.describe("login page", () => {
  test("renders the admin sign-in form", async ({ page }) => {
    await page.goto("/login");

    await expectLoginScreen(page);
  });
});
