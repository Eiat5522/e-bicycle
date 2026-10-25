import { expect, type Page } from "@playwright/test";

export async function expectLoginScreen(page: Page) {
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
}

export async function expectRedirectToLogin(page: Page, path: string) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login$/);
  await expectLoginScreen(page);
}
