import { expect, test } from "@playwright/test";
import path from "node:path";
import { assertPrimaryEvidenceReady, expectNoHorizontalOverflow } from "./evidence-guards";

const mobileScreenshotsDir = path.resolve(__dirname, "..", "test-results", "mobile-screenshots");

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

  for (const route of [
    "/login",
    "/register",
    "/candidate",
    "/candidate/applications",
    "/candidate/profile",
    "/candidate/offers",
    "/candidate/assessments",
    "/candidate/interview-prep",
    "/candidate/roadmap",
    "/candidate/skill-analytics",
    "/companies/portfolio-labs",
    "/employer",
    "/admin",
    "/admin/ai",
    "/platform/observability",
    "/platform/cloud",
    "/platform/releases"
  ]) {
    test(`primary route ${route} has no mobile overflow`, async ({ page }) => {
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
