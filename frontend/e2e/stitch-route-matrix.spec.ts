import { expect, test } from "@playwright/test";
import path from "node:path";
import { assertPrimaryEvidenceReady, expectNoHorizontalOverflow } from "./evidence-guards";

const screenshotsDir = path.resolve(__dirname, "..", "test-results", "stitch-route-matrix");

const stitchRoutes = [
  { route: "/jobs", name: "client-jobs" },
  { route: "/jobs/preview-ai-platform", name: "client-job-detail" },
  { route: "/candidate", name: "candidate-dashboard" },
  { route: "/candidate/applications", name: "candidate-applications" },
  { route: "/candidate/profile", name: "candidate-profile" },
  { route: "/candidate/assessments", name: "candidate-assessments" },
  { route: "/candidate/offers", name: "candidate-offers" },
  { route: "/candidate/interview-prep", name: "candidate-interview-prep" },
  { route: "/candidate/roadmap", name: "candidate-roadmap" },
  { route: "/candidate/skill-analytics", name: "candidate-skill-analytics" },
  { route: "/community", name: "client-community" },
  { route: "/companies/portfolio-labs", name: "company-profile" },
  { route: "/employer", name: "employer-pipeline" },
  { route: "/admin", name: "admin-control-plane" },
  { route: "/admin/ai", name: "admin-ai-ops" },
  { route: "/assistant", name: "assistant" },
  { route: "/platform/observability", name: "platform-observability" },
  { route: "/platform/cloud", name: "platform-cloud" },
  { route: "/platform/releases", name: "platform-releases" }
];

test.describe("v0.6 Stitch route matrix", () => {
  for (const item of stitchRoutes) {
    test(`${item.route} is evidence-ready on desktop`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.goto(item.route);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText(/Syncing|Loading/i)).toHaveCount(0, { timeout: 10_000 });
      await assertPrimaryEvidenceReady(page);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: path.join(screenshotsDir, `${item.name}.png`), fullPage: true });
    });
  }
});
