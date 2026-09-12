import { test } from "@playwright/test";

import { expectRedirectToLogin } from "../helpers/auth";

test.describe("public routing", () => {
  test("redirects the home route to login for unauthenticated visitors", async ({ page }) => {
    await expectRedirectToLogin(page, "/");
  });

  test("redirects the dashboard route to login for unauthenticated visitors", async ({ page }) => {
    await expectRedirectToLogin(page, "/dashboard");
  });
});
