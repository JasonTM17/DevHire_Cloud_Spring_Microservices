import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const screenshotsDir = path.resolve(__dirname, "..", "..", "docs", "screenshots");

const urls = {
  frontend: process.env.E2E_FRONTEND_URL ?? "http://localhost:3001",
  gateway: process.env.E2E_GATEWAY_URL ?? "http://localhost:8080",
  mailpit: process.env.MAILPIT_URL ?? "http://localhost:8025",
  grafana: process.env.GRAFANA_URL ?? "http://localhost:3000",
  prometheus: process.env.PROMETHEUS_URL ?? "http://localhost:9090"
};

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: path.join(screenshotsDir, `${name}.png`),
    fullPage: true
  });
}

async function loginFrontendAsAdmin(page: Page) {
  await page.goto(`${urls.frontend}/login`);
  await page.getByLabel("Email").fill("admin@devhire.local");
  await page.getByLabel("Password").fill("Admin@123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("admin-dashboard")).toBeVisible();
}

async function loginGrafanaIfNeeded(page: Page) {
  const apiLogin = await page.request
    .post(`${urls.grafana}/login`, {
      data: { user: "admin", password: "admin" }
    })
    .catch(() => null);

  if (apiLogin?.ok()) {
    return;
  }

  const userInput = page
    .locator('input[name="user"], input[aria-label*="username" i], input[aria-label*="email" i]')
    .first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

  if (await userInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await userInput.fill("admin");
    await passwordInput.fill("admin");
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState("networkidle").catch(() => undefined);
  }

  const skipButton = page.getByRole("button", { name: /skip/i });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
  }
}

test.describe("operations portfolio screenshots", () => {
  test("capture admin operations, Mailpit, OpenAPI, Prometheus, and Grafana", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });

    await loginFrontendAsAdmin(page);
    await expect(page.getByText("AI provider operations")).toBeVisible();
    await capture(page, "ops-ai-provider");

    await page.goto(urls.mailpit);
    await expect(page.locator("body")).toContainText(/Mailpit|Inbox|Messages/i);
    await capture(page, "ops-mailpit");

    await page.goto(`${urls.gateway.replace(":8080", ":8084")}/swagger-ui/index.html`);
    await expect(page.locator("body")).toContainText(/Swagger|OpenAPI|job/i);
    await capture(page, "ops-openapi-job-service");

    await page.goto(`${urls.prometheus}/rules`);
    await expect(page.locator("body")).toContainText(/devhire|slo|alert/i);
    await capture(page, "ops-prometheus-rules");

    await page.goto(`${urls.grafana}/d/devhire-slo-overview/devhire-cloud-slo-overview?orgId=1&from=now-15m&to=now`);
    await loginGrafanaIfNeeded(page);
    await page.goto(`${urls.grafana}/d/devhire-slo-overview/devhire-cloud-slo-overview?orgId=1&from=now-15m&to=now`);
    await expect(page.locator("body")).toContainText(/DevHire Cloud SLO Overview|Gateway Availability/i);
    await capture(page, "ops-grafana-slo");
  });
});
