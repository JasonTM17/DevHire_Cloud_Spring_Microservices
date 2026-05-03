import { expect, test, type Page } from "@playwright/test";

const accounts = {
  admin: {
    email: "admin@devhire.local",
    password: "Admin@123456",
    dashboard: "/admin",
    testId: "admin-dashboard",
    heading: "Review console"
  },
  employer: {
    email: "employer@devhire.local",
    password: "Employer@123456",
    dashboard: "/employer",
    testId: "employer-dashboard",
    heading: "Company and pipeline"
  },
  candidate: {
    email: "candidate@devhire.local",
    password: "Candidate@123456",
    dashboard: "/candidate",
    testId: "candidate-dashboard",
    heading: "Applications"
  }
} as const;

async function login(page: Page, account: keyof typeof accounts) {
  const user = accounts[account];
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${user.dashboard}$`));
  await expect(page.getByTestId(user.testId)).toBeVisible();
  await expect(page.getByRole("heading", { name: user.heading })).toBeVisible();
}

test.describe("DevHire Cloud portfolio smoke", () => {
  test("published jobs can be searched and opened", async ({ page }) => {
    await page.goto("/jobs");

    await expect(page.getByTestId("jobs-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
    await page.getByPlaceholder("Keyword").fill("Java");
    await expect(page.getByTestId("job-card").first()).toBeVisible();

    await page.getByTestId("job-card").first().click();
    await expect(page.getByTestId("job-detail-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Apply" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit application" })).toBeVisible();
  });

  test("candidate can sign in and view the application workspace", async ({ page }) => {
    await login(page, "candidate");
    await expect(page.getByText("Application tracker")).toBeVisible();
    await expect(page.getByText("Notifications")).toBeVisible();
  });

  test("employer can sign in and view company and job workflow", async ({ page }) => {
    await login(page, "employer");
    await expect(page.getByText("Company onboarding")).toBeVisible();
    await expect(page.getByText("Job workflow")).toBeVisible();
  });

  test("admin can sign in and view review and audit consoles", async ({ page }) => {
    await login(page, "admin");
    await expect(page.getByText("Company reviews")).toBeVisible();
    await expect(page.getByText("Audit log")).toBeVisible();
  });
});
