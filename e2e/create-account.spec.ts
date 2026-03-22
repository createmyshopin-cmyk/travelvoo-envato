import { test, expect } from "@playwright/test";

test.describe("@smoke Create account page", () => {
  test("renders form on /create-account", async ({ page }) => {
    await page.goto("/create-account", { waitUntil: "domcontentloaded" });
    // Session / role check shows a spinner first; wait for the real form.
    await expect(page.getByTestId("create-account-form")).toBeVisible({ timeout: 60_000 });

    await expect(page.getByRole("heading", { name: "Create Your Account" })).toBeVisible();
    await expect(page.getByTestId("create-account-form")).toBeVisible();
    await expect(page.getByPlaceholder("Green Leaf Resort")).toBeVisible();
    await expect(page.getByPlaceholder("greenleaf")).toBeVisible();
    await expect(page.getByPlaceholder("admin@company.com")).toBeVisible();
    await expect(page.getByPlaceholder("Min 6 characters")).toBeVisible();
    await expect(page.getByTestId("create-account-submit")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up with Google" })).toBeVisible();
  });

  test("Sign in link points to /login", async ({ page }) => {
    await page.goto("/create-account");
    await expect(page.getByTestId("create-account-form")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});

/**
 * Full signup hits Supabase + Edge Functions. Enable only when env is set.
 *
 * E2E_FULL_SIGNUP=1
 * E2E_SIGNUP_PASSWORD=your-secure-test-password
 * Optional: E2E_SIGNUP_EMAIL_DOMAIN=demo.com (default) — builds unique e2e.<timestamp>@domain
 */
test.describe("Create account full flow (optional)", () => {
  test("submits and lands on tenant subdomain admin (real backend)", async ({ page }) => {
    test.skip(
      process.env.E2E_FULL_SIGNUP !== "1",
      "Set E2E_FULL_SIGNUP=1 and E2E_SIGNUP_PASSWORD to run against a real project.",
    );

    const password = process.env.E2E_SIGNUP_PASSWORD;
    if (!password) {
      test.skip(true, "E2E_SIGNUP_PASSWORD is required when E2E_FULL_SIGNUP=1");
    }

    const domain = process.env.E2E_SIGNUP_EMAIL_DOMAIN ?? "demo.com";
    const email = `e2e.${Date.now()}@${domain}`;
    const company = `E2E Resort ${Date.now()}`;
    const sub = `e2e${Date.now().toString(36)}`.slice(0, 20);

    await page.goto("/create-account", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder("Green Leaf Resort").fill(company);
    await page.getByPlaceholder("greenleaf").fill(sub);
    await page.getByPlaceholder("admin@company.com").fill(email);
    await page.getByPlaceholder("Min 6 characters").fill(password!);
    await page.getByPlaceholder("Repeat password").fill(password!);

    await page.getByTestId("create-account-submit").click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 120_000 });
    const { hostname, pathname } = new URL(page.url());
    expect(pathname).toBe("/admin/dashboard");
    expect(hostname.startsWith(`${sub}.`)).toBeTruthy();
  });
});
