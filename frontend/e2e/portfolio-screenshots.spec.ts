import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const screenshotsDir = path.resolve(__dirname, "..", "test-results", "portfolio-screenshots");

const accounts = {
  admin: {
    email: "admin@devhire.local",
    password: "Admin@123456",
    dashboard: "/admin",
    testId: "admin-dashboard"
  },
  employer: {
    email: "employer@devhire.local",
    password: "Employer@123456",
    dashboard: "/employer",
    testId: "employer-dashboard"
  },
  candidate: {
    email: "candidate@devhire.local",
    password: "Candidate@123456",
    dashboard: "/candidate",
    testId: "candidate-dashboard"
  }
} as const;

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: path.join(screenshotsDir, `${name}.png`),
    fullPage: true
  });
}

async function login(page: Page, account: keyof typeof accounts) {
  const user = accounts[account];
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByRole("button", { name: new RegExp(`${account.toUpperCase()}\\s+${user.email}`) }).click();
  await expect(page.getByLabel("Email")).toHaveValue(user.email);
  await expect(page.getByLabel("Password")).toHaveValue(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${user.dashboard}$`));
  await expect(page.getByTestId(user.testId)).toBeVisible();
}

test.describe("portfolio screenshots", () => {
  test("capture public and role dashboards", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });

    await page.goto("/jobs");
    await expect(page.getByTestId("jobs-page")).toBeVisible();
    await expect(page.getByTestId("job-card").first()).toBeVisible();
    await capture(page, "jobs-page");

    await page.getByTestId("job-card").first().click();
    await expect(page.getByTestId("job-detail-page")).toBeVisible();
    await capture(page, "job-detail");

    await login(page, "candidate");
    await capture(page, "candidate-dashboard");

    await page.goto("/assistant");
    await expect(page.getByTestId("assistant-page")).toBeVisible();
    await page.getByPlaceholder(/Ask about architecture/i).fill("Explain this microservices platform to a recruiter");
    await page.getByRole("button", { name: "Ask" }).click();
    await expect(page.getByTestId("assistant-message").last()).toContainText(/DevHire|microservices/i, { timeout: 25_000 });
    await capture(page, "assistant-page");

    await login(page, "employer");
    await capture(page, "employer-dashboard");

    await login(page, "admin");
    await capture(page, "admin-dashboard");
  });
});
