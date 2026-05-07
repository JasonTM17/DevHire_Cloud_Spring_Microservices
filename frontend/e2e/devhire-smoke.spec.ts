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
    await expect(page.getByLabel("CV URL")).toHaveValue("");
    await expect(page.getByLabel("CV URL")).not.toHaveValue(/example\.com/);
    await expect(page.getByLabel("CV URL")).toHaveAttribute("placeholder", /storage\.devhire\.local/);
    await expect(page.getByText(/Live API Gateway is unavailable/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Submit application" })).toBeVisible();
  });

  test("company slug route resolves a company profile and scoped job board", async ({ page }) => {
    await page.goto("/companies/portfolio-labs");

    await expect(page.getByTestId("company-profile-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Portfolio Labs" })).toBeVisible();
    await expect(page.getByText("Slug-backed profile")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open jobs" })).toHaveAttribute("href", /companyId=/);
  });

  test("candidate can sign in and view the application workspace", async ({ page }) => {
    await login(page, "candidate");
    await expect(page.getByRole("heading", { name: "Application tracker" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await page.goto("/candidate/profile");
    await expect(page.getByTestId("candidate-profile-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Linh Nguyen|DevHire Candidate/ })).toBeVisible();
    await expect(page.getByText(/Live profile|Read-only sample/)).toBeVisible();
    await page.goto("/candidate/assessments");
    await expect(page.getByTestId("candidate-assessments-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Technical proof workspace" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submission history" })).toBeVisible();
    await expect(page.getByLabel("Candidate code submission")).toBeVisible();
    await page.getByRole("button", { name: "Submit for rubric score" }).click();
    await expect(page.getByText(/Rubric score ready/i)).toBeVisible();
  });

  test("employer can sign in and view company and job workflow", async ({ page }) => {
    await login(page, "employer");
    await expect(page.getByRole("heading", { name: "Company onboarding" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Job workflow" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Code assessment review" })).toBeVisible();
    await expect(page.getByLabel("Applicant pipeline job")).toBeVisible();
    await expect(page.getByLabel("Code review status")).toBeVisible();
    await expect(page.getByLabel("Code review job scope")).toBeVisible();
    const readyReview = page.locator(".review-card").filter({ hasText: "Ready for employer decision" }).first();
    await expect(readyReview).toBeVisible();
    await readyReview.getByRole("button", { name: /Advance/ }).click();
    await expect(page.getByText(/Code review recorded/i)).toBeVisible();
    await expect(page.getByPlaceholder("Job ID")).toHaveCount(0);
  });

  test("admin can sign in and view review and audit consoles", async ({ page }) => {
    await login(page, "admin");
    await expect(page.getByRole("heading", { name: "Company reviews" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Code assessment health" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI provider operations" })).toBeVisible();
    await expect(page.getByLabel("Reviewable job")).toBeVisible();
    await expect(page.getByPlaceholder("Pending job ID")).toHaveCount(0);
    await expect(page.getByText("UNKNOWN")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reindex knowledge" })).toBeVisible();
  });
});
