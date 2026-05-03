import { expect, test, type Page } from "@playwright/test";

async function loginCandidate(page: Page) {
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByLabel("Email").fill("candidate@devhire.local");
  await page.getByLabel("Password").fill("Candidate@123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/candidate$/);
}

test.describe("Claude AI assistant", () => {
  test("candidate can ask a portfolio question and see citations plus tool traces", async ({ page }) => {
    await loginCandidate(page);
    await page.goto("/assistant");

    await expect(page.getByTestId("assistant-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Portfolio assistant for recruiters and engineering reviewers" }))
      .toBeVisible();

    await page.getByPlaceholder(/Ask about architecture/i).fill("Show the 10-minute demo path");
    await page.getByRole("button", { name: "Ask" }).click();

    const lastAnswer = page.getByTestId("assistant-message").last();
    await expect(lastAnswer).toContainText(/DevHire|microservices|demo/i, { timeout: 25_000 });
    await expect(page.getByTestId("assistant-citation").first()).toBeVisible();
    await expect(page.getByTestId("assistant-tool-trace").first()).toBeVisible();
  });
});
