import { expect, test, type Page } from "@playwright/test";

const accounts = {
  admin: {
    email: "admin@devhire.local",
    password: "Admin@123456",
    dashboard: "/admin",
    testId: "admin-dashboard",
    heading: "Operations Overview"
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
    await expect(page.getByRole("heading", { name: /Tìm việc IT phù hợp/i })).toBeVisible();
    await page.getByPlaceholder("Tìm Java, ReactJS, Cloud, Backend...").fill("Java");
    await expect(page.getByTestId("job-card").first()).toBeVisible();

    await page.locator("a.job-card__title").first().click();
    await expect(page.getByTestId("job-detail-page")).toBeVisible();
    await expect(page.locator(".job-detail-page__salary").first()).toContainText("/ month");
    await expect(page.getByRole("button", { name: "Ứng tuyển ngay" }).first()).toBeVisible();
    await expect(page.getByText(/Live API Gateway is unavailable/i)).toHaveCount(0);
  });

  test("company slug route resolves a company profile and scoped job board", async ({ page }) => {
    await page.goto("/companies/portfolio-labs");

    await expect(page.getByTestId("company-profile-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Portfolio Labs" })).toBeVisible();
    await expect(page.getByText("Slug-backed profile")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open jobs" })).toHaveAttribute("href", /companyId=/);
  });

  test("candidate can sign in and view the application workspace", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      const knownBrowserResourceStatus =
        /Failed to load resource: the server responded with a status of (401|404|500)/.test(text);
      const knownPreviewApiMiss = process.env.E2E_REQUIRE_LIVE_API !== "1" && text.includes("ERR_CONNECTION_REFUSED");
      if (message.type() === "error" && !knownBrowserResourceStatus && !knownPreviewApiMiss) {
        consoleErrors.push(text);
      }
    });
    await login(page, "candidate");
    await expect(page.getByRole("heading", { name: "Application tracker" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await page.goto("/candidate/profile");
    await expect(page.getByTestId("candidate-profile-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Linh Nguyen|DevHire Candidate/ })).toBeVisible();
    await expect(page.getByText(/Live profile|Read-only sample/)).toBeVisible();
    await page.goto("/candidate/assessments");
    await expect(page.getByTestId("candidate-assessments-page")).toBeVisible();
    if (process.env.E2E_REQUIRE_LIVE_API === "1") {
      await expect(page.getByTestId("candidate-assessments-page")).toHaveAttribute("data-assessment-source", "api");
    }
    await expect(page.getByRole("heading", { name: /Challenge|implementation|diagnostics/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submission history" })).toBeVisible();
    await expect(page.locator(".dh-code-editor")).toBeVisible();
    const runButton = page.getByRole("button", { name: /Run Tests|Decision Locked/ });
    if (await runButton.isEnabled()) {
      await runButton.click();
    }
    await expect(page.getByText(/Accepted|Wrong Answer|Decision Locked|local preview cases/i).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Hidden reviewer evidence|duplicate publish replay|private job leak|expected_output/i);
    const submitButton = page.getByRole("button", { name: "Submit for rubric score" });
    if (await submitButton.isEnabled()) {
      await submitButton.click();
      await expect(page.getByText(/server-side grading/i)).toBeVisible();
    } else {
      await expect(page.getByText(/Submission locked|Decision Locked|Employer decision/i).first()).toBeVisible();
    }
    expect(consoleErrors).toEqual([]);
  });

  test("employer can sign in and view company and job workflow", async ({ page }) => {
    await login(page, "employer");
    await expect(page.getByRole("heading", { name: "Company onboarding" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Job workflow" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Code assessment review" })).toBeVisible();
    await expect(page.getByLabel("Applicant pipeline job")).toBeVisible();
    await expect(page.getByLabel("Code review status")).toBeVisible();
    await expect(page.getByLabel("Code review job scope")).toBeVisible();
    await expect(page.locator(".review-card").first()).toBeVisible();
    await expect(page.locator(".review-dossier")).toBeVisible();
    await expect(page.getByText("Review safety")).toBeVisible();
    await expect(page.getByText("devhire-code-rubric-v1")).toBeVisible();
    await expect(page.getByLabel("Employer review notes")).toHaveValue(/pass, hold, or reject/i);
    await expect(page.locator(".rubric-card").first()).toBeVisible();
    await page.getByLabel("Code review status").selectOption("REVIEWED");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.locator(".review-card").first()).toBeVisible();
    await page.getByLabel("Code review status").selectOption("ALL");
    await page.getByRole("button", { name: "Apply filters" }).click();
    const resetReadyReview = page.locator(".review-card").filter({ hasText: "Ready for employer decision" }).first();
    if (await resetReadyReview.count()) {
      await resetReadyReview.getByRole("button", { name: /Pass/ }).click();
      await expect(page.getByText(/Code review recorded/i)).toBeVisible();
    }
    await expect(page.getByPlaceholder("Job ID")).toHaveCount(0);
  });

  test("admin can sign in and view review and audit consoles", async ({ page }) => {
    await login(page, "admin");
    await expect(page.getByRole("heading", { name: "Operations Overview" })).toBeVisible();
    await expect(page.getByText(/Assessment Runner|Runner Risk Rate/i).first()).toBeVisible();
    await expect(page.getByText(/Audit Events|Gateway/i).first()).toBeVisible();
    await expect(page.getByPlaceholder("Pending job ID")).toHaveCount(0);
    await expect(page.getByText("UNKNOWN")).toHaveCount(0);
    await page.goto("/admin/ai");
    await expect(page.getByRole("button", { name: "Reindex knowledge" })).toBeVisible();
  });

  test("non-admin roles cannot open Admin/Ops direct routes", async ({ page }) => {
    await login(page, "candidate");
    await page.goto("/admin");
    await expect(page.getByTestId("access-denied")).toBeVisible();
    await expect(page.getByText(/Required role/)).toBeVisible();
    await expect(page.getByText("ADMIN").first()).toBeVisible();
    await expect(page.getByTestId("admin-dashboard")).toHaveCount(0);

    await page.goto("/platform/observability");
    await expect(page.getByTestId("access-denied")).toBeVisible();
    await expect(page.getByTestId("platform-observability-page")).toHaveCount(0);

    await login(page, "employer");
    await page.goto("/admin/ai");
    await expect(page.getByTestId("access-denied")).toBeVisible();
    await expect(page.getByTestId("admin-ai-page")).toHaveCount(0);
  });
});
