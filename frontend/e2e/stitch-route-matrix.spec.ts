import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { assertPrimaryEvidenceReady, expectNoHorizontalOverflow } from "./evidence-guards";

const screenshotsDir = path.resolve(__dirname, "..", "test-results", "stitch-route-matrix");

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

type StitchRoute = {
  route: string;
  name: string;
  role?: Role;
};

const stitchRoutes = [
  { route: "/jobs", name: "client-jobs" },
  { route: "/candidate", name: "candidate-dashboard", role: "candidate" },
  { route: "/candidate/applications", name: "candidate-applications", role: "candidate" },
  { route: "/candidate/profile", name: "candidate-profile", role: "candidate" },
  { route: "/candidate/assessments", name: "candidate-assessments", role: "candidate" },
  { route: "/candidate/offers", name: "candidate-offers", role: "candidate" },
  { route: "/candidate/interview-prep", name: "candidate-interview-prep", role: "candidate" },
  { route: "/candidate/roadmap", name: "candidate-roadmap", role: "candidate" },
  { route: "/candidate/skill-analytics", name: "candidate-skill-analytics", role: "candidate" },
  { route: "/community", name: "client-community" },
  { route: "/companies/portfolio-labs", name: "company-profile" },
  { route: "/employer", name: "employer-pipeline", role: "employer" },
  { route: "/admin", name: "admin-control-plane", role: "admin" },
  { route: "/admin/ai", name: "admin-ai-ops", role: "admin" },
  { route: "/assistant", name: "assistant" },
  { route: "/platform/observability", name: "platform-observability" },
  { route: "/platform/cloud", name: "platform-cloud" },
  { route: "/platform/releases", name: "platform-releases" }
] satisfies StitchRoute[];

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

test.describe("v0.6 Stitch route matrix", () => {
  for (const item of stitchRoutes) {
    test(`${item.route} is evidence-ready on desktop`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1100 });
      if (item.role) {
        await login(page, item.role);
      }
      await page.goto(item.route);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText(/Syncing|Loading/i)).toHaveCount(0, { timeout: 10_000 });
      await assertPrimaryEvidenceReady(page);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: path.join(screenshotsDir, `${item.name}.png`), fullPage: true });
    });
  }

  test("job detail is evidence-ready on desktop with a live published job", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/jobs");
    await expect(page.getByTestId("jobs-page")).toBeVisible();
    await expect(page.getByTestId("job-card").first()).toBeVisible();
    await page.getByTestId("job-card").first().click();
    await expect(page.getByTestId("job-detail-page")).toBeVisible();
    await expect(page.getByText(/Syncing|Loading/i)).toHaveCount(0, { timeout: 10_000 });
    await assertPrimaryEvidenceReady(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(screenshotsDir, "client-job-detail.png"), fullPage: true });
  });
});
