import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertPrimaryEvidenceReady } from "./evidence-guards";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(currentDir, "..", "..", "docs", "screenshots");

const urls = {
  frontend: process.env.E2E_FRONTEND_URL ?? "http://localhost:3001",
  gateway: process.env.E2E_GATEWAY_URL ?? "http://localhost:8080",
  jobService:
    process.env.E2E_JOB_SERVICE_URL ??
    `http://localhost:${process.env.JOB_HOST_PORT ?? "8084"}`,
  mailpit: process.env.MAILPIT_URL ?? "http://localhost:8025"
};

async function capture(page: Page, name: string) {
  await assertPrimaryEvidenceReady(page);
  await page.screenshot({
    path: path.join(screenshotsDir, `${name}.png`),
    fullPage: true
  });
}

async function loginFrontendAsAdmin(page: Page) {
  await page.goto(`${urls.frontend}/login`);
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByRole("button", { name: /ADMIN\s+admin@devhire\.local/i }).click();
  await expect(page.getByLabel("Email")).toHaveValue("admin@devhire.local");
  await expect(page.getByLabel("Password")).toHaveValue("Admin@123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("admin-dashboard")).toBeVisible();
}

test.describe("operations portfolio screenshots", () => {
  test("capture admin operations, Mailpit, and OpenAPI runtime screens", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });

    await loginFrontendAsAdmin(page);
    await page.goto(`${urls.frontend}/admin/ai`);
    await expect(page.getByTestId("admin-ai-ops-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI Operations" })).toBeVisible();
    await capture(page, "ops-ai-provider");

    await page.goto(urls.mailpit);
    await expect(page.locator("body")).toContainText(/Mailpit|Inbox|Messages/i);
    await capture(page, "ops-mailpit");

    await page.goto(`${urls.jobService}/swagger-ui/index.html`);
    await expect(page.locator("body")).toContainText(/Swagger|OpenAPI|job/i);
    await capture(page, "ops-openapi-job-service");
  });
});
