import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { assertPrimaryEvidenceReady, expectNoHorizontalOverflow } from "./evidence-guards";

const mobileScreenshotsDir = path.resolve(__dirname, "..", "test-results", "mobile-screenshots");
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

type Role = keyof typeof accounts;

const mobileRoutes: { route: string; role?: Role }[] = [
  { route: "/login" },
  { route: "/register" },
  { route: "/candidate", role: "candidate" },
  { route: "/candidate/applications", role: "candidate" },
  { route: "/candidate/profile", role: "candidate" },
  { route: "/candidate/offers", role: "candidate" },
  { route: "/candidate/assessments", role: "candidate" },
  { route: "/candidate/interview-prep", role: "candidate" },
  { route: "/candidate/roadmap", role: "candidate" },
  { route: "/candidate/skill-analytics", role: "candidate" },
  { route: "/companies/portfolio-labs" },
  { route: "/employer", role: "employer" },
  { route: "/admin", role: "admin" },
  { route: "/admin/ai", role: "admin" },
  { route: "/platform/observability", role: "admin" },
  { route: "/platform/cloud", role: "admin" },
  { route: "/platform/releases", role: "admin" }
];

async function login(page: Page, role: Role) {
  const user = accounts[role];
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${user.dashboard}$`));
  await expect(page.getByTestId(user.testId)).toBeVisible();
}

test.describe("Mobile recruiter demo smoke", () => {
  test("jobs workspace remains usable on a phone viewport", async ({ page }) => {
    await page.goto("/jobs");

    await expect(page.getByTestId("jobs-page")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
    await expect(page.getByPlaceholder("Keyword")).toBeVisible();
    await expect(page.getByTestId("job-grid")).toBeVisible();
    await expect(page.getByLabel("Global job search")).toBeVisible();
    await assertPrimaryEvidenceReady(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(mobileScreenshotsDir, "jobs-mobile.png"), fullPage: true });
  });

  test("assistant workspace shows safety and citation affordances on mobile", async ({ page }) => {
    await page.goto("/assistant");

    await expect(page.getByTestId("assistant-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Portfolio assistant for recruiters and engineering reviewers" }))
      .toBeVisible();
    await expect(page.getByText("Safety guard")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ask" })).toBeVisible();
    await assertPrimaryEvidenceReady(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(mobileScreenshotsDir, "assistant-mobile.png"), fullPage: true });
  });

  test("candidate code studio remains usable and redacted on mobile", async ({ page }) => {
    await login(page, "candidate");
    await page.goto("/candidate/assessments");

    await expect(page.getByTestId("candidate-assessments-page")).toBeVisible();
    await expect(page.getByRole("tab", { name: /CandidateSolution\.java|solution\.sql|solution\.ts/ }).first()).toBeVisible();
    await expect(page.getByLabel("Candidate code submission")).toBeVisible();
    await expect(page.getByLabel("Custom stdin")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submission history" })).toBeVisible();
    await expect(page.getByText(/hidden results redacted|Hidden tests server-side/i).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/expected_output|hidden reviewer evidence|private job leak/i);
    await assertPrimaryEvidenceReady(page);
    await expectNoHorizontalOverflow(page);
  });

  for (const { route, role } of mobileRoutes) {
    test(`primary route ${route} has no mobile overflow`, async ({ page }) => {
      if (role) {
        await login(page, role);
      }
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText(/Syncing|Loading/i)).toHaveCount(0, { timeout: 10_000 });
      await assertPrimaryEvidenceReady(page);
      await expectNoHorizontalOverflow(page);
    });
  }

  test("job detail route has no mobile overflow after opening a published role", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByTestId("job-card").first()).toBeVisible();
    await page.getByTestId("job-card").first().click();
    await expect(page.getByTestId("job-detail-page")).toBeVisible();
    await expect(page.getByText(/Syncing|Loading/i)).toHaveCount(0, { timeout: 10_000 });
    await assertPrimaryEvidenceReady(page);
    await expectNoHorizontalOverflow(page);
  });
});
