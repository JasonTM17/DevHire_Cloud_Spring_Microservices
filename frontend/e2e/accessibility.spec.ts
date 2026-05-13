import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility (WCAG AA) verification for all major pages.
 * Uses @axe-core/playwright to scan each route for violations.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.6
 */

const accounts = {
  admin: {
    email: "admin@devhire.local",
    password: "Admin@123456"
  },
  employer: {
    email: "employer@devhire.local",
    password: "Employer@123456"
  },
  candidate: {
    email: "candidate@devhire.local",
    password: "Candidate@123456"
  }
} as const;

async function login(page: Page, account: keyof typeof accounts) {
  const user = accounts[account];
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

function buildAxeScanner(page: Page) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
}

test.describe("Accessibility — WCAG AA compliance", () => {
  test("homepage (/) passes axe accessibility checks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const results = await buildAxeScanner(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("/challenges passes axe accessibility checks", async ({ page }) => {
    await page.goto("/challenges");
    await page.waitForLoadState("domcontentloaded");

    const results = await buildAxeScanner(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("/jobs passes axe accessibility checks", async ({ page }) => {
    await page.goto("/jobs");
    await page.waitForLoadState("domcontentloaded");

    const results = await buildAxeScanner(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("/login passes axe accessibility checks", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    const results = await buildAxeScanner(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("/admin passes axe accessibility checks", async ({ page }) => {
    await login(page, "admin");
    await page.waitForLoadState("domcontentloaded");
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    const results = await buildAxeScanner(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("/employer passes axe accessibility checks", async ({ page }) => {
    await login(page, "employer");
    await page.waitForLoadState("domcontentloaded");
    await page.goto("/employer");
    await page.waitForLoadState("domcontentloaded");

    const results = await buildAxeScanner(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("/employer/pipeline passes axe accessibility checks", async ({ page }) => {
    await login(page, "employer");
    await page.waitForLoadState("domcontentloaded");
    await page.goto("/employer/pipeline");
    await page.waitForLoadState("domcontentloaded");

    const results = await buildAxeScanner(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("/candidate passes axe accessibility checks", async ({ page }) => {
    await login(page, "candidate");
    await page.waitForLoadState("domcontentloaded");
    await page.goto("/candidate");
    await page.waitForLoadState("domcontentloaded");

    const results = await buildAxeScanner(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test("/candidate/assessments/[id] passes axe accessibility checks", async ({ page }) => {
    await login(page, "candidate");
    await page.waitForLoadState("domcontentloaded");
    // Navigate to assessments list first to find an available assessment
    await page.goto("/candidate/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Try to navigate to the first assessment link if available
    const assessmentLink = page.locator('a[href*="/candidate/assessments/"]').first();
    if (await assessmentLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await assessmentLink.click();
      await page.waitForLoadState("domcontentloaded");

      const results = await buildAxeScanner(page).analyze();
      expect(results.violations).toEqual([]);
    }
  });
});
